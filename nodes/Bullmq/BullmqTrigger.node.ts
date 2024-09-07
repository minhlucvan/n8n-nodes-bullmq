import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { createWorker, setupRedisClient, redisConnectionTest } from './utils';
import { DelayedError, Job } from 'bullmq';

type RespondType = 'immediate' | 'useRespondNode';

interface Options {
	onlyData: boolean;
	respondType: RespondType;
}

export class BullmqTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bullmq Trigger',
		name: 'bullmqTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:bullmq.png',
		group: ['trigger'],
		version: 1,
		description: 'Register new workers for Bullmq',
		defaults: {
			name: 'Bullmq Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 'redis',
				required: true,
				testedBy: 'redisConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Queue Name',
				name: 'queueName',
				type: 'string',
				default: '',
				required: true,
				description: 'The name of the queue to listen to',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Respond Type',
						name: 'respondType',
						type: 'options',
						default: 'immediate',
						options: [
							{
								name: 'Immediate',
								value: 'immediate',
							},
							{
								name: 'Delayed',
								value: 'delayed',
							},
						],
					},
					{
						displayName: 'Only Data',
						name: 'onlyData',
						type: 'boolean',
						default: true,
						description: 'Whether to only return the data of the job',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: { redisConnectionTest },
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('redis');

		const queueName = this.getNodeParameter('queueName') as string;
		const options = this.getNodeParameter('options') as Options;
		const respondType = options.respondType;

		if (!queueName) {
			throw new NodeOperationError(this.getNode(), 'Queue Name must be set');
		}

		const onJob = async (job: Job, token?: string) => {
			const payload = options.onlyData ? { data: job.data } : job.toJSON();

			// check that job is being updated
			// when data.step is set to 'waiting', we skip the job to wait for the next trigger
			if (job?.data?.step === 'waiting') {
				// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
				throw new DelayedError('Job is waiting');
			}

			// add token to payload
			const payloadWithToken = { ...payload, lockToken: token };

			if (respondType === 'immediate') {
				return {
					respondType: 'immediate',
				};
			}

			if (token === undefined) {
				throw new NodeOperationError(this.getNode(), 'Token is missing');
			}

			// extend lock to prevent job from being picked up by by another/node
			// noormaly this would be done in the respond node
			await job.extendLock(token, 60000);

			this.emit([this.helpers.returnJsonArray(payloadWithToken)]);

			// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
			throw new DelayedError('Job was triggered');
		};

		const connection = setupRedisClient(credentials);
		let worker: any;

		const manualTriggerFunction = async () => {
			worker = createWorker(
				queueName,
				async (job: Job, token?: string) => {
					worker.close();
					return onJob(job, token);
				},
				{ lockDuration: 60000, connection, autorun: false },
			);

			worker.run();
		};

		if (this.getMode() === 'trigger') {
			worker = createWorker(queueName, onJob as any, {
				lockDuration: 60000,
				connection,
				autorun: false,
			});
			worker.run();
		}

		async function closeFunction() {
			if (worker) {
				await worker.close();
			}
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}

import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { createWorker, setupRedisClient, redisConnectionTest } from './utils';
import { DelayedError, Job, WorkerOptions } from 'bullmq';

type RespondType = 'immediate' | 'useRespondNode';

type WorkerOptionsExposed = Pick<
	WorkerOptions,
	'lockDuration' | 'concurrency' | 'runRetryDelay'
>;

type Options = WorkerOptionsExposed & {
	onlyData: boolean;
	respondType: RespondType;
};

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
						displayName: 'Lock Duration',
						name: 'lockDuration',
						type: 'number',
						default: 60000,
						description: 'The duration in milliseconds for which the lock should be held',
					},
					{
						displayName: 'Concurrency',
						name: 'concurrency',
						type: 'number',
						default: 1,
						description: 'The number of jobs that can be processed concurrently',
					},
					{
						displayName: 'Run Retry Delay',
						name: 'runRetryDelay',
						type: 'number',
						default: 5000,
						description: 'The duration in milliseconds to wait before retrying a job',
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

		const {
			respondType,
			lockDuration = 60000,
			concurrency = 1,
			onlyData = false,
			runRetryDelay = 0,
		} = options;

		if (!queueName) {
			throw new NodeOperationError(this.getNode(), 'Queue Name must be set');
		}

		const onJob = async (job: Job, token?: string) => {
			const payload = onlyData ? { data: job.data } : job.toJSON();

			// check that job is being updated
			// when data.step is set to 'waiting', we skip the job to wait for the next trigger
			if (job?.data?.step === 'waiting') {
				// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
				throw new DelayedError('Job is waiting');
			}

			job.log(`Job received, executionId ${this.getExecutionId()}`);

			// add token to payload
			const payloadWithToken = { ...payload, lockToken: token };

			if (respondType === 'immediate') {
				return {
					respondType: 'immediate',
				};
			}

			// respondType === 'delayed'

			if (token === undefined) {
				throw new NodeOperationError(this.getNode(), 'Token is missing');
			}

			// extend lock to prevent job from being picked up by by another/node
			// noormaly this would be done in the respond node
			await job.extendLock(token, lockDuration);

			job.log(`Lock extended for ${lockDuration}ms`);

			this.emit([this.helpers.returnJsonArray(payloadWithToken)]);

			// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
			throw new DelayedError('Job was triggered');
		};

		const connection = setupRedisClient(credentials);

		const workerName = this.getWorkflow().name;

		let worker: any;

		const manualTriggerFunction = async () => {
			worker = createWorker(
				queueName,
				async (job: Job, token?: string) => {
					worker.close();
					return onJob(job, token);
				},
				{
					lockDuration: 60000,
					connection,
					autorun: false,
					name: workerName,
					concurrency: 1,
				},
			);

			worker.run();
		};

		if (this.getMode() === 'trigger') {
			worker = createWorker(queueName, onJob as any, {
				lockDuration,
				connection,
				autorun: false,
				name: workerName,
				concurrency,
				runRetryDelay,
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

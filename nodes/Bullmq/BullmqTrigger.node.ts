import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	IDeferredPromise,
} from 'n8n-workflow';
import { IRun, NodeOperationError } from 'n8n-workflow';

import { createWorker, setupRedisClient, extractNodeExecutionResultData } from './utils';
import { DelayedError, Job, Worker, WorkerOptions } from 'bullmq';
import { redisConnectionTest } from './GenericFuntions';

type RespondType = 'immediate' | 'useRespondNode' | 'useLastNode';

type WorkerOptionsExposed = Pick<WorkerOptions, 'lockDuration' | 'concurrency' | 'runRetryDelay'>;

type Options = WorkerOptionsExposed & {
	onlyData: boolean;
	respondType: RespondType;
};

export class BullmqTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'BullMQ Trigger',
		name: 'bullmqTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:bullmq.svg',
		group: ['trigger'],
		version: 1,
		description: 'Register new workers for Bullmq',
		defaults: {
			name: 'BullMQ Trigger',
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
				displayName: "Queue Source",
				name: "queueSource",
				type: "options",
				options: [
					{
						name: "Workflows",
						value: "workflows",
					},
					{
						name: "Custom",
						value: "custom",
					},
				],
				default: "workflows",
			},
			{
				displayName: 'Queue Name',
				name: 'queueName',
				type: 'string',
				default: '',
				required: true,
				description: 'Queue name to add the job to',
				displayOptions: {
					show: {
						queueSource: [
							"custom"
						]
					},
				},
			},
			{
				displayName: 'Job Name',
				name: 'jobName',
				type: 'string',
				default: '',
				required: true,
				description: 'Job name to publish',
			},
			{
				displayName: 'Respond Type',
				name: 'respondType',
				type: 'options',
				default: 'useLastNode',
				options: [
					{
						name: 'Use Last Node',
						value: 'useLastNode',
					},
					{
						name: 'Immediate',
						value: 'immediate',
					},
					{
						name: 'Use Respond Node',
						value: 'useRespondNode',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
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

		const workflowId = this.getWorkflow().id;

		const queueNameParam = this.getNodeParameter('queueName', '') as string;
		const respondType = this.getNodeParameter('respondType') as RespondType;
		const options = this.getNodeParameter('options') as Options;

		const { lockDuration = 60000, concurrency = 1, onlyData = false, runRetryDelay = 0 } = options;

		const queueName = queueNameParam || workflowId;

		if (!queueName) {
			throw new NodeOperationError(this.getNode(), 'Queue Name must be set');
		}

		// @ts-ignore
		const processJob = async (
			job: Job,
			token?: string | null,
			donePromise?: IDeferredPromise<IRun>,
		) => {
			const payload = onlyData ? { data: job.data } : job.toJSON();

			// check that job is being updated
			// when data.step is set to 'waiting', we skip the job to wait for the next trigger
			if (job?.data?.step === 'waiting') {
				// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
				throw new DelayedError('Job is waiting');
			}

			job.log(`Job received, executionId ${this.getExecutionId()}, responding type ${respondType}`);

			// add token to payload
			const payloadWithToken = { ...payload, lockToken: token };

			if (respondType === 'immediate') {
				return {
					respondType: 'immediate',
				};
			}

			// respondType === 'delayed'

			if (!token) {
				throw new NodeOperationError(this.getNode(), 'Token is missing');
			}

			const dataItems = this.helpers.returnJsonArray(payloadWithToken);

			this.emit([dataItems], undefined, donePromise);
		};

		const connection = setupRedisClient(credentials);

		const workerName = this.getWorkflow().name;

		let worker: Worker;

		const manualTriggerFunction = () => {
			return new Promise<void>((resolve) => {
				worker = createWorker(
					queueName,
					async (job: Job, token?: string) => {
						processJob(job, token);
						resolve();
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
			});
		};

		if (this.getMode() === 'trigger') {
			worker = createWorker(
				queueName,
				// @ts-ignore
				async (job: Job, token: ?string) => {
					const donePromise =
						respondType === 'useLastNode'
							? await this.helpers.createDeferredPromise<IRun>()
							: undefined;

					await processJob(job, token, donePromise);

					if (respondType === 'immediate') {
						return {
							respondType: 'immediate',
							executionId: this.getExecutionId(),
						};
					}

					// token is required for 'useRespondNode' and 'useLastNode'
					if (!token) {
						throw new NodeOperationError(this.getNode(), 'Token is missing');
					}

					if (respondType === 'useRespondNode') {
						// if respondType is 'useRespondNode' we extend the lock
						// so the job can be processed by the respond node
						await job.extendLock(token, lockDuration);

						// @ts-ignore
						console.log('Job is deleted and being released from the response node');

						// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
						throw new DelayedError('Job was triggered');
					}

					// default to useLastNode

					if (!donePromise) {
						throw new NodeOperationError(this.getNode(), 'Done promise is missing');
					}

					const result = await donePromise.promise();

					// parse error
					const lastNodeResult = result.data.resultData;
					const executionStatus = result.status;

					job.log(
						`Job is about to be released, executionId ${this.getExecutionId()}, status ${executionStatus}`,
					);

					if (lastNodeResult.error) {
						const lastNodeError = lastNodeResult.error;
						throw new NodeOperationError(this.getNode(), lastNodeError);
					}

					const lastNodeExecuted = lastNodeResult.lastNodeExecuted;

					if (!lastNodeExecuted) {
						throw new NodeOperationError(this.getNode(), 'Last node executed is missing');
					}

					const lastNodeExecutionResult = lastNodeResult.runData[lastNodeExecuted];

					if (!lastNodeExecutionResult) {
						throw new NodeOperationError(this.getNode(), 'Last node execution data is missing');
					}

					const lastNodeExecutionResultData =
						extractNodeExecutionResultData(lastNodeExecutionResult);

					// move job to completed
					// by returning the data from the last node
					return lastNodeExecutionResultData;
				},
				{
					lockDuration,
					connection,
					autorun: false,
					name: workerName,
					concurrency,
					runRetryDelay,
				},
			);
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

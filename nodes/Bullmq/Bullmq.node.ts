import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { setupRedisClient, parseAssignmentsCollection, craftJobReturnValue, parseJson } from './utils';
import { DefaultJobOptions, QueueEvents } from 'bullmq';
import { getQueue, getWorkflowInfo, redisConnectionTest } from './GenericFuntions';

type IDataObject = { [key: string]: any };

type IAddOptions = {
	delay: DefaultJobOptions['delay'];
	priority: DefaultJobOptions['priority'];
	attempts: DefaultJobOptions['attempts'];
	backoff: DefaultJobOptions['backoff'];
	lifo: DefaultJobOptions['lifo'];
	removeOnComplete: DefaultJobOptions['removeOnComplete'];
	removeOnFail: DefaultJobOptions['removeOnFail'];
	timeToLive: number;
	returnValue: boolean;
};

type INodeParameters = {
	operation: string;
	queueName: string;
	jobName: string;
	jobData: IDataObject;
	waitUntilFinished: boolean;
	queueSource: 'workflows' | 'custom';
	dataSource: 'previousNode' | 'input';
	options: IAddOptions;
};
export class Bullmq implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'BullMQ',
		name: 'bullmq',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:bullmq.svg',
		group: ['input'],
		version: 1,
		description: 'Get, send and update data in Redis',
		defaults: {
			name: 'BullMQ',
		},
		inputs: ['main'],
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Add',
						value: 'add',
						description: 'Add a job to a queue',
						action: 'Add a job',
					},
				],
				default: 'add',
			},
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
				displayOptions: {
					show: {
						operation: ["add"],
					},
				},
			},
			{
				displayName: 'Queue Name',
				name: 'queueName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['add'],
						queueSource: ['custom'],
					},
				},
				default: '',
				required: true,
				description: 'Queue name to add the job to',
			},
			{
				displayName: "Workflow",
				name: "workflowId",
				// @ts-ignore
				type: "workflowSelector",
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ["add"],
						queueSource: ["workflows"],
					},
				},
			},
			{
				displayName: 'Job Name',
				name: 'jobName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['add'],
					},
				},
				default: '',
				required: true,
				description: 'Job name to publish',
			},
			// allow ủe to choose get data from previous node or self input
			{
				displayName: 'Data Source',
				name: 'dataSource',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['add'],
					},
				},
				options: [
					{
						name: 'Previous Node',
						value: 'previousNode',
						description: 'Get data from previous node',
					},
					{
						name: 'Input',
						value: 'input',
						description: 'Use data from the input',
					},
				],
				default: 'previousNode',
			},
			// If the data source is previous node, we will not show the jobData fields array
			{
				displayName: 'Job Data',
				name: 'jobData',
				type: 'assignmentCollection',
				displayOptions: {
					show: {
						operation: ['add'],
						dataSource: ['input'],
					},
				},
				default: {},
			},
			{
				displayName: 'Wait Until Finished',
				name: 'waitUntilFinished',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['add'],
					},
				},
				default: false,
				description: 'Whether to wait until the job is finished, Don\'t use this option for long running jobs',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				displayOptions: {
					show: {
						operation: ['add'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'timeToLive',
						name: 'timeToLive',
						type: 'number',
						default: 0,
						description: 'Time in milliseconds before the job should be failed',
					},
					{
						displayName: 'Retunrn Value',
						name: 'returnValue',
						type: 'boolean',
						default: false,
						description: 'Whether to return the value of the job',
					},
					{
						displayName: 'Delay',
						name: 'delay',
						type: 'number',
						default: 0,
						description: 'Delay in milliseconds before the job should be processed',
					},
					{
						displayName: 'Priority',
						name: 'priority',
						type: 'number',
						default: 0,
						description: 'Priority of the jobb, from 1 to any, higher is higher priority',
					},
					{
						displayName: 'Attempts',
						name: 'attempts',
						type: 'number',
						default: 0,
						description: 'Number of attempts to run the job',
					},
					{
						displayName: 'Backoff',
						name: 'backoff',
						type: 'number',
						default: 0,
						description: 'Backoff time in milliseconds',
					},
					{
						displayName: 'Lifo',
						name: 'lifo',
						type: 'boolean',
						default: false,
						description: 'Whether to process the job in LIFO order, otherwise FIFO',
					},
					{
						displayName: 'Remove On Complete',
						name: 'removeOnComplete',
						type: 'boolean',
						default: false,
						description: 'Whether to remove the job from the queue when it is completed',
					},
					{
						displayName: 'Remove On Fail',
						name: 'removeOnFail',
						type: 'boolean',
						default: false,
						description: 'Whether to remove the job from the queue when it fails',
					}
				]
			},

		],
	};

	methods = {
		credentialTest: { redisConnectionTest },
	};

	async execute(this: IExecuteFunctions) {
		// TODO: For array and object fields it should not have a "value" field it should
		//       have a parameter field for a path. Because it is not possible to set
		//       array, object via parameter directly (should maybe be possible?!?!)
		//       Should maybe have a parameter which is JSON.
		const credentials = await this.getCredentials('redis');

		const source = this.getNodeParameter('queueSource', 0, '') as INodeParameters['queueSource'];

		const connection = setupRedisClient(credentials);

		const operation = this.getNodeParameter('operation', 0) as INodeParameters['operation'];
		const returnItems: INodeExecutionData[] = [];

		const items = this.getInputData();

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const inputItem = items[itemIndex];
			const item: INodeExecutionData = { json: {}, pairedItem: { item: itemIndex } };

			try {
				if (operation === 'add') {

					const workflowInfo = await getWorkflowInfo.call(this, source, itemIndex);

					if (!workflowInfo.id) {
						throw new NodeOperationError(
							this.getNode(),
							`The workflow did not return an id!`,
						);
					}

					const queueName = workflowInfo.id;

					const jobName = this.getNodeParameter('jobName', itemIndex) as INodeParameters['jobName'];
					const dataSource = this.getNodeParameter('dataSource', itemIndex) as INodeParameters['dataSource'];
					const messageData = this.getNodeParameter('jobData', itemIndex, {}) as INodeParameters['jobData'];

					const options = this.getNodeParameter('options', itemIndex) as IAddOptions;

					const {
						timeToLive,
						delay = 0,
						priority = 1,
						attempts = 1,
						backoff = 0,
						lifo = false,
						removeOnComplete = false,
						removeOnFail = false,
						returnValue = false,
					} = options;

					const queue = await getQueue.call(this, queueName, { connection });

					const cleanup = async () => {
						try {
							queue.close();
							queue.disconnect();
						} catch (error) {
							// @ts-ignore
							console.log(error);
						}
					}

					const jsonPayload = dataSource === 'previousNode' ?
						parseJson(inputItem.json as any, {}) :
						parseAssignmentsCollection(messageData as any, {});

					const job = await queue.add(jobName, jsonPayload, {
						delay,
						priority,
						attempts,
						backoff,
						lifo,
						removeOnComplete,
						removeOnFail,
					});

					job.log(`Job added from executionId ${this.getExecutionId()}`);

					// If the option to wait until the job is finished is set wait for it
					const waitUntilFinished = this.getNodeParameter(
						'waitUntilFinished',
						itemIndex,
					) as boolean;

					if (waitUntilFinished) {
						const queueEvents = new QueueEvents(queueName, { connection });

						const cleanupQueueEvents = async () => {
							try {
								queueEvents.close();
								queueEvents.disconnect();
							} catch (error) {
								// @ts-ignore
								console.log(error);
							}
						}

						await job.waitUntilFinished(queueEvents, +timeToLive);

						if (!job.id) {
							cleanupQueueEvents();
							cleanup();
							throw new NodeOperationError(
								this.getNode(),
								`The job did not return an id!`,
							);
						}

						const updatedJob = await queue.getJob(job.id);

						if (updatedJob) {
							item.json = updatedJob.toJSON();
						} else {
							item.json = job.toJSON();
						}

						if (returnValue) {
							item.json = craftJobReturnValue(item.json.returnvalue);
						}

						items[itemIndex] = item;
						returnItems.push(items[itemIndex]);

						cleanupQueueEvents();
					} else {
						item.json = job.toJSON();
						items[itemIndex] = item;
						returnItems.push(items[itemIndex]);
					}

					cleanup();
				} else {
					throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`, { itemIndex });
				};

			} catch (error) {
				if (this.continueOnFail()) {
					items[itemIndex] = {
						json: inputItem.json,
						error,
						pairedItem: { item: itemIndex },
					};
					returnItems.push(items[itemIndex]);
				} else {
					throw new NodeOperationError(this.getNode(), `The operation "${error.message}" is not supported!`, { itemIndex });
				}
			}

		}

		return [returnItems];
	}
}

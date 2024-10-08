import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	parseAssignmentsCollection,
	parseJson,
	setupRedisClient,
} from './utils';
import { getQueue, redisConnectionTest } from './GenericFuntions';

export class BullmqRespond implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'BullMQ Respond',
		name: 'bullmqRespond',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:bullmq.svg',
		group: ['output'],
		version: 1,
		description: 'Respond to Bullmq jobs',
		defaults: {
			name: 'BullMQ Respond',
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
						name: 'Respond',
						value: 'respond',
						description: 'Respond to a job',
						action: 'Respond to a job',
					},
				],
				default: 'respond',
			},

			// ----------------------------------
			//         Respond
			// ----------------------------------
			// allow ủe to choose get data from previous node or self input
			{
				displayName: 'Data Source',
				name: 'dataSource',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['respond'],
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
						operation: ['respond'],
						dataSource: ['input'],
					},
				},
				default: {},
			},
			// Job information
			{
				displayName: "Use Current Job's Data",
				name: 'useCurrentJobData',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['respond'],
					},
				},
				default: true,
				description:
					'Whether to use the current job data to respond to the job. If set to false, the data from the input will be used.',
			},
			{
				displayName: 'Queue Name',
				name: 'queueName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['respond'],
						useCurrentJobData: [false],
					},
				},
				default: '',
				required: true,
				description: 'Queue name to add the job to',
			},
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['respond'],
						useCurrentJobData: [false],
					},
				},
				default: '',
				required: true,
				description: 'Job ID to respond to',
			},
			{
				displayName: 'Lock Token',
				name: 'lockToken',
				// eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
				type: 'string',
				displayOptions: {
					show: {
						operation: ['respond'],
						useCurrentJobData: [false],
					},
				},
				default: '',
				description:
					'Lock token of the job, if the job is locked then get the lock from Bullmq Trigger node',
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

		const connection = setupRedisClient(credentials);

		const operation = this.getNodeParameter('operation', 0);

		const returnItems: INodeExecutionData[] = [];

		try {
			if (['respond'].includes(operation)) {
				const items = this.getInputData();

				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					const item: INodeExecutionData = { json: {}, pairedItem: { item: itemIndex } };

					switch (operation) {
						case 'respond':
							const data = this.getNodeParameter('jobData', itemIndex, {}) as IDataObject;

							const dataSource = this.getNodeParameter(
								'dataSource',
								itemIndex,
								'previousNode',
							) as string;

							const { queueName, jobId, lockToken } = await getJobInfo.call(this, itemIndex);

							if (!queueName || !jobId || !lockToken) {
								throw new NodeOperationError(
									this.getNode(),
									'Queue Name, Job ID and Lock Token must be provided!',
								);
							}

							const queue = await getQueue.call(this, queueName, { connection });

							const cleanup = async () => {
								queue.close();
								queue.disconnect();
							}

							const job = await queue.getJob(jobId);

							if (!job) {
								cleanup();
								throw new NodeOperationError(
									this.getNode(),
									`Job with ID "${jobId}" does not exist!`,
								);
							}

							job.log(`Job is about to be responded from executionId ${this.getExecutionId()}`);

							const jobData =
								dataSource === 'input'
									? parseAssignmentsCollection(data as any, {})
									: parseJson(items[itemIndex].json as any, {});

							await job.moveToCompleted(jobData, lockToken);

							item.json = job.toJSON();

							items[itemIndex] = item;

							returnItems.push(items[itemIndex]);

							cleanup();
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`The operation "${operation}" is not supported!`,
							);
					}
				}
			}
		} catch (error) {
			throw error;
		}

		return [returnItems];
	}
}


function 	getJobInfo(this: IExecuteFunctions, itemIndex: number) {
	const useCurrentJobData = this.getNodeParameter('useCurrentJobData', itemIndex, true) as boolean;

	if (useCurrentJobData) {
		throw new NodeOperationError(
			this.getNode(),
			'Using current job data is not yet supported. Please disable "Use Current Job Data" option.',
		);
	}

	const queueName = this.getNodeParameter('queueName', itemIndex, '') as string;
	const jobId = this.getNodeParameter('jobId', itemIndex, '') as string;
	const lockToken = this.getNodeParameter('lockToken', itemIndex, '') as string;

	return { queueName, jobId, lockToken };
}

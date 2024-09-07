import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	getQueue,
	redisConnectionTest,
	setupRedisClient,
} from './utils';

export class BullmqRespond implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bullmq Respond',
		name: 'bullmqRespond',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:bullmq.png',
		group: ['output'],
		version: 1,
		description: 'Respond to Bullmq jobs',
		defaults: {
			name: 'Bullmq Respond',
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
			{
				displayName: 'Queue Name',
				name: 'queueName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['respond'],
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
					},
				},
				default: '',
				description: 'Lock token of the job, if the job is locked then get the lock from Bullmq Trigger node',
			},
			{
				displayName: 'Data',
				name: 'data',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['respond'],
					},
				},
				default: '',
				description: 'Data to respond with',
			}
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
			 if (
				['respond'].includes(operation)
			) {
				const items = this.getInputData();

				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					const item: INodeExecutionData = { json: {}, pairedItem: { item: itemIndex } };

					switch (operation) {
						case 'respond':
							const queueName = this.getNodeParameter('queueName', itemIndex) as string;
							const jobId = this.getNodeParameter('jobId', itemIndex) as string;
							const lockToken = this.getNodeParameter('lockToken', itemIndex) as string;

							const queue = await getQueue.call(this, queueName, { connection });
							const data = this.getNodeParameter('data', itemIndex) as IDataObject;

							const job = await queue.getJob(jobId);

							if (!job) {
								throw new NodeOperationError(this.getNode(), `Job with ID "${jobId}" does not exist!`);
							}

							await job.moveToCompleted(data, lockToken);

							item.json = job.toJSON();

							items[itemIndex] = item;

							returnItems.push(items[itemIndex]);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
					}
				}
			}
		} catch (error) {
			throw error;
		}

		return [returnItems];
	}
}

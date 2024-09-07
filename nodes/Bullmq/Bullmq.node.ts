import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	setupRedisClient,
	redisConnectionTest,
	getQueue,
} from './utils';

type IDataObject = { [key: string]: any };

export class Bullmq implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bullmq',
		name: 'bullmq',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:bullmq.png',
		group: ['input'],
		version: 1,
		description: 'Get, send and update data in Redis',
		defaults: {
			name: 'Redis',
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



			// ----------------------------------
			//         Add
			// ----------------------------------
			{
				displayName: 'Queue Name',
				name: 'queueName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['add'],
					},
				},
				default: '',
				required: true,
				description: 'Queue name to add the job to',
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
			{
				displayName: 'Data',
				name: 'jobData',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['add'],
					},
				},
				default: '',
				required: true,
				description: 'Job data to add',
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
			if (
				['add'].includes(operation)
			) {
				const items = this.getInputData();

				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					const item: INodeExecutionData = { json: {}, pairedItem: { item: itemIndex } };

					if (operation === 'add') {
						const queueName = this.getNodeParameter('queueName', itemIndex) as string;

						const jobName = this.getNodeParameter('jobName', itemIndex) as string;
						const messageData = this.getNodeParameter('jobData', itemIndex) as IDataObject;

						const queue = await getQueue.call(this, queueName, { connection });

						const job = await queue.add(jobName, messageData);

						item.json = job.toJSON();
						items[itemIndex] = item;

						returnItems.push(items[itemIndex]);
					} else {
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

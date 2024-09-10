import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	IWebhookDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	Node,
} from 'n8n-workflow';
import { NodeOperationError, WAIT_TIME_UNLIMITED } from 'n8n-workflow';
import { getQueue, redisConnectionTest } from './GenericFuntions';
import { setupRedisClient } from './utils';


// import { setupRedisClient, redisConnectionTest, getQueue } from './utils';

// type IDataObject = { [key: string]: any };

export const getResponseCode = (parameters: WebhookParameters) => {
	if (parameters.responseCode) {
		return parameters.responseCode;
	}
	const responseCodeOptions = parameters.options;
	if (responseCodeOptions?.responseCode?.values) {
		const { responseCode, customCode } = responseCodeOptions.responseCode.values;

		if (customCode) {
			return customCode;
		}

		return responseCode;
	}
	return 200;
};

export type WebhookParameters = {
	httpMethod: string | string[];
	responseMode: string;
	responseData: string;
	responseCode?: number; //typeVersion <= 1.1
	options?: {
		responseData?: string;
		responseCode?: {
			values?: {
				responseCode: number;
				customCode?: number;
			};
		};
		noResponseBody?: boolean;
	};
};

export const getResponseData = (parameters: WebhookParameters) => {
	const { responseData, responseMode, options } = parameters;
	if (responseData) return responseData;

	if (responseMode === 'onReceived') {
		const data = options?.responseData;
		if (data) return data;
	}

	if (options?.noResponseBody) return 'noData';

	return undefined;
};

// const webhookData = NodeHelpers.getNodeWebhooks(
// 	workflow,
// 	workflowStartNode,
// 	additionalData,
// ).find(
// 	(webhook) =>
// 		webhook.httpMethod === req.method &&
// 		webhook.path === (suffix ?? '') &&
// 		webhook.webhookDescription.restartWebhook === true &&
// 		(webhook.webhookDescription.isForm || false) === this.includeForms,
// );

export const defaultWebhookDescription: IWebhookDescription = {
	name: 'default',
	httpMethod: '={{$parameter["httpMethod"] || "GET"}}',
	isFullPath: true,
	responseCode: `={{(${getResponseCode})($parameter)}}`,
	responseMode: '={{$parameter["responseMode"]}}',
	responseData: `={{(${getResponseData})($parameter)}}`,
	responseBinaryPropertyName: '={{$parameter["responseBinaryPropertyName"]}}',
	responseContentType: '={{$parameter["options"]["responseContentType"]}}',
	responsePropertyName: '={{$parameter["options"]["responsePropertyName"]}}',
	responseHeaders: '={{$parameter["options"]["responseHeaders"]}}',
	path: '={{$parameter["path"]}}',
};

const webhookPath = 'bullmq-wait';

export class BullmqWait implements Node {
	description: INodeTypeDescription = {
		displayName: 'Wait for Job',
		name: 'bullmqWait',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:bullmq.svg',
		group: ['input'],
		version: 1,
		description: 'Wait for a job in BullMQ',
		defaults: {
			name: 'Wait for Job',
		},
		inputs: ['main'],
		outputs: ['main'],
		webhooks: [
			{
				...defaultWebhookDescription,
				httpMethod: 'GET',
				responseData: 'noData',
				responseMode: 'onReceived',
				responseContentType: 'text/plain',
				path: webhookPath,
				restartWebhook: true,
			},
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: webhookPath,
				restartWebhook: true,
				isFullPath: true,
				isForm: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter["responseMode"]}}',
				responseData: '={{$parameter["responseMode"] === "lastNode" ? "noData" : undefined}}',
				path: webhookPath,
				restartWebhook: true,
				isFullPath: true,
				isForm: true,
			},
		],
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
						name: 'Wait',
						value: 'wait',
						description: 'Wait for a job',
						action: 'Wait for a job',
					},
				],
				default: 'wait',
			},

			// ----------------------------------
			//         Wait
			// ----------------------------------
			{
				displayName: 'Queue Name',
				name: 'queueName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['wait'],
					},
				},
				default: '',
				required: true,
				description: 'Queue name to wait for the job',
			},
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['wait'],
					},
				},
				default: '',
				required: true,
				description: 'ID of the job to wait for',
			},
		],
	};

	methods = {
		credentialTest: { redisConnectionTest },
	};

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		// const req = context.getRequestObject();
		// const resp = context.getResponseObject();
		// const requestMethod = context.getRequestObject().method;

		// 	const resumeUrl = `${additionalData.webhookWaitingBaseUrl}/${executionId}`;
		// 	const urlBaseWebhook = Container.get(UrlService).getWebhookBaseUrl();
		// 	const globalConfig = Container.get(GlobalConfig);

		// webhookWaitingBaseUrl: urlBaseWebhook + globalConfig.endpoints.webhookWaiting,

		// console.log('webhook', context);

		return {
			webhookResponse: { ok: true },
			workflowData: [[{ json:  {} }]],
			noWebhookResponse: false,
		}
	}

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
			const items = this.getInputData();

			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				const item: INodeExecutionData = { json: {}, pairedItem: { item: itemIndex } };

				if (operation === 'wait') {
					const queueName = this.getNodeParameter('queueName', itemIndex) as string;

					const jobId = this.getNodeParameter('jobId', itemIndex) as string;

					const queue = await getQueue.call(this, queueName, { connection });

					const job = await queue.getJob(jobId);

					if (!job) {
						throw new NodeOperationError(this.getNode(), `Job with ID "${jobId}" does not exist!`);
					}

					const context = this.getWorkflowDataProxy(0);

					const execution = context.$execution;

					const resumeUrl = execution.resumeUrl;

					await job.updateData({
						...job.data,
						resumeUrl,
						step: 'waiting',
					});

					item.json = job.toJSON();
					items[itemIndex] = item;

					returnItems.push(items[itemIndex]);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported!`,
					);
				}
			}
		} catch (error) {
			throw error;
		}

		const waitTill = new Date(WAIT_TIME_UNLIMITED);

		return putToWait(this, waitTill);
	}
}


async function putToWait(context: IExecuteFunctions, waitTill: Date) {
	await context.putExecutionToWait(waitTill);
	return [context.getInputData()];
}

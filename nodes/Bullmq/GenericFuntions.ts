import { Queue, QueueOptions } from 'bullmq';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IExecuteFunctions,
	IExecuteWorkflowInfo,
	INodeCredentialTestResult,
	INodeParameterResourceLocator,
} from 'n8n-workflow';
import { setupRedisClient } from './utils';

export async function getWorkflowInfo(
	this: IExecuteFunctions,
	source: 'workflows' | 'custom',
	itemIndex = 0,
) {
	const workflowInfo: IExecuteWorkflowInfo = {};
	if (source === 'workflows') {
		// Read workflow from database
		const { value } = this.getNodeParameter(
			'workflowId',
			itemIndex,
			{},
		) as INodeParameterResourceLocator;
		workflowInfo.id = value as string;
	} else if (source === 'custom') {
		// Read workflow from parameter
		const queueName = this.getNodeParameter('queueName', itemIndex) as string;
		workflowInfo.id = queueName;
	}

	return workflowInfo;
}

export async function getQueue(
	this: IExecuteFunctions,
	queueName: string,
	options: QueueOptions,
): Promise<Queue> {
	const queue = new Queue(queueName, options);

	return queue;
}

export async function redisConnectionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data as ICredentialDataDecryptedObject;

	try {
		const client = setupRedisClient(credentials);
		await client.ping();
		return {
			status: 'OK',
			message: 'Connection successful!',
		};
	} catch (error) {
		return {
			status: 'Error',
			message: error.message,
		};
	}
}

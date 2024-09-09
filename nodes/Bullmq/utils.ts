import type {
	AssignmentCollectionValue,
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	IDataObject,
	IExecuteFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	ITaskData,
} from 'n8n-workflow';

import IORedis, { RedisOptions } from 'ioredis';
import { Processor, Queue, QueueOptions, Worker, WorkerOptions } from 'bullmq';

export type RedisClientType = IORedis;

export function setupRedisClient(credentials: ICredentialDataDecryptedObject): RedisClientType {
	const redisOptions: RedisOptions = {
		host: credentials.host as string,
		port: credentials.port as number,
		db: credentials.database as number,
		password: (credentials.password as string) || undefined,
		maxRetriesPerRequest: null,
	};

	const connection = new IORedis(redisOptions);

	return connection;
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

/** Parses the given value in a number if it is one else returns a string */
function getParsedValue(value: string): string | number {
	if (value.match(/^[\d\.]+$/) === null) {
		// Is a string
		return value;
	} else {
		// Is a number
		return parseFloat(value);
	}
}

/** Converts the Redis Info String into an object */
export function convertInfoToObject(stringData: string): IDataObject {
	const returnData: IDataObject = {};

	let key: string, value: string;
	for (const line of stringData.split('\n')) {
		if (['#', ''].includes(line.charAt(0))) {
			continue;
		}
		[key, value] = line.split(':');
		if (key === undefined || value === undefined) {
			continue;
		}
		value = value.trim();

		if (value.includes('=')) {
			returnData[key] = {};
			let key2: string, value2: string;
			for (const keyValuePair of value.split(',')) {
				[key2, value2] = keyValuePair.split('=');
				(returnData[key] as IDataObject)[key2] = getParsedValue(value2);
			}
		} else {
			returnData[key] = getParsedValue(value);
		}
	}

	return returnData;
}

export async function getQueue(
	this: IExecuteFunctions,
	queueName: string,
	options: QueueOptions,
): Promise<Queue> {
	const queue = new Queue(queueName, options);

	return queue;
}


export function createWorker<DataType, ResultType, NameType extends string>(
queueName: string, handler: string | null | Processor<DataType, ResultType, NameType>, extraOptions: WorkerOptions,
): Worker<DataType, ResultType, NameType> {
	const worker = new Worker(queueName, handler, extraOptions);
	return worker as unknown as Worker<DataType, ResultType, NameType>;
}


export function parseJson(jsonString: any, fallback: any): IDataObject {
	try {
		if (typeof jsonString === 'object') {
			return jsonString;
		}

		return JSON.parse(jsonString);
	} catch (error) {
		return fallback;
	}
}


export function craftJobReturnValue(json: any) {
	if (typeof json !== 'object') {
		return json;
	}

	return {
		data: json.data,
	}
}


export function parseAssignmentsCollection(
	collection: AssignmentCollectionValue,
	fallback: IDataObject,
): IDataObject {
	try {
		const returnData = Object.fromEntries(
			collection.assignments.map(({ name, value }) => {
				return [name, value]
			}
		));

		return returnData;
	}  catch (error) {
		return fallback;
	}
}



export function extractNodeExecutionResultData(executionResult: ITaskData[]): IDataObject {
	if (!executionResult) {
		return {};
	}

	if (executionResult.length === 1) {
		return extractItemExecutionResultData(executionResult[0]);
	}

	return {
		items: executionResult.map((res) => extractItemExecutionResultData(res, 'main')),
	};
}

function extractItemExecutionResultData(executionResult: ITaskData, output = 'main'): IDataObject {
	if (!executionResult) {
		return {};
	}

	if (executionResult?.data === undefined) {
		return {};
	}

	const mainData = executionResult?.data[output];

	if (mainData === undefined) {
		return {};
	}

	const returnData = extractConnectionExecutionData(mainData);

	return returnData;
}

function extractConnectionExecutionData(data: Array<INodeExecutionData[] | null>): IDataObject {
	if (!data) {
		return {};
	}

	if (data.length === 1) {
		return extractOutputDataExecutionData(data[0]);
	}

	return {
		items: data.map(extractOutputDataExecutionData),
	};
}

function extractOutputDataExecutionData(data: INodeExecutionData[] | null): IDataObject {
	if (!data || data.length === 0) {
		return {};
	}

	if (data.length === 1) {
		return extractSingleOutputDataExecutionData(data[0]);
	}

	return {
		items: data.map(extractSingleOutputDataExecutionData),
	};
}

function extractSingleOutputDataExecutionData(data: INodeExecutionData): IDataObject {
	if (data.json === undefined) {
		return {};
	}

	return data.json as IDataObject;
}

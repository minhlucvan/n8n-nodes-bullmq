import type { ICredentialDataDecryptedObject, ICredentialTestFunctions, ICredentialsDecrypted, IDataObject, IExecuteFunctions, INodeCredentialTestResult } from 'n8n-workflow';
import IORedis from 'ioredis';
import { Processor, Queue, QueueOptions, Worker, WorkerOptions } from 'bullmq';
export type RedisClientType = IORedis;
export declare function setupRedisClient(credentials: ICredentialDataDecryptedObject): RedisClientType;
export declare function redisConnectionTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult>;
export declare function convertInfoToObject(stringData: string): IDataObject;
export declare function getQueue(this: IExecuteFunctions, queueName: string, options: QueueOptions): Promise<Queue>;
export declare function createWorker<DataType, ResultType, NameType extends string>(queueName: string, handler: string | null | Processor<DataType, ResultType, NameType>, extraOptions: WorkerOptions): Worker<DataType, ResultType, NameType>;

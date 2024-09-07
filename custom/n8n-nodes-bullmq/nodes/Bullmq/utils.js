"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRedisClient = setupRedisClient;
exports.redisConnectionTest = redisConnectionTest;
exports.convertInfoToObject = convertInfoToObject;
exports.getQueue = getQueue;
exports.createWorker = createWorker;
const ioredis_1 = __importDefault(require("ioredis"));
const bullmq_1 = require("bullmq");
function setupRedisClient(credentials) {
    const redisOptions = {
        host: credentials.host,
        port: credentials.port,
        tls: credentials.ssl === true,
        db: credentials.database,
        password: credentials.password || undefined,
        maxRetriesPerRequest: null,
    };
    const connection = new ioredis_1.default(redisOptions);
    return connection;
}
async function redisConnectionTest(credential) {
    const credentials = credential.data;
    try {
        const client = setupRedisClient(credentials);
        await client.ping();
        return {
            status: 'OK',
            message: 'Connection successful!',
        };
    }
    catch (error) {
        return {
            status: 'Error',
            message: error.message,
        };
    }
}
function getParsedValue(value) {
    if (value.match(/^[\d\.]+$/) === null) {
        return value;
    }
    else {
        return parseFloat(value);
    }
}
function convertInfoToObject(stringData) {
    const returnData = {};
    let key, value;
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
            let key2, value2;
            for (const keyValuePair of value.split(',')) {
                [key2, value2] = keyValuePair.split('=');
                returnData[key][key2] = getParsedValue(value2);
            }
        }
        else {
            returnData[key] = getParsedValue(value);
        }
    }
    return returnData;
}
async function getQueue(queueName, options) {
    const queue = new bullmq_1.Queue(queueName, options);
    return queue;
}
function createWorker(queueName, handler, extraOptions) {
    const worker = new bullmq_1.Worker(queueName, handler, extraOptions);
    return worker;
}
//# sourceMappingURL=utils.js.map
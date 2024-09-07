"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bullmq = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const utils_1 = require("./utils");
class Bullmq {
    constructor() {
        this.description = {
            displayName: 'Bullmq',
            name: 'bullmq',
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
        this.methods = {
            credentialTest: { redisConnectionTest: utils_1.redisConnectionTest },
        };
    }
    async execute() {
        const credentials = await this.getCredentials('redis');
        const connection = (0, utils_1.setupRedisClient)(credentials);
        const operation = this.getNodeParameter('operation', 0);
        const returnItems = [];
        try {
            if (['add'].includes(operation)) {
                const items = this.getInputData();
                for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                    const item = { json: {}, pairedItem: { item: itemIndex } };
                    if (operation === 'add') {
                        const queueName = this.getNodeParameter('queueName', itemIndex);
                        const jobName = this.getNodeParameter('jobName', itemIndex);
                        const messageData = this.getNodeParameter('jobData', itemIndex);
                        const queue = await utils_1.getQueue.call(this, queueName, { connection });
                        const job = await queue.add(jobName, messageData);
                        item.json = job.toJSON();
                        items[itemIndex] = item;
                        returnItems.push(items[itemIndex]);
                    }
                    else {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
                    }
                }
            }
        }
        catch (error) {
            throw error;
        }
        return [returnItems];
    }
}
exports.Bullmq = Bullmq;
//# sourceMappingURL=Bullmq.node.js.map
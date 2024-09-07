"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullmqRespond = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const utils_1 = require("./utils");
class BullmqRespond {
    constructor() {
        this.description = {
            displayName: 'Bullmq Respond',
            name: 'bullmqRespond',
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
            if (['respond'].includes(operation)) {
                const items = this.getInputData();
                for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                    const item = { json: {}, pairedItem: { item: itemIndex } };
                    switch (operation) {
                        case 'respond':
                            const queueName = this.getNodeParameter('queueName', itemIndex);
                            const jobId = this.getNodeParameter('jobId', itemIndex);
                            const lockToken = this.getNodeParameter('lockToken', itemIndex);
                            const queue = await utils_1.getQueue.call(this, queueName, { connection });
                            const data = this.getNodeParameter('data', itemIndex);
                            const job = await queue.getJob(jobId);
                            if (!job) {
                                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Job with ID "${jobId}" does not exist!`);
                            }
                            await job.moveToCompleted(data, lockToken);
                            item.json = job.toJSON();
                            items[itemIndex] = item;
                            returnItems.push(items[itemIndex]);
                            break;
                        default:
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
exports.BullmqRespond = BullmqRespond;
//# sourceMappingURL=BullmqRespond.node.js.map
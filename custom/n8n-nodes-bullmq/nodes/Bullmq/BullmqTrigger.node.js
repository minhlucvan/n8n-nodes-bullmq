"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullmqTrigger = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const utils_1 = require("./utils");
const bullmq_1 = require("bullmq");
class BullmqTrigger {
    constructor() {
        this.description = {
            displayName: 'Bullmq Trigger',
            name: 'bullmqTrigger',
            icon: 'file:bullmq.png',
            group: ['trigger'],
            version: 1,
            description: 'Register new workers for Bullmq',
            defaults: {
                name: 'Bullmq Trigger',
            },
            inputs: [],
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
                    displayName: 'Queue Name',
                    name: 'queueName',
                    type: 'string',
                    default: '',
                    required: true,
                    description: 'The name of the queue to listen to',
                },
                {
                    displayName: 'Options',
                    name: 'options',
                    type: 'collection',
                    placeholder: 'Add option',
                    default: {},
                    options: [
                        {
                            displayName: 'Respond Type',
                            name: 'respondType',
                            type: 'options',
                            default: 'immediate',
                            options: [
                                {
                                    name: 'Immediate',
                                    value: 'immediate',
                                },
                                {
                                    name: 'Delayed',
                                    value: 'delayed',
                                },
                            ],
                        },
                        {
                            displayName: 'Only Data',
                            name: 'onlyData',
                            type: 'boolean',
                            default: true,
                            description: 'Whether to only return the data of the job',
                        },
                    ],
                },
            ],
        };
        this.methods = {
            credentialTest: { redisConnectionTest: utils_1.redisConnectionTest },
        };
    }
    async trigger() {
        const credentials = await this.getCredentials('redis');
        const queueName = this.getNodeParameter('queueName');
        const options = this.getNodeParameter('options');
        const respondType = options.respondType;
        if (!queueName) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Queue Name must be set');
        }
        const onJob = async (job, token) => {
            const payload = options.onlyData ? { data: job.data } : job.toJSON();
            const payloadWithToken = { ...payload, lockToken: token };
            if (respondType === 'immediate') {
                job.updateData({ step: 'handled' });
                return {
                    respondType: 'immediate',
                };
            }
            await job.updateData({ step: 'triggered' });
            if (token === undefined) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Token is missing');
            }
            await job.extendLock(token, 1000);
            this.emit([this.helpers.returnJsonArray(payloadWithToken)]);
            throw new bullmq_1.DelayedError('Job was triggered');
        };
        const connection = (0, utils_1.setupRedisClient)(credentials);
        let worker;
        const manualTriggerFunction = async () => {
            worker = (0, utils_1.createWorker)(queueName, async (job, token) => {
                worker.close();
                return onJob(job, token);
            }, { lockDuration: 60000, connection, autorun: false });
            worker.run();
        };
        if (this.getMode() === 'trigger') {
            worker = (0, utils_1.createWorker)(queueName, onJob, {
                lockDuration: 60000,
                connection,
                autorun: false,
            });
            worker.run();
        }
        async function closeFunction() {
            if (worker) {
                await worker.close();
            }
        }
        return {
            closeFunction,
            manualTriggerFunction,
        };
    }
}
exports.BullmqTrigger = BullmqTrigger;
//# sourceMappingURL=BullmqTrigger.node.js.map
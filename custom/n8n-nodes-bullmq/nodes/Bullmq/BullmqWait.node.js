"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullmqWait = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const utils_1 = require("./utils");
class BullmqWait {
    constructor() {
        this.description = {
            displayName: 'BullMQ Wait',
            name: 'bullmqWait',
            icon: 'file:bullmq.png',
            group: ['input'],
            version: 1,
            description: 'Wait for a job in BullMQ',
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
                            name: 'Wait',
                            value: 'wait',
                            description: 'Wait for a job',
                            action: 'Wait for a job',
                        },
                    ],
                    default: 'wait',
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
            ],
        };
        this.methods = {
            credentialTest: { redisConnectionTest: utils_1.redisConnectionTest },
        };
    }
    async execute() {
        const operation = this.getNodeParameter('operation', 0);
        const returnItems = [];
        try {
            const items = this.getInputData();
            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                const item = { json: {}, pairedItem: { item: itemIndex } };
                if (operation === 'add') {
                    const executionId = this.getExecutionId();
                    const data = this.getExecuteData();
                    console.log(JSON.stringify({
                        executionId,
                        data,
                    }, null, 2));
                    item.json = {};
                    items[itemIndex] = item;
                    returnItems.push(items[itemIndex]);
                }
                else {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
                }
            }
        }
        catch (error) {
            throw error;
        }
        return [returnItems];
    }
}
exports.BullmqWait = BullmqWait;
//# sourceMappingURL=BullmqWait.node.js.map
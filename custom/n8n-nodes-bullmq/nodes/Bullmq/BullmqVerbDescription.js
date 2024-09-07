"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpVerbFields = exports.httpVerbOperations = void 0;
exports.httpVerbOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['httpVerb'],
            },
        },
        options: [
            {
                name: 'GET',
                value: 'get',
                description: 'Perform a GET request',
                routing: {
                    request: {
                        method: 'GET',
                        url: '/get',
                    },
                },
                action: 'GET a http verb',
            },
            {
                name: 'DELETE',
                value: 'delete',
                description: 'Perform a DELETE request',
                routing: {
                    request: {
                        method: 'DELETE',
                        url: '/delete',
                    },
                },
                action: 'DELETE a http verb',
            },
        ],
        default: 'get',
    },
];
const getOperation = [
    {
        displayName: 'Type of Data',
        name: 'typeofData',
        default: 'queryParameter',
        description: 'Select type of data to send [Query Parameters]',
        displayOptions: {
            show: {
                resource: ['httpVerb'],
                operation: ['get'],
            },
        },
        type: 'options',
        options: [
            {
                name: 'Query',
                value: 'queryParameter',
            },
        ],
        required: true,
    },
    {
        displayName: 'Query Parameters',
        name: 'arguments',
        default: {},
        description: "The request's query parameters",
        displayOptions: {
            show: {
                resource: ['httpVerb'],
                operation: ['get'],
            },
        },
        options: [
            {
                name: 'keyvalue',
                displayName: 'Key:Value',
                values: [
                    {
                        displayName: 'Key',
                        name: 'key',
                        type: 'string',
                        default: '',
                        required: true,
                        description: 'Key of query parameter',
                    },
                    {
                        displayName: 'Value',
                        name: 'value',
                        type: 'string',
                        default: '',
                        routing: {
                            send: {
                                property: '={{$parent.key}}',
                                type: 'query',
                            },
                        },
                        required: true,
                        description: 'Value of query parameter',
                    },
                ],
            },
        ],
        type: 'fixedCollection',
        typeOptions: {
            multipleValues: true,
        },
    },
];
const deleteOperation = [
    {
        displayName: 'Type of Data',
        name: 'typeofData',
        default: 'queryParameter',
        description: 'Select type of data to send [Query Parameter Arguments, JSON-Body]',
        displayOptions: {
            show: {
                resource: ['httpVerb'],
                operation: ['delete'],
            },
        },
        options: [
            {
                name: 'Query',
                value: 'queryParameter',
            },
            {
                name: 'JSON',
                value: 'jsonData',
            },
        ],
        required: true,
        type: 'options',
    },
    {
        displayName: 'Query Parameters',
        name: 'arguments',
        default: {},
        description: "The request's query parameters",
        displayOptions: {
            show: {
                resource: ['httpVerb'],
                operation: ['delete'],
                typeofData: ['queryParameter'],
            },
        },
        options: [
            {
                name: 'keyvalue',
                displayName: 'Key:Value',
                values: [
                    {
                        displayName: 'Key',
                        name: 'key',
                        type: 'string',
                        default: '',
                        required: true,
                        description: 'Key of query parameter',
                    },
                    {
                        displayName: 'Value',
                        name: 'value',
                        type: 'string',
                        default: '',
                        routing: {
                            send: {
                                property: '={{$parent.key}}',
                                type: 'query',
                            },
                        },
                        required: true,
                        description: 'Value of query parameter',
                    },
                ],
            },
        ],
        type: 'fixedCollection',
        typeOptions: {
            multipleValues: true,
        },
    },
    {
        displayName: 'JSON Object',
        name: 'arguments',
        default: {},
        description: "The request's JSON properties",
        displayOptions: {
            show: {
                resource: ['httpVerb'],
                operation: ['delete'],
                typeofData: ['jsonData'],
            },
        },
        options: [
            {
                name: 'keyvalue',
                displayName: 'Key:Value',
                values: [
                    {
                        displayName: 'Key',
                        name: 'key',
                        type: 'string',
                        default: '',
                        required: true,
                        description: 'Key of JSON property',
                    },
                    {
                        displayName: 'Value',
                        name: 'value',
                        type: 'string',
                        default: '',
                        routing: {
                            send: {
                                property: '={{$parent.key}}',
                                type: 'body',
                            },
                        },
                        required: true,
                        description: 'Value of JSON property',
                    },
                ],
            },
        ],
        type: 'fixedCollection',
        typeOptions: {
            multipleValues: true,
        },
    },
];
exports.httpVerbFields = [
    ...getOperation,
    ...deleteOperation,
];
//# sourceMappingURL=BullmqVerbDescription.js.map
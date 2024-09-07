"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleCredentialsApi = void 0;
class ExampleCredentialsApi {
    constructor() {
        this.name = 'exampleCredentialsApi';
        this.displayName = 'Example Credentials API';
        this.properties = [
            {
                displayName: 'User Name',
                name: 'username',
                type: 'string',
                default: '',
            },
            {
                displayName: 'Password',
                name: 'password',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                auth: {
                    username: '={{ $credentials.username }}',
                    password: '={{ $credentials.password }}',
                },
                qs: {
                    n8n: 'rocks',
                },
            },
        };
        this.test = {
            request: {
                baseURL: 'https://example.com/',
                url: '',
            },
        };
    }
}
exports.ExampleCredentialsApi = ExampleCredentialsApi;
//# sourceMappingURL=ExampleCredentialsApi.credentials.js.map
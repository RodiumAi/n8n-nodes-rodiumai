import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class RodiumAiApi implements ICredentialType {
	name = 'rodiumAiApi';

	displayName = 'RodiumAi API';

	icon: Icon = { light: 'file:../icons/rodiumai-monogram.svg', dark: 'file:../icons/rodiumai-monogram.dark.svg' };

	documentationUrl = 'https://www.rodiumai.io/docs/api/authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your RodiumAi API key, starting with rd_sk_. Create one in your RodiumAi dashboard.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.rodiumai.io/v1',
			required: true,
			description: 'Only change this if RodiumAi support asks you to',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'X-RodiumAi-Client': 'n8n',
			},
		},
	};

	// GET /models is public, so the key is checked against the authenticated wallet endpoint.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			url: '/wallet',
			method: 'GET',
		},
	};
}

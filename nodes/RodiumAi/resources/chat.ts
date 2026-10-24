import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { RODIUMAI_CREDENTIAL_TYPE, RODIUMAI_DEFAULT_MODEL } from '../../shared/constants';
import { cleanBody, normalizeBaseUrl } from '../../shared/utils';

const showForCreateCompletion = { show: { resource: ['chat'], operation: ['createCompletion'] } };

export const chatOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['chat'] } },
		options: [
			{
				name: 'Create Completion',
				value: 'createCompletion',
				description: 'Send messages to a model and get its answer',
				action: 'Create a chat completion',
			},
		],
		default: 'createCompletion',
	},
];

export const chatFields: INodeProperties[] = [
	{
		displayName: 'Model Name or ID',
		name: 'model',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChatModels' },
		default: RODIUMAI_DEFAULT_MODEL,
		required: true,
		displayOptions: showForCreateCompletion,
		description:
			'"Smart" lets RodiumAi pick the best model for each request. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add Message',
		default: { values: [{ role: 'user', content: '' }] },
		displayOptions: showForCreateCompletion,
		options: [
			{
				displayName: 'Message',
				name: 'values',
				values: [
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						options: [
							{ name: 'Assistant', value: 'assistant' },
							{ name: 'System', value: 'system' },
							{ name: 'User', value: 'user' },
						],
						default: 'user',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						typeOptions: { rows: 4 },
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: showForCreateCompletion,
		description:
			'Whether to return only the answer, model, selected model, finish reason and usage',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showForCreateCompletion,
		options: [
			{
				displayName: 'Frequency Penalty',
				name: 'frequencyPenalty',
				type: 'number',
				typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 1 },
				default: 0,
				description: 'Positive values reduce repetition of the same lines',
			},
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxTokens',
				type: 'number',
				default: -1,
				description: 'Maximum tokens to generate. Use -1 for no limit.',
			},
			{
				displayName: 'Presence Penalty',
				name: 'presencePenalty',
				type: 'number',
				typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 1 },
				default: 0,
				description: 'Positive values encourage new topics',
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				options: [
					{ name: 'Text', value: 'text' },
					{ name: 'JSON Object', value: 'json_object' },
				],
				default: 'text',
				description: 'With JSON Object, ask for JSON in your messages too',
			},
			{
				displayName: 'Sampling Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 1 },
				default: 0.7,
				description: 'Lower values give more deterministic answers',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				default: 1,
				description: 'Nucleus sampling. Change this or temperature, not both.',
			},
		],
	},
];

export interface ChatMessage {
	role: string;
	content: string;
}

export interface ChatOptions {
	frequencyPenalty?: number;
	maxTokens?: number;
	presencePenalty?: number;
	responseFormat?: 'text' | 'json_object';
	temperature?: number;
	topP?: number;
}

export function buildChatBody(
	model: string,
	messages: ChatMessage[],
	options: ChatOptions,
): IDataObject {
	return cleanBody({
		model,
		messages,
		stream: false,
		temperature: options.temperature,
		top_p: options.topP,
		frequency_penalty: options.frequencyPenalty,
		presence_penalty: options.presencePenalty,
		max_tokens: options.maxTokens,
		response_format:
			options.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
	}) as IDataObject;
}

export function simplifyChatResponse(response: IDataObject, parseJson: boolean): IDataObject {
	const choices = (response.choices as IDataObject[] | undefined) ?? [];
	const first = choices[0] ?? {};
	const message = (first.message as IDataObject | undefined) ?? {};
	const routing = (response.rodiumai_routing as IDataObject | undefined) ?? {};
	let content: unknown = message.content ?? '';

	if (parseJson && typeof content === 'string') {
		try {
			content = JSON.parse(content);
		} catch {
			// keep the raw string if the model did not return valid JSON
		}
	}

	return {
		content: content as IDataObject,
		model: response.model,
		selected_model: routing.selected_model ?? response.model,
		finish_reason: first.finish_reason,
		usage: response.usage,
	};
}

export async function executeChat(this: IExecuteFunctions, itemIndex: number): Promise<IDataObject> {
	const credentials = await this.getCredentials(RODIUMAI_CREDENTIAL_TYPE);
	const model = this.getNodeParameter('model', itemIndex) as string;
	const messages = this.getNodeParameter('messages.values', itemIndex, []) as ChatMessage[];
	const simplify = this.getNodeParameter('simplify', itemIndex, true) as boolean;
	const options = this.getNodeParameter('options', itemIndex, {}) as ChatOptions;

	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		RODIUMAI_CREDENTIAL_TYPE,
		{
			method: 'POST',
			url: `${normalizeBaseUrl(credentials.baseUrl)}/chat/completions`,
			body: buildChatBody(model, messages, options),
			json: true,
		},
	)) as IDataObject;

	return simplify
		? simplifyChatResponse(response, options.responseFormat === 'json_object')
		: response;
}

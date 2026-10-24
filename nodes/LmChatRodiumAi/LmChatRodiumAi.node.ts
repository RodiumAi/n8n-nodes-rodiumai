import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	RODIUMAI_ATTRIBUTION_HEADERS,
	RODIUMAI_CREDENTIAL_TYPE,
	RODIUMAI_DEFAULT_MODEL,
	RODIUMAI_REPOSITORY_URL,
} from '../shared/constants';
import { getChatModels } from '../shared/loadModels';
import { normalizeBaseUrl } from '../shared/utils';

interface ChatModelOptions {
	frequencyPenalty?: number;
	maxRetries?: number;
	maxTokens?: number;
	presencePenalty?: number;
	temperature?: number;
	timeout?: number;
	topP?: number;
}

export class LmChatRodiumAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RodiumAi Chat Model',
		name: 'lmChatRodiumAi',
		icon: { light: 'file:../../icons/rodiumai-monogram.svg', dark: 'file:../../icons/rodiumai-monogram.dark.svg' },
		group: ['transform'],
		version: [1],
		subtitle: '={{$parameter["model"]}}',
		description: 'Use RodiumAi models in AI Agents and chains',
		defaults: { name: 'RodiumAi Chat Model' },
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [{ url: RODIUMAI_REPOSITORY_URL }],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [{ name: RODIUMAI_CREDENTIAL_TYPE, required: true }],
		properties: [
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getChatModels' },
				default: RODIUMAI_DEFAULT_MODEL,
				required: true,
				description:
					'The model that answers. "Smart" lets RodiumAi pick the best model for each request. For AI Agents with tools, pick a model that supports tools. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
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
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						default: 2,
						description: 'Maximum number of retries on failure',
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
						displayName: 'Sampling Temperature',
						name: 'temperature',
						type: 'number',
						typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 1 },
						default: 0.7,
						description: 'Lower values give more deterministic answers',
					},
					{
						displayName: 'Timeout (Ms)',
						name: 'timeout',
						type: 'number',
						default: 360000,
						description: 'Maximum time a request may take, in milliseconds',
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
		],
	};

	methods = {
		loadOptions: {
			getChatModels,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		// Dynamic import: @n8n/ai-node-sdk is a peer dependency shipped by recent n8n versions only.
		let sdk: typeof import('@n8n/ai-node-sdk');
		try {
			sdk = await import('@n8n/ai-node-sdk');
		} catch {
			throw new NodeOperationError(
				this.getNode(),
				'The RodiumAi Chat Model requires a recent n8n version that includes @n8n/ai-node-sdk. Please update n8n.',
				{ itemIndex },
			);
		}

		const credentials = await this.getCredentials(RODIUMAI_CREDENTIAL_TYPE);
		const model = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as ChatModelOptions;

		return sdk.supplyModel(this, {
			type: 'openai',
			baseUrl: normalizeBaseUrl(credentials.baseUrl),
			apiKey: String(credentials.apiKey),
			defaultHeaders: { ...RODIUMAI_ATTRIBUTION_HEADERS },
			model,
			temperature: options.temperature,
			topP: options.topP,
			frequencyPenalty: options.frequencyPenalty,
			presencePenalty: options.presencePenalty,
			timeout: options.timeout,
			maxRetries: options.maxRetries,
			...(options.maxTokens !== undefined && options.maxTokens > 0
				? { maxTokens: options.maxTokens }
				: {}),
		});
	}
}

import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { RODIUMAI_CREDENTIAL_TYPE, RODIUMAI_ROUTING_MODELS } from './constants';
import { normalizeBaseUrl } from './utils';

/** One entry of GET /models. RodiumAi-specific fields are prefixed with `rodiumai_`. */
export interface RodiumAiModel {
	id?: string;
	object?: string;
	owned_by?: string;
	rodiumai_display_name?: string;
	rodiumai_description?: string | null;
	rodiumai_provider?: { slug?: string; name?: string };
	rodiumai_capabilities?: {
		context_window?: number | null;
		max_output_tokens?: number | null;
		input_modalities?: string[];
		output_modalities?: string[];
		supports_streaming?: boolean;
		supports_tools?: boolean;
		supports_vision?: boolean;
		supports_json_mode?: boolean;
		supports_reasoning?: boolean;
	};
	/** Only set on virtual routing models: `smart_router` or `smart_profile`. */
	rodiumai_kind?: string;
	rodiumai_status?: string;
	[key: string]: unknown;
}

interface RodiumAiModelList {
	data?: RodiumAiModel[];
}

export function isRoutingModel(model: RodiumAiModel): boolean {
	return (
		typeof model.rodiumai_kind === 'string' ||
		(typeof model.id === 'string' && RODIUMAI_ROUTING_MODELS.includes(model.id))
	);
}

/** Speech-to-text models: their output is text, but they do not work with chat completions. */
const TRANSCRIPTION_MODEL_PATTERN = /transcribe/i;

/**
 * A chat model is available, takes text in and produces text only.
 * This excludes embedding, image, speech (TTS), audio/realtime, video and transcription models.
 */
export function isChatModel(model: RodiumAiModel): boolean {
	if (model.rodiumai_status !== undefined && model.rodiumai_status !== 'available') return false;
	if (isRoutingModel(model)) return true;
	if (typeof model.id === 'string' && TRANSCRIPTION_MODEL_PATTERN.test(model.id)) return false;
	const inputs = model.rodiumai_capabilities?.input_modalities;
	if (Array.isArray(inputs) && inputs.length > 0 && !inputs.includes('text')) return false;
	const outputs = model.rodiumai_capabilities?.output_modalities;
	if (Array.isArray(outputs) && outputs.length > 0) {
		return outputs.every((modality) => modality === 'text');
	}
	return true;
}

function routingRank(model: RodiumAiModel): number {
	const index = RODIUMAI_ROUTING_MODELS.indexOf(model.id ?? '');
	return index === -1 ? RODIUMAI_ROUTING_MODELS.length : index;
}

function describeModel(model: RodiumAiModel): string {
	const parts: string[] = [model.id as string];
	if (isRoutingModel(model)) {
		parts.push('RodiumAi routing');
	} else if (model.rodiumai_provider?.name) {
		parts.push(model.rodiumai_provider.name);
	}
	if (model.rodiumai_capabilities?.supports_tools) parts.push('tools');
	return parts.join(' · ');
}

/** Turns GET /models into dropdown options: routing models first, then the rest by name. */
export function toChatModelOptions(models: RodiumAiModel[]): INodePropertyOptions[] {
	const chatModels = models.filter((m) => typeof m.id === 'string' && isChatModel(m));
	const routing = chatModels
		.filter(isRoutingModel)
		.sort((a, b) => routingRank(a) - routingRank(b));
	const others = chatModels.filter((m) => !isRoutingModel(m));

	const toOption = (m: RodiumAiModel): INodePropertyOptions => ({
		name: m.rodiumai_display_name ?? (m.id as string),
		value: m.id as string,
		description: describeModel(m),
	});

	return [
		...routing.map(toOption),
		...others.map(toOption).sort((a, b) => a.name.localeCompare(b.name)),
	];
}

export async function fetchModels(
	this: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<RodiumAiModel[]> {
	const credentials = await this.getCredentials(RODIUMAI_CREDENTIAL_TYPE);
	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		RODIUMAI_CREDENTIAL_TYPE,
		{
			method: 'GET',
			url: `${normalizeBaseUrl(credentials.baseUrl)}/models`,
			json: true,
		},
	)) as RodiumAiModelList;
	return Array.isArray(response.data) ? response.data : [];
}

export async function getChatModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const models = await fetchModels.call(this);
	return toChatModelOptions(models);
}

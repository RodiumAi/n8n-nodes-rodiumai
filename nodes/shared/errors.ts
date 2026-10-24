import { NodeApiError } from 'n8n-workflow';
import type { INode, JsonObject } from 'n8n-workflow';
import { RODIUMAI_DASHBOARD_URL, RODIUMAI_SUPPORT_EMAIL } from './constants';

export interface ErrorMapping {
	message: string;
	description: string;
}

export interface RodiumAiApiError {
	message?: string;
	code?: string;
	type?: string;
}

const TOP_UP_HINT = `Top up your RODI balance with Mobile Money at ${RODIUMAI_DASHBOARD_URL}`;

const RETRY_HINT = 'Retry later, or enable "Retry On Fail" in the node settings.';

const SUPPORT_HINT = `Retry later. Contact ${RODIUMAI_SUPPORT_EMAIL} if the problem persists.`;

/** Mappings for RodiumAi error codes (`error.code`). They take precedence over the HTTP status. */
const CODE_MAP: Record<string, ErrorMapping> = {
	invalid_api_key: {
		message: 'Invalid RodiumAi API key',
		description: 'Check the API key in your RodiumAi credential. It must start with rd_sk_.',
	},
	insufficient_balance: {
		message: 'Insufficient RODI balance',
		description: TOP_UP_HINT,
	},
	model_not_found: {
		message: 'Model not found on RodiumAi',
		description: 'Pick a model from the list, or check the model ID (format: brand/model).',
	},
	invalid_model_format: {
		message: 'Invalid model ID',
		description: 'Model IDs use the format brand/model, for example openai/gpt-4o-mini.',
	},
	missing_model: {
		message: 'No model selected',
		description: 'Choose a model in the node parameters.',
	},
	model_not_allowed: {
		message: 'This API key cannot use this model',
		description: 'Allow the model for this key in your RodiumAi dashboard, or pick another model.',
	},
	api_key_quota_exceeded: {
		message: 'API key quota exceeded',
		description: 'Raise the quota of this key in your RodiumAi dashboard, or use another key.',
	},
	smart_pool_empty: {
		message: 'No model available for smart routing',
		description: 'Allow more models for this API key, or pick a specific model.',
	},
	context_length_exceeded: {
		message: 'The conversation is too long for this model',
		description: 'Shorten the messages, or pick a model with a larger context window.',
	},
	model_unavailable: {
		message: 'Model temporarily unavailable on RodiumAi',
		description: 'Retry later, or pick another model.',
	},
	maintenance_active: {
		message: 'RodiumAi is under maintenance',
		description: RETRY_HINT,
	},
};

/** Fallback mappings by HTTP status. */
const STATUS_MAP: Record<number, ErrorMapping> = {
	400: {
		message: 'Invalid request sent to RodiumAi',
		description: 'Check the model ID, the messages and the options.',
	},
	401: CODE_MAP.invalid_api_key,
	402: CODE_MAP.insufficient_balance,
	403: {
		message: 'Access denied by RodiumAi',
		description: 'Check the permissions and quotas of this API key in your RodiumAi dashboard.',
	},
	404: CODE_MAP.model_not_found,
	413: {
		message: 'Request too large for RodiumAi',
		description: 'The request body must be under 10 MiB. Shorten the messages.',
	},
	422: {
		message: 'Invalid request sent to RodiumAi',
		description: 'Check the model ID and the format of the messages.',
	},
	429: {
		message: 'RodiumAi rate limit reached',
		description: `Wait a moment and retry, or enable "Retry On Fail" in the node settings.`,
	},
	504: {
		message: 'RodiumAi request timed out',
		description: RETRY_HINT,
	},
};

const SERVER_ERROR: ErrorMapping = {
	message: 'RodiumAi server error',
	description: SUPPORT_HINT,
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
	if (typeof value === 'string') {
		try {
			return asRecord(JSON.parse(value));
		} catch {
			return undefined;
		}
	}
	return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

/** Original error first, then its causes (n8n wraps HTTP errors in NodeApiError). */
function errorChain(error: unknown): Array<Record<string, unknown>> {
	const chain: Array<Record<string, unknown>> = [];
	let current = asRecord(error);
	while (current && chain.length < 4 && !chain.includes(current)) {
		chain.push(current);
		current = asRecord(current.cause);
	}
	return chain;
}

export function getStatusCode(error: unknown): number | undefined {
	for (const e of errorChain(error)) {
		const response = asRecord(e.response);
		const raw = e.httpCode ?? e.statusCode ?? e.status ?? response?.status ?? response?.statusCode;
		const code = typeof raw === 'string' ? parseInt(raw, 10) : raw;
		if (typeof code === 'number' && Number.isFinite(code)) return code;
	}
	return undefined;
}

function readApiError(body: unknown): RodiumAiApiError | undefined {
	const record = asRecord(body);
	if (!record) return undefined;
	// OpenAI shape: { error: { message, type, code } }. Maintenance errors put the fields at the root.
	const nested = asRecord(record.error);
	const source = nested ?? record;
	const message = typeof source.message === 'string' ? source.message : undefined;
	const code = typeof source.code === 'string' ? source.code : undefined;
	const type = typeof source.type === 'string' ? source.type : undefined;
	if (message === undefined && code === undefined) return undefined;
	return { message, code, type };
}

/** Extracts the RodiumAi error body ({ error: { message, code } }) from an HTTP error. */
export function getApiError(error: unknown): RodiumAiApiError | undefined {
	for (const e of errorChain(error)) {
		const response = asRecord(e.response);
		for (const body of [response?.data, response?.body, e.error, e.body]) {
			const apiError = readApiError(body);
			if (apiError) return apiError;
		}
	}
	return undefined;
}

export function mapRodiumAiError(
	statusCode: number | undefined,
	code?: string,
): ErrorMapping | undefined {
	if (code !== undefined && CODE_MAP[code]) return CODE_MAP[code];
	if (statusCode === undefined) return undefined;
	if (STATUS_MAP[statusCode]) return STATUS_MAP[statusCode];
	if (statusCode >= 500) return SERVER_ERROR;
	return undefined;
}

/** Builds an actionable error message, keeping the message returned by RodiumAi. */
export function describeRodiumAiError(error: unknown): ErrorMapping | undefined {
	const statusCode = getStatusCode(error);
	const apiError = getApiError(error);
	const mapping = mapRodiumAiError(statusCode, apiError?.code);
	if (!mapping) return undefined;
	const details = apiError?.message ? `RodiumAi: ${apiError.message}` : undefined;
	return {
		message: mapping.message,
		description: details ? `${mapping.description}\n${details}` : mapping.description,
	};
}

export function toRodiumAiError(node: INode, error: unknown, itemIndex?: number): NodeApiError {
	const statusCode = getStatusCode(error);
	const described = describeRodiumAiError(error);
	return new NodeApiError(node, error as JsonObject, {
		message: described?.message,
		description: described?.description,
		httpCode: statusCode !== undefined ? String(statusCode) : undefined,
		itemIndex,
	});
}

export const RODIUMAI_CREDENTIAL_TYPE = 'rodiumAiApi';

export const RODIUMAI_DEFAULT_BASE_URL = 'https://api.rodiumai.io/v1';

export const RODIUMAI_DASHBOARD_URL = 'https://www.rodiumai.io/dashboard';

export const RODIUMAI_DOCS_URL = 'https://www.rodiumai.io/docs';

export const RODIUMAI_REPOSITORY_URL = 'https://github.com/RodiumAi/n8n-nodes-rodiumai';

export const RODIUMAI_SUPPORT_EMAIL = 'support@rodiumai.io';

export const RODIUMAI_ATTRIBUTION_HEADERS: Record<string, string> = {
	'X-RodiumAi-Client': 'n8n',
};

/** LLM router that picks the best model for each request. Default model of both nodes. */
export const RODIUMAI_DEFAULT_MODEL = 'rodiumai/smart';

/**
 * Virtual routing models, in the order they are shown in model lists.
 * They only work with chat completions.
 */
export const RODIUMAI_ROUTING_MODELS = [
	'rodiumai/smart',
	'rodium/auto',
	'rodium/basic',
	'rodium/fast',
	'rodium/pro',
	'rodium/max',
];

import { RODIUMAI_DEFAULT_BASE_URL } from './constants';

/**
 * Normalizes the base URL stored in the credential:
 * trims whitespace and trailing slashes, falls back to the default.
 */
export function normalizeBaseUrl(raw: unknown): string {
	const value = typeof raw === 'string' ? raw.trim() : '';
	const url = value.length > 0 ? value : RODIUMAI_DEFAULT_BASE_URL;
	return url.replace(/\/+$/, '');
}

/**
 * Removes undefined values and non-positive max_tokens before sending a request.
 */
export function cleanBody<T extends Record<string, unknown>>(body: T): Partial<T> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(body)) {
		if (value === undefined) continue;
		if (key === 'max_tokens' && typeof value === 'number' && value <= 0) continue;
		result[key] = value;
	}
	return result as Partial<T>;
}

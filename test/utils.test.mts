import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RODIUMAI_DEFAULT_BASE_URL } from '../nodes/shared/constants';
import { cleanBody, normalizeBaseUrl } from '../nodes/shared/utils';

describe('normalizeBaseUrl', () => {
	it('falls back to the default URL when empty or not a string', () => {
		assert.equal(normalizeBaseUrl(''), RODIUMAI_DEFAULT_BASE_URL);
		assert.equal(normalizeBaseUrl('   '), RODIUMAI_DEFAULT_BASE_URL);
		assert.equal(normalizeBaseUrl(undefined), RODIUMAI_DEFAULT_BASE_URL);
		assert.equal(normalizeBaseUrl(42), RODIUMAI_DEFAULT_BASE_URL);
	});

	it('trims whitespace and trailing slashes', () => {
		assert.equal(normalizeBaseUrl('  https://example.com/v1//  '), 'https://example.com/v1');
		assert.equal(normalizeBaseUrl('https://example.com/v1'), 'https://example.com/v1');
	});
});

describe('cleanBody', () => {
	it('removes undefined values', () => {
		assert.deepEqual(cleanBody({ a: 1, b: undefined, c: null }), { a: 1, c: null });
	});

	it('removes non-positive max_tokens only', () => {
		assert.deepEqual(cleanBody({ max_tokens: -1 }), {});
		assert.deepEqual(cleanBody({ max_tokens: 0 }), {});
		assert.deepEqual(cleanBody({ max_tokens: 256 }), { max_tokens: 256 });
		assert.deepEqual(cleanBody({ temperature: 0 }), { temperature: 0 });
	});
});

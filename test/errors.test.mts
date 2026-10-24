import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { INode } from 'n8n-workflow';
import {
	describeRodiumAiError,
	getApiError,
	getStatusCode,
	mapRodiumAiError,
	toRodiumAiError,
} from '../nodes/shared/errors';

const node: INode = {
	id: '1',
	name: 'RodiumAi',
	type: 'n8n-nodes-rodiumai.rodiumAi',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function axiosLikeError(status: number, data: unknown) {
	return { message: `Request failed with status code ${status}`, response: { status, data } };
}

describe('getStatusCode', () => {
	it('reads the status from the different error shapes', () => {
		assert.equal(getStatusCode({ httpCode: '402' }), 402);
		assert.equal(getStatusCode({ statusCode: 429 }), 429);
		assert.equal(getStatusCode({ response: { status: 503 } }), 503);
		assert.equal(getStatusCode({ cause: { response: { status: 401 } } }), 401);
	});

	it('returns undefined when there is no status', () => {
		assert.equal(getStatusCode(new Error('boom')), undefined);
		assert.equal(getStatusCode(undefined), undefined);
		assert.equal(getStatusCode({ httpCode: 'abc' }), undefined);
	});
});

describe('getApiError', () => {
	it('reads the OpenAI error shape', () => {
		const error = axiosLikeError(402, {
			error: { message: 'Not enough RODI', type: 'insufficient_quota', code: 'insufficient_balance' },
		});
		assert.deepEqual(getApiError(error), {
			message: 'Not enough RODI',
			code: 'insufficient_balance',
			type: 'insufficient_quota',
		});
	});

	it('reads root-level fields (maintenance errors) and JSON strings', () => {
		assert.equal(getApiError({ response: { status: 503, data: { code: 'maintenance_active', message: 'Back soon' } } })?.code, 'maintenance_active');
		assert.equal(getApiError({ response: { status: 404, data: '{"error":{"message":"x","code":"model_not_found"}}' } })?.code, 'model_not_found');
	});

	it('looks inside wrapped errors', () => {
		assert.equal(getApiError({ cause: axiosLikeError(404, { error: { code: 'model_not_found' } }) })?.code, 'model_not_found');
	});

	it('returns undefined without a body', () => {
		assert.equal(getApiError(new Error('boom')), undefined);
	});
});

describe('mapRodiumAiError', () => {
	it('maps HTTP statuses', () => {
		assert.equal(mapRodiumAiError(400)?.message, 'Invalid request sent to RodiumAi');
		assert.equal(mapRodiumAiError(401)?.message, 'Invalid RodiumAi API key');
		assert.equal(mapRodiumAiError(402)?.message, 'Insufficient RODI balance');
		assert.equal(mapRodiumAiError(403)?.message, 'Access denied by RodiumAi');
		assert.equal(mapRodiumAiError(404)?.message, 'Model not found on RodiumAi');
		assert.equal(mapRodiumAiError(429)?.message, 'RodiumAi rate limit reached');
		assert.equal(mapRodiumAiError(500)?.message, 'RodiumAi server error');
		assert.equal(mapRodiumAiError(503)?.message, 'RodiumAi server error');
	});

	it('returns undefined for unknown statuses', () => {
		assert.equal(mapRodiumAiError(418), undefined);
		assert.equal(mapRodiumAiError(undefined), undefined);
	});

	it('prefers the RodiumAi error code over the status', () => {
		assert.equal(mapRodiumAiError(403, 'model_not_allowed')?.message, 'This API key cannot use this model');
		assert.equal(mapRodiumAiError(503, 'maintenance_active')?.message, 'RodiumAi is under maintenance');
		assert.equal(mapRodiumAiError(400, 'invalid_model_format')?.message, 'Invalid model ID');
		assert.equal(mapRodiumAiError(400, 'some_new_code')?.message, 'Invalid request sent to RodiumAi');
	});

	it('includes the top-up link for insufficient balance', () => {
		assert.match(mapRodiumAiError(402)?.description ?? '', /rodiumai\.io\/dashboard/);
	});
});

describe('describeRodiumAiError / toRodiumAiError', () => {
	it('appends the message returned by RodiumAi', () => {
		const error = axiosLikeError(404, { error: { message: "Model 'x/y' not found.", code: 'model_not_found' } });
		const described = describeRodiumAiError(error);
		assert.equal(described?.message, 'Model not found on RodiumAi');
		assert.match(described?.description ?? '', /RodiumAi: Model 'x\/y' not found\./);
	});

	it('builds a NodeApiError with the mapped message and HTTP code', () => {
		const error = toRodiumAiError(node, axiosLikeError(402, { error: { code: 'insufficient_balance' } }), 0);
		assert.equal(error.message, 'Insufficient RODI balance');
		assert.equal(error.httpCode, '402');
	});
});

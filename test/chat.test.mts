import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildChatBody, simplifyChatResponse } from '../nodes/RodiumAi/resources/chat';

const messages = [
	{ role: 'system', content: 'Be brief.' },
	{ role: 'user', content: 'Hello' },
];

describe('buildChatBody', () => {
	it('maps the options to the OpenAI fields and never streams', () => {
		const body = buildChatBody('rodiumai/smart', messages, {
			temperature: 0.2,
			topP: 0.9,
			frequencyPenalty: 0.5,
			presencePenalty: -0.5,
			maxTokens: 100,
		});
		assert.deepEqual(body, {
			model: 'rodiumai/smart',
			messages,
			stream: false,
			temperature: 0.2,
			top_p: 0.9,
			frequency_penalty: 0.5,
			presence_penalty: -0.5,
			max_tokens: 100,
		});
	});

	it('omits unset options and a max tokens of -1', () => {
		assert.deepEqual(buildChatBody('openai/gpt-4o-mini', messages, { maxTokens: -1 }), {
			model: 'openai/gpt-4o-mini',
			messages,
			stream: false,
		});
	});

	it('sets response_format only in JSON mode', () => {
		assert.deepEqual(buildChatBody('m/x', messages, { responseFormat: 'json_object' }).response_format, {
			type: 'json_object',
		});
		assert.equal(buildChatBody('m/x', messages, { responseFormat: 'text' }).response_format, undefined);
	});
});

describe('simplifyChatResponse', () => {
	const response = (content: unknown, extra: Record<string, unknown> = {}) => ({
		model: 'rodiumai/smart',
		choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
		usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
		...extra,
	});

	it('returns the text answer', () => {
		assert.deepEqual(simplifyChatResponse(response('Hi!'), false), {
			content: 'Hi!',
			model: 'rodiumai/smart',
			selected_model: 'rodiumai/smart',
			finish_reason: 'stop',
			usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
		});
	});

	it('exposes the model picked by smart routing', () => {
		const simplified = simplifyChatResponse(
			response('Hi!', { rodiumai_routing: { selected_model: 'google/gemini-2.5-flash' } }),
			false,
		);
		assert.equal(simplified.selected_model, 'google/gemini-2.5-flash');
	});

	it('parses valid JSON in JSON mode', () => {
		assert.deepEqual(simplifyChatResponse(response('{"a":1}'), true).content, { a: 1 });
	});

	it('keeps invalid JSON as a string', () => {
		assert.equal(simplifyChatResponse(response('not json'), true).content, 'not json');
	});

	it('handles an empty response', () => {
		const simplified = simplifyChatResponse({}, false);
		assert.equal(simplified.content, '');
		assert.equal(simplified.finish_reason, undefined);
	});
});

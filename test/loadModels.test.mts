import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isChatModel, toChatModelOptions, type RodiumAiModel } from '../nodes/shared/loadModels';

const textModel = (id: string, name: string, extra: Partial<RodiumAiModel> = {}): RodiumAiModel => ({
	id,
	rodiumai_display_name: name,
	rodiumai_provider: { slug: id.split('/')[0], name: id.split('/')[0].toUpperCase() },
	rodiumai_status: 'available',
	rodiumai_capabilities: { output_modalities: ['text'], supports_tools: true },
	...extra,
});

const models: RodiumAiModel[] = [
	textModel('openai/gpt-5.4-mini', 'GPT-5.4 Mini'),
	textModel('anthropic/claude-sonnet-4-6', 'Claude Sonnet 4.6'),
	textModel('openai/text-embedding-3-small', 'Embedding', {
		rodiumai_capabilities: { output_modalities: ['embedding'] },
	}),
	textModel('google/veo-3', 'Veo 3', { rodiumai_capabilities: { output_modalities: ['video'] } }),
	textModel('deepseek/old', 'Old', { rodiumai_status: 'unavailable' }),
	{ id: 'rodium/auto', rodiumai_display_name: 'Auto', rodiumai_kind: 'smart_profile', rodiumai_status: 'available' },
	{ id: 'rodiumai/smart', rodiumai_display_name: 'Smart', rodiumai_kind: 'smart_router', rodiumai_status: 'available' },
];

describe('isChatModel', () => {
	it('keeps available text models and routing models', () => {
		assert.equal(isChatModel(models[0]), true);
		assert.equal(isChatModel(models[5]), true);
	});

	it('drops embedding, video and unavailable models', () => {
		assert.equal(isChatModel(models[2]), false);
		assert.equal(isChatModel(models[3]), false);
		assert.equal(isChatModel(models[4]), false);
	});

	// Capability shapes copied from production GET /models (2026-10-16).
	const withCaps = (id: string, input: string[], output: string[]): RodiumAiModel => ({
		id,
		rodiumai_status: 'available',
		rodiumai_capabilities: { input_modalities: input, output_modalities: output },
	});

	it('drops image, speech, audio/realtime and transcription models', () => {
		const nonChat = [
			withCaps('openai/gpt-image-1.5', ['text', 'image'], ['text', 'image']),
			withCaps('google/gemini-3.1-flash-image', ['text', 'image'], ['text', 'image']),
			withCaps('openai/gpt-4o-mini-tts', ['text'], ['audio']),
			withCaps('openai/gpt-audio-mini', ['text', 'audio'], ['text', 'audio']),
			withCaps('openai/gpt-realtime-mini', ['text', 'audio', 'image'], ['text', 'audio']),
			withCaps('openai/gpt-4o-transcribe', ['audio'], ['text']),
			withCaps('openai/gpt-transcribe', ['audio', 'text'], ['text']),
			withCaps('google/gemini-3.5-transcribe', ['audio'], ['text']),
		];
		for (const model of nonChat) assert.equal(isChatModel(model), false, model.id);
	});

	it('keeps multimodal chat models that answer in text', () => {
		const chat = [
			withCaps('google/gemini-3.5-flash', ['text', 'image', 'document', 'audio', 'video'], ['text']),
			withCaps('anthropic/claude-sonnet-5-5', ['text', 'image', 'document'], ['text']),
			withCaps('mistral/voxtral-mini-3b-2507', ['text', 'audio'], ['text']),
			withCaps('meta/llama-3.3-70b-instruct', ['text'], ['text']),
		];
		for (const model of chat) assert.equal(isChatModel(model), true, model.id);
	});
});

describe('toChatModelOptions', () => {
	it('lists routing models first (smart, then auto), then the rest by name', () => {
		const options = toChatModelOptions(models);
		assert.deepEqual(
			options.map((o) => o.value),
			['rodiumai/smart', 'rodium/auto', 'anthropic/claude-sonnet-4-6', 'openai/gpt-5.4-mini'],
		);
	});

	it('describes the provider and tool support', () => {
		const option = toChatModelOptions(models).find((o) => o.value === 'openai/gpt-5.4-mini');
		assert.equal(option?.description, 'openai/gpt-5.4-mini · OPENAI · tools');
	});
});

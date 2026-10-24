<p align="center">
  <img src="https://raw.githubusercontent.com/RodiumAi/n8n-nodes-rodiumai/main/icons/rodiumai-monogram.svg" alt="RodiumAi" width="96" height="96">
</p>

# n8n-nodes-rodiumai

[![npm version](https://img.shields.io/npm/v/n8n-nodes-rodiumai.svg)](https://www.npmjs.com/package/n8n-nodes-rodiumai)
[![CI](https://github.com/RodiumAi/n8n-nodes-rodiumai/actions/workflows/ci.yml/badge.svg)](https://github.com/RodiumAi/n8n-nodes-rodiumai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

This is an n8n community node. It lets you use [RodiumAi](https://www.rodiumai.io) models in your n8n workflows: AI Agents, LLM chains and direct chat completions.

RodiumAi is an OpenAI-compatible AI platform. One API key and one RODI balance give access to models from OpenAI, Anthropic, Google, xAI, Meta, DeepSeek, Mistral, Qwen and more. You top up your balance with Mobile Money (MTN MoMo, Orange Money, Wave, Airtel Money, Moov Money, M-Pesa and others).

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Operations](#operations)
- [Credentials](#credentials)
- [Compatibility](#compatibility)
- [Usage](#usage)
- [Smart routing](#smart-routing)
- [Errors and troubleshooting](#errors-and-troubleshooting)
- [Resources](#resources)
- [Version history](#version-history)
- [Development](#development)
- [License](#license)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

**From the n8n editor** (recommended):

1. Go to **Settings › Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-rodiumai` and confirm.

**Manual install on a self-hosted instance** (see [manual installation](https://docs.n8n.io/integrations/community-nodes/installation/manual-install/)):

```bash
mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes
npm install n8n-nodes-rodiumai
```

Then restart n8n. The **RodiumAi** and **RodiumAi Chat Model** nodes appear in the nodes panel.

## Operations

This package contains one credential and two nodes.

### RodiumAi Chat Model

A language model sub-node. Connect it to the **Chat Model** input of an AI root node, such as the **AI Agent** or the **Basic LLM Chain**.

| Parameter | Description |
| --- | --- |
| Model | The model that answers. The list is loaded live from RodiumAi and only shows models that answer in text. Defaults to **Smart** (`rodiumai/smart`). |
| Sampling Temperature | Lower values give more deterministic answers. Default `0.7`. |
| Top P | Nucleus sampling. Change this or temperature, not both. |
| Frequency Penalty | Positive values reduce repetition. |
| Presence Penalty | Positive values encourage new topics. |
| Maximum Number of Tokens | Maximum tokens to generate. `-1` means no limit. |
| Timeout (Ms) | Maximum time a request may take. Default `360000`. |
| Max Retries | Retries on failure. Default `2`. |

Streaming and tool calling are supported. For an AI Agent with tools, pick a model marked `tools` in the list.

### RodiumAi

An action node to call RodiumAi directly from a workflow. It can also be used as a tool by an AI Agent.

| Resource | Operation | Description |
| --- | --- | --- |
| Chat | Create Completion | Send messages to a model and get its answer, as text or JSON. |
| Model | List Models | List the models available on RodiumAi, one item per model. |

**Chat › Create Completion**

| Parameter | Description |
| --- | --- |
| Model | Same list as the Chat Model. Defaults to **Smart**. |
| Messages | One or more messages, each with a role (`System`, `User` or `Assistant`) and a content. Expressions are supported. |
| Simplify Output | On by default. Returns `content`, `model`, `selected_model`, `finish_reason` and `usage`. Turn it off to get the full API response. |
| Options › Response Format | `Text` or `JSON Object`. With JSON, `content` is parsed into an object. Ask for JSON in your messages too. |
| Options › Temperature, Top P, penalties, Maximum Number of Tokens | Same as the Chat Model. |

Shape of a simplified output (values are placeholders):

```json
{
  "content": "<the model's answer>",
  "model": "<model returned by RodiumAi>",
  "selected_model": "<model that answered, when a routing model was used>",
  "finish_reason": "stop",
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 }
}
```

**Model › List Models**

| Parameter | Description |
| --- | --- |
| Chat Models Only | On by default. Returns only available models that answer in text. Turn it off to list every model (image, audio, video, embedding). |
| Return All / Limit | Return every model, or up to a limit (default `50`). |

Each item is a model as returned by `GET /v1/models`: `id`, `rodiumai_display_name`, `rodiumai_provider`, `rodiumai_capabilities`, `rodiumai_pricing`, `rodiumai_status` and more.

## Credentials

You need a RodiumAi account with a positive RODI balance and an API key.

1. Sign up at [rodiumai.io](https://www.rodiumai.io).
2. Top up your RODI balance with Mobile Money in the [dashboard](https://www.rodiumai.io/dashboard).
3. Create an API key in the dashboard. Keys start with `rd_sk_`.
4. In n8n, go to **Credentials › Add credential**, search for **RodiumAi API** and paste the key.

| Field | Description |
| --- | --- |
| API Key | Your RodiumAi key, starting with `rd_sk_`. Required. |
| Base URL | `https://api.rodiumai.io/v1`. Only change it if RodiumAi support asks you to. |

When you save the credential, n8n tests the key with an authenticated call to `GET /v1/wallet`.

The same credential is used by both nodes.

## Compatibility

- **RodiumAi Chat Model** requires n8n 2.16 or later, the first version that ships `@n8n/ai-node-sdk`. On older versions, the node shows an error asking you to update n8n.
- The package is built with `n8n-workflow` 2.43 and `@n8n/node-cli` 0.52.

## Usage

### Chat with an AI Agent

1. Add a **Chat Trigger** node.
2. Add an **AI Agent** node and connect it to the trigger.
3. On the agent's **Chat Model** input, add **RodiumAi Chat Model** and select your credential.
4. Keep the **Smart** model, or pick one marked `tools` if you add tools to the agent.
5. Optional: add tools such as **Calculator**, and a memory node.
6. Open the chat and send a message.

### Process items with the RodiumAi node

1. Add the **RodiumAi** node after any node that outputs items.
2. Choose **Chat › Create Completion**.
3. Add a `System` message with your instructions, and a `User` message with an expression such as `{{ $json.text }}`.
4. To get structured data, set **Options › Response Format** to `JSON Object` and describe the expected JSON in the system message.
5. The node runs once per input item. Read the answer from `content`.

### Example workflows

Import these files in n8n (**Workflows › Import from File**) and select your RodiumAi credential:

- [`examples/ai-agent-chat.json`](examples/ai-agent-chat.json): a chat with an AI Agent that uses the RodiumAi Chat Model and a Calculator tool.
- [`examples/batch-summary.json`](examples/batch-summary.json): summarizes several texts in one run with the RodiumAi node, in JSON mode.

## Smart routing

RodiumAi offers virtual models that pick a real model for each request. They work with chat completions only and are listed first in the model list.

| Model ID | How it picks |
| --- | --- |
| `rodiumai/smart` (default) | An LLM router reads the request and picks the best candidate. You pay for the router call plus the selected model. |
| `rodium/auto` | Quick heuristic: a vision model when the request has images, a coding model for code or tools, the highest tier for long or hard prompts (over 2,500 characters), otherwise the cheapest. |
| `rodium/basic` | The cheapest member of the profile, by RODI price. |
| `rodium/fast` | The fastest member of the profile. |
| `rodium/pro` | The first member by profile priority (balanced). |
| `rodium/max` | The highest quality tier. |

Profiles (`rodium/*`) only bill the selected model. Every candidate respects the models allowed for your API key.

In non-streamed responses, the model that answered is returned in `selected_model`. See the [smart routing guide](https://www.rodiumai.io/docs/guides/smart).

## Errors and troubleshooting

Errors from RodiumAi are turned into clear messages. Every error also shows the message returned by the API.

| Message in n8n | What to do |
| --- | --- |
| Invalid RodiumAi API key (401) | Check the key in your credential. It must start with `rd_sk_`. |
| Insufficient RODI balance (402) | Top up with Mobile Money in the [dashboard](https://www.rodiumai.io/dashboard). |
| Invalid model ID | Model IDs use the format `brand/model`, for example `openai/gpt-4o-mini`. |
| Model not found on RodiumAi (404) | Pick a model from the list. |
| This API key cannot use this model | Allow the model for this key in the dashboard, or pick another model. |
| API key quota exceeded | Raise the quota of this key in the dashboard, or use another key. |
| No model available for smart routing (403) | Allow more models for this key, or pick a specific model. |
| The conversation is too long for this model | Shorten the messages, or pick a model with a larger context window. |
| Request too large for RodiumAi (413) | Requests must stay under 10 MiB. Shorten the messages. |
| Invalid request sent to RodiumAi (400, 422) | Check the model ID, the messages and the options. |
| RodiumAi rate limit reached (429) | Wait and retry, or enable **Retry On Fail** in the node settings. |
| Model temporarily unavailable / RodiumAi is under maintenance / RodiumAi server error | Retry later, or pick another model. Contact support@rodiumai.io if it persists. |

Other common issues:

- **The model list is empty.** Check that the credential is valid and that n8n can reach `api.rodiumai.io`.
- **The AI Agent does not call its tools.** Pick a model marked `tools` in the list.
- **One failing item stops the workflow.** Enable **Continue On Fail** on the RodiumAi node: the error is returned in the item instead.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [RodiumAi documentation](https://www.rodiumai.io/docs)
- [RodiumAi authentication](https://www.rodiumai.io/docs/api/authentication)
- [RodiumAi API errors](https://www.rodiumai.io/docs/api/errors)
- [RodiumAi pricing](https://www.rodiumai.io/pricing)
- Support: [support@rodiumai.io](mailto:support@rodiumai.io) or [GitHub issues](https://github.com/RodiumAi/n8n-nodes-rodiumai/issues)

## Version history

See [CHANGELOG.md](CHANGELOG.md) for details.

| Version | Changes |
| --- | --- |
| 0.1.0 | First release: RodiumAi API credential, RodiumAi Chat Model sub-node, RodiumAi node (Chat › Create Completion, Model › List Models). |

## Development

Requirements: Node.js and npm.

```bash
git clone https://github.com/RodiumAi/n8n-nodes-rodiumai.git
cd n8n-nodes-rodiumai
npm install
npm run dev     # starts n8n on http://localhost:5678 with the nodes loaded
npm run lint    # n8n community node linter
npm test        # unit tests
npm run build   # compiles to dist/
```

Releases are published to npm from GitHub Actions with provenance. See [`.github/workflows/publish.yml`](.github/workflows/publish.yml).

## License

[MIT](LICENSE.md) © RodiumAi

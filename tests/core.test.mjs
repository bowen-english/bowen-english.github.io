import assert from "node:assert/strict";
import test from "node:test";

import {
  getOpenRouterChatRequestBody,
  getOpenRouterStreamChunkText,
  parseOpenRouterStreamEvent,
  splitOpenRouterModels,
  streamOpenRouterFromBrowser,
} from "../lib/openrouter-browser.ts";
import {
  extractJsonObject,
  parseCoachResponse,
  parseVoiceChoice,
} from "../lib/structured-responses.ts";

test("GPT-5.6 requests use medium reasoning and current token/session fields", () => {
  assert.deepEqual(
    getOpenRouterChatRequestBody({
      model: "openai/gpt-5.6-luna",
      messages: [{ role: "user", content: "Hello" }],
      temperature: 0.9,
      maxCompletionTokens: 2_048,
      sessionId: "chat-session-1",
    }),
    {
      model: "openai/gpt-5.6-luna",
      messages: [{ role: "user", content: "Hello" }],
      reasoning: { effort: "medium" },
      max_completion_tokens: 2_048,
      session_id: "chat-session-1",
    },
  );
});

test("model catalog separates dedicated speech output from other audio", () => {
  const base = {
    name: "Model",
    contextLength: null,
    promptPrice: null,
    completionPrice: null,
    inputModalities: ["text"],
    supportedVoices: [],
    supportsJson: false,
  };
  const catalog = splitOpenRouterModels([
    { ...base, id: "text", outputModalities: ["text"] },
    { ...base, id: "tts", outputModalities: ["speech"] },
    { ...base, id: "audio", outputModalities: ["audio"] },
  ]);

  assert.deepEqual(catalog.models.map((model) => model.id), ["text"]);
  assert.deepEqual(catalog.speechModels.map((model) => model.id), ["tts"]);
});

test("extractJsonObject removes surrounding prose and code fences", () => {
  assert.equal(
    extractJsonObject('```json\n{"severity":"none"}\n```'),
    '{"severity":"none"}',
  );
});

test("parseCoachResponse validates and normalizes a complete response", () => {
  const response = parseCoachResponse({
    raw: JSON.stringify({
      original: "  I go yesterday. ",
      corrected: " I went yesterday. ",
      natural: " I went there yesterday. ",
      issues: [" Past tense ", ""],
      explanationZh: " 应使用过去式。 ",
      pattern: " go → went ",
      severity: "major",
    }),
    messageId: "message-1",
    original: "I go yesterday.",
  });

  assert.deepEqual(response, {
    messageId: "message-1",
    original: "I go yesterday.",
    corrected: "I went yesterday.",
    natural: "I went there yesterday.",
    issues: ["Past tense"],
    explanation: "应使用过去式。",
    pattern: "go → went",
    severity: "major",
  });
});

test("parseCoachResponse rejects incomplete or invalid structured output", () => {
  assert.throws(() =>
    parseCoachResponse({
      raw: '{"corrected":"Hello","severity":"unknown"}',
      messageId: "message-2",
      original: "Hello",
    }),
  );
});

test("parseVoiceChoice is case-insensitive and safely falls back", () => {
  assert.equal(
    parseVoiceChoice({
      raw: '{"voice":"achird"}',
      allowedVoices: ["Achird", "Iapetus"],
      fallback: "Iapetus",
    }),
    "Achird",
  );
  assert.equal(
    parseVoiceChoice({
      raw: "not json",
      allowedVoices: ["Achird", "Iapetus"],
      fallback: "Iapetus",
    }),
    "Iapetus",
  );
});

test("stream chunks support string and multipart deltas", () => {
  assert.equal(
    getOpenRouterStreamChunkText({
      choices: [{ delta: { content: "Hello" } }],
    }),
    "Hello",
  );
  assert.equal(
    getOpenRouterStreamChunkText({
      choices: [
        {
          delta: {
            content: [{ text: "Hello" }, { type: "text", text: " world" }],
          },
        },
      ],
    }),
    "Hello world",
  );
});

test("SSE events parse deltas, completion, comments, and errors", () => {
  assert.deepEqual(
    parseOpenRouterStreamEvent(
      'data: {"choices":[{"delta":{"content":"Hi"}}]}',
    ),
    { done: false, delta: "Hi" },
  );
  assert.deepEqual(parseOpenRouterStreamEvent("data: [DONE]"), {
    done: true,
    delta: "",
  });
  assert.deepEqual(parseOpenRouterStreamEvent(": keep-alive"), {
    done: false,
    delta: "",
  });
  assert.throws(
    () =>
      parseOpenRouterStreamEvent(
        'data: {"error":{"message":"Provider failed"}}',
      ),
    /Provider failed/,
  );
});

test("streaming chat merges split SSE frames and reports progressive content", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const encoder = new TextEncoder();
  const chunks = [
    'data: {"choices":[{"delta":{"content":"Hello"}}]}\r',
    '\n\r\n',
    'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
    "data: [DONE]\n\n",
  ];
  let requestBody;

  globalThis.window = {
    clearTimeout,
    location: { origin: "http://localhost" },
    setTimeout,
  };
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));

    return new Response(
      new ReadableStream({
        start(controller) {
          chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
          controller.close();
        },
      }),
      { status: 200 },
    );
  };

  try {
    const updates = [];
    const content = await streamOpenRouterFromBrowser({
      apiKey: "test-key",
      model: "openai/gpt-5.6-luna",
      messages: [{ role: "user", content: "Say hello" }],
      maxCompletionTokens: 2_048,
      onDelta(delta, accumulated) {
        updates.push({ delta, accumulated });
      },
    });

    assert.equal(content, "Hello world");
    assert.deepEqual(updates, [
      { delta: "Hello", accumulated: "Hello" },
      { delta: " world", accumulated: "Hello world" },
    ]);
    assert.equal(requestBody.stream, true);
    assert.deepEqual(requestBody.reasoning, { effort: "medium" });
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

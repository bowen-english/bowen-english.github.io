import type { OpenRouterModel } from "@/lib/types";

export type BrowserOpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type RawOpenRouterModel = {
  id: string;
  name?: string;
  context_length?: number | null;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  } | null;
  pricing?: {
    prompt?: string;
    completion?: string;
  } | null;
  supported_parameters?: string[];
};

const GPT_5_6_BASE_MODELS = new Set([
  "openai/gpt-5.6-sol",
  "openai/gpt-5.6-terra",
  "openai/gpt-5.6-luna",
]);
const GEMINI_TTS_MODEL = "google/gemini-3.1-flash-tts-preview";

function getErrorMessage(data: unknown, fallback: string) {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "object" &&
    data.error !== null &&
    "message" in data.error &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  return fallback;
}

function normalizeModel(model: RawOpenRouterModel): OpenRouterModel {
  return {
    id: model.id,
    name: model.name ?? model.id,
    contextLength: model.context_length ?? null,
    promptPrice: model.pricing?.prompt ?? null,
    completionPrice: model.pricing?.completion ?? null,
    inputModalities: model.architecture?.input_modalities ?? [],
    outputModalities: model.architecture?.output_modalities ?? [],
    supportsJson: model.supported_parameters?.includes("response_format") ?? false,
  };
}

export async function callOpenRouterFromBrowser({
  apiKey,
  model,
  messages,
  temperature,
  responseFormat,
}: {
  apiKey: string;
  model: string;
  messages: BrowserOpenRouterMessage[];
  temperature?: number;
  responseFormat?: { type: "json_object" };
}) {
  if (!apiKey.trim()) {
    throw new Error("OpenRouter API key is not configured.");
  }

  if (!model.trim()) {
    throw new Error("Model name is not configured.");
  }

  const normalizedModel = model.trim();
  const isGpt56BaseModel = GPT_5_6_BASE_MODELS.has(normalizedModel);
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "English Shadow Coach",
    },
    body: JSON.stringify({
      model: normalizedModel,
      messages,
      ...(isGpt56BaseModel
        ? { reasoning: { effort: "none" } }
        : temperature !== undefined
          ? { temperature }
          : {}),
      ...(responseFormat ? { response_format: responseFormat } : {}),
    }),
  });
  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data, `OpenRouter request failed (${response.status}).`),
    );
  }

  const content =
    typeof data === "object" &&
    data !== null &&
    "choices" in data &&
    Array.isArray(data.choices) &&
    typeof data.choices[0]?.message?.content === "string"
      ? data.choices[0].message.content.trim()
      : "";

  if (!content) {
    throw new Error("OpenRouter returned an empty message.");
  }

  return content;
}

export async function callOpenRouterSpeechFromBrowser({
  apiKey,
  model,
  input,
  voice,
  instructions,
}: {
  apiKey: string;
  model: string;
  input: string;
  voice: string;
  instructions?: string;
}) {
  if (!apiKey.trim()) {
    throw new Error("OpenRouter API key is not configured.");
  }

  if (!model.trim()) {
    throw new Error("TTS model name is not configured.");
  }

  if (!voice.trim()) {
    throw new Error("TTS voice is not configured.");
  }

  if (!input.trim()) {
    throw new Error("There is no text to speak.");
  }

  const normalizedModel = model.trim();
  const isGeminiTts = normalizedModel === GEMINI_TTS_MODEL;
  const speechInput =
    isGeminiTts && instructions
      ? `${instructions}

Read exactly the following text without adding or omitting words:
${input}`
      : input;
  const response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "English Shadow Coach",
    },
    body: JSON.stringify({
      model: normalizedModel,
      input: speechInput,
      voice,
      response_format: "mp3",
      ...(instructions && !isGeminiTts
        ? {
            provider: {
              options: {
                openai: {
                  instructions,
                },
              },
            },
          }
        : {}),
    }),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? ((await response.json().catch(() => null)) as unknown)
      : await response.text().catch(() => "");

    throw new Error(
      typeof data === "string" && data.trim()
        ? data
        : getErrorMessage(
            data,
            `OpenRouter TTS request failed (${response.status}).`,
          ),
    );
  }

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new Error("OpenRouter returned empty audio.");
  }

  return blob;
}

async function fetchModelEndpoint({
  apiKey,
  endpoint,
}: {
  apiKey: string;
  endpoint: "models" | "models/user";
}) {
  const response = await fetch(`https://openrouter.ai/api/v1/${endpoint}`, {
    headers: {
      ...(apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
      "HTTP-Referer": window.location.origin,
      "X-Title": "English Shadow Coach",
    },
  });
  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        data,
        `OpenRouter ${endpoint} request failed (${response.status}).`,
      ),
    );
  }

  const rawModels =
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    Array.isArray(data.data)
      ? (data.data as RawOpenRouterModel[])
      : [];

  return rawModels
    .map(normalizeModel)
    .filter((model) => model.outputModalities.includes("text"))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function fetchOpenRouterModelsFromBrowser(apiKey: string) {
  if (apiKey.trim()) {
    try {
      return {
        source: "user" as const,
        models: await fetchModelEndpoint({ apiKey, endpoint: "models/user" }),
      };
    } catch (error) {
      return {
        source: "public" as const,
        warning:
          error instanceof Error
            ? error.message
            : "Failed to load account models; showing public models.",
        models: await fetchModelEndpoint({ apiKey: "", endpoint: "models" }),
      };
    }
  }

  return {
    source: "public" as const,
    models: await fetchModelEndpoint({ apiKey: "", endpoint: "models" }),
  };
}

import type { OpenRouterModel } from "@/lib/types";

export type BrowserOpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenRouterCreditSummary = {
  accountBalance: number | null;
  accountBalanceStatus:
    | "available"
    | "management_key_required"
    | "unavailable";
  accountUsage: number | null;
  totalCredits: number | null;
  keyLimit: number | null;
  keyLimitRemaining: number | null;
  keyLimitReset: string | null;
  keyUsage: number | null;
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
const GEMINI_TTS_SAMPLE_RATE = 24_000;
const GEMINI_TTS_CHANNELS = 1;
const GEMINI_TTS_BITS_PER_SAMPLE = 16;

export function isGeminiTtsModel(model: string) {
  const normalizedModel = model.toLowerCase();
  return normalizedModel.startsWith("google/gemini-") &&
    normalizedModel.includes("-tts");
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function wrapPcm16InWav(pcmBuffer: ArrayBuffer) {
  const headerSize = 44;
  const wavBuffer = new ArrayBuffer(headerSize + pcmBuffer.byteLength);
  const view = new DataView(wavBuffer);
  const bytesPerSample = GEMINI_TTS_BITS_PER_SAMPLE / 8;
  const blockAlign = GEMINI_TTS_CHANNELS * bytesPerSample;
  const byteRate = GEMINI_TTS_SAMPLE_RATE * blockAlign;

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmBuffer.byteLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, GEMINI_TTS_CHANNELS, true);
  view.setUint32(24, GEMINI_TTS_SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, GEMINI_TTS_BITS_PER_SAMPLE, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, pcmBuffer.byteLength, true);
  new Uint8Array(wavBuffer, headerSize).set(new Uint8Array(pcmBuffer));

  return new Blob([wavBuffer], { type: "audio/wav" });
}

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

function getDataObject(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    typeof data.data === "object" &&
    data.data !== null
  ) {
    return data.data as Record<string, unknown>;
  }

  return null;
}

function getFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function fetchOpenRouterCreditSummaryFromBrowser(apiKey: string) {
  const normalizedApiKey = apiKey.trim();

  if (!normalizedApiKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const headers = {
    Authorization: `Bearer ${normalizedApiKey}`,
    "HTTP-Referer": window.location.origin,
    "X-Title": "English Shadow Coach",
  };
  const [creditsResult, keyResult] = await Promise.allSettled([
    fetch("https://openrouter.ai/api/v1/credits", { headers }),
    fetch("https://openrouter.ai/api/v1/key", { headers }),
  ]);
  const creditsResponse =
    creditsResult.status === "fulfilled" ? creditsResult.value : null;
  const keyResponse = keyResult.status === "fulfilled" ? keyResult.value : null;
  const [creditsPayload, keyPayload] = await Promise.all([
    creditsResponse
      ? (creditsResponse.json().catch(() => null) as Promise<unknown>)
      : Promise.resolve(null),
    keyResponse
      ? (keyResponse.json().catch(() => null) as Promise<unknown>)
      : Promise.resolve(null),
  ]);

  if (!creditsResponse?.ok && !keyResponse?.ok) {
    throw new Error(
      getErrorMessage(
        keyPayload ?? creditsPayload,
        `OpenRouter balance request failed (${keyResponse?.status ?? creditsResponse?.status ?? "network error"}).`,
      ),
    );
  }

  const credits = creditsResponse?.ok ? getDataObject(creditsPayload) : null;
  const key = keyResponse?.ok ? getDataObject(keyPayload) : null;
  const totalCredits = getFiniteNumber(credits?.total_credits);
  const accountUsage = getFiniteNumber(credits?.total_usage);

  return {
    accountBalance:
      totalCredits !== null && accountUsage !== null
        ? totalCredits - accountUsage
        : null,
    accountBalanceStatus: creditsResponse?.ok
      ? ("available" as const)
      : creditsResponse?.status === 403
        ? ("management_key_required" as const)
        : ("unavailable" as const),
    accountUsage,
    totalCredits,
    keyLimit: getFiniteNumber(key?.limit),
    keyLimitRemaining: getFiniteNumber(key?.limit_remaining),
    keyLimitReset: typeof key?.limit_reset === "string" ? key.limit_reset : null,
    keyUsage: getFiniteNumber(key?.usage),
  } satisfies OpenRouterCreditSummary;
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
  const isGeminiTts = isGeminiTtsModel(normalizedModel);
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
      response_format: isGeminiTts ? "pcm" : "mp3",
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

  return isGeminiTts ? wrapPcm16InWav(await blob.arrayBuffer()) : blob;
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

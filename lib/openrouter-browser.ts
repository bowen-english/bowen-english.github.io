import type { OpenRouterModel } from "@/lib/types";

export type BrowserOpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterChatRequest = {
  apiKey: string;
  model: string;
  messages: BrowserOpenRouterMessage[];
  temperature?: number;
  responseFormat?: { type: "json_object" };
  maxCompletionTokens?: number;
  sessionId?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
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
  supported_voices?: string[] | null;
};

const OPENROUTER_API_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_APP_TITLE = "English Shadow Coach";
const DEFAULT_TEXT_TIMEOUT_MS = 60_000;
const DEFAULT_SPEECH_TIMEOUT_MS = 90_000;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const GPT_5_6_BASE_MODELS = new Set([
  "openai/gpt-5.6-sol",
  "openai/gpt-5.6-terra",
  "openai/gpt-5.6-luna",
]);
type PcmAudioFormat = {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
};

// Raw PCM has no self-describing header, so only wrap models whose documented
// output format is known. Other TTS models request MP3 and remain playable
// without guessing their sample rate.
const PCM_AUDIO_FORMATS: Record<string, PcmAudioFormat> = {
  "google/gemini-3.1-flash-tts-preview": {
    sampleRate: 24_000,
    channels: 1,
    bitsPerSample: 16,
  },
};

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

function wrapPcmInWav(pcmBuffer: ArrayBuffer, format: PcmAudioFormat) {
  const headerSize = 44;
  const wavBuffer = new ArrayBuffer(headerSize + pcmBuffer.byteLength);
  const view = new DataView(wavBuffer);
  const bytesPerSample = format.bitsPerSample / 8;
  const blockAlign = format.channels * bytesPerSample;
  const byteRate = format.sampleRate * blockAlign;

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmBuffer.byteLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, format.channels, true);
  view.setUint32(24, format.sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, format.bitsPerSample, true);
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

function getRetryDelayMs(response: Response, attempt: number) {
  const retryAfter = response.headers.get("retry-after");

  if (retryAfter) {
    const seconds = Number.parseFloat(retryAfter);

    if (Number.isFinite(seconds)) {
      return Math.min(Math.max(seconds * 1000, 250), 8_000);
    }

    const retryAt = Date.parse(retryAfter);

    if (Number.isFinite(retryAt)) {
      return Math.min(Math.max(retryAt - Date.now(), 250), 8_000);
    }
  }

  return Math.min(500 * 2 ** attempt + Math.random() * 200, 4_000);
}

function createRequestContext(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const abortFromCaller = () => {
    controller.abort(
      signal?.reason ?? new DOMException("Request cancelled.", "AbortError"),
    );
  };

  if (signal?.aborted) {
    abortFromCaller();
  } else {
    signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeout = window.setTimeout(() => {
    controller.abort(new Error("OpenRouter request timed out. Please try again."));
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromCaller);
    },
  };
}

function waitForRetry(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    let timeout = 0;
    const handleAbort = () => {
      window.clearTimeout(timeout);
      reject(signal.reason);
    };
    const finish = () => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    };

    timeout = window.setTimeout(finish, delayMs);

    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  {
    signal,
    retries = 2,
  }: {
    signal: AbortSignal;
    retries?: number;
  },
) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (signal.aborted) {
      throw signal.reason;
    }

    try {
      const response = await fetch(input, { ...init, signal });

      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === retries) {
        return response;
      }

      const delay = getRetryDelayMs(response, attempt);
      await response.body?.cancel().catch(() => undefined);
      await waitForRetry(delay, signal);
    } catch (error) {
      if (signal.aborted) {
        throw signal.reason ?? error;
      }

      lastError = error;

      if (attempt === retries) {
        throw error;
      }

      await waitForRetry(500 * 2 ** attempt, signal);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("OpenRouter request failed.");
}

export function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
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

export async function fetchOpenRouterCreditSummaryFromBrowser(
  apiKey: string,
  { signal }: { signal?: AbortSignal } = {},
) {
  const normalizedApiKey = apiKey.trim();

  if (!normalizedApiKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const headers = {
    Authorization: `Bearer ${normalizedApiKey}`,
    "HTTP-Referer": window.location.origin,
    "X-Title": OPENROUTER_APP_TITLE,
  };
  const request = createRequestContext(signal, 20_000);

  try {
    const [creditsResult, keyResult] = await Promise.allSettled([
      fetchWithRetry(
        `${OPENROUTER_API_BASE_URL}/credits`,
        { headers },
        { signal: request.signal, retries: 1 },
      ),
      fetchWithRetry(
        `${OPENROUTER_API_BASE_URL}/key`,
        { headers },
        { signal: request.signal, retries: 1 },
      ),
    ]);
    const creditsResponse =
      creditsResult.status === "fulfilled" ? creditsResult.value : null;
    const keyResponse =
      keyResult.status === "fulfilled" ? keyResult.value : null;
    const [creditsPayload, keyPayload] = await Promise.all([
      creditsResponse
        ? (creditsResponse.json().catch(() => null) as Promise<unknown>)
        : Promise.resolve(null),
      keyResponse
        ? (keyResponse.json().catch(() => null) as Promise<unknown>)
        : Promise.resolve(null),
    ]);

    if (!creditsResponse?.ok && !keyResponse?.ok) {
      if (request.signal.aborted) {
        throw request.signal.reason;
      }

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
      keyLimitReset:
        typeof key?.limit_reset === "string" ? key.limit_reset : null,
      keyUsage: getFiniteNumber(key?.usage),
    } satisfies OpenRouterCreditSummary;
  } finally {
    request.cleanup();
  }
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
    supportedVoices: model.supported_voices ?? [],
    supportsJson:
      model.supported_parameters?.some(
        (parameter) =>
          parameter === "response_format" || parameter === "structured_outputs",
      ) ?? false,
  };
}

export function getOpenRouterChatRequestBody({
  model,
  messages,
  temperature,
  responseFormat,
  maxCompletionTokens,
  sessionId,
}: Omit<OpenRouterChatRequest, "apiKey" | "signal" | "timeoutMs">) {
  const normalizedModel = model.trim();
  const isGpt56BaseModel = GPT_5_6_BASE_MODELS.has(normalizedModel);

  return {
    model: normalizedModel,
    messages,
    ...(isGpt56BaseModel
      ? { reasoning: { effort: "medium" } }
      : temperature !== undefined
        ? { temperature }
        : {}),
    ...(responseFormat ? { response_format: responseFormat } : {}),
    ...(maxCompletionTokens
      ? { max_completion_tokens: maxCompletionTokens }
      : {}),
    ...(sessionId?.trim() ? { session_id: sessionId.trim().slice(0, 256) } : {}),
  };
}

function getOpenRouterHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
    "HTTP-Referer": window.location.origin,
    "X-Title": OPENROUTER_APP_TITLE,
  };
}

function validateChatRequest({ apiKey, model }: OpenRouterChatRequest) {
  if (!apiKey.trim()) {
    throw new Error("OpenRouter API key is not configured.");
  }

  if (!model.trim()) {
    throw new Error("Model name is not configured.");
  }
}

export async function callOpenRouterFromBrowser({
  apiKey,
  model,
  messages,
  temperature,
  responseFormat,
  maxCompletionTokens,
  sessionId,
  signal,
  timeoutMs = DEFAULT_TEXT_TIMEOUT_MS,
}: OpenRouterChatRequest) {
  validateChatRequest({ apiKey, model, messages, temperature, responseFormat });
  const request = createRequestContext(signal, timeoutMs);

  try {
    const response = await fetchWithRetry(
      `${OPENROUTER_API_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: getOpenRouterHeaders(apiKey),
        body: JSON.stringify(
          getOpenRouterChatRequestBody({
            model,
            messages,
            temperature,
            responseFormat,
            maxCompletionTokens,
            sessionId,
          }),
        ),
      },
      { signal: request.signal, retries: 1 },
    );
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
  } finally {
    request.cleanup();
  }
}

export function getOpenRouterStreamChunkText(data: unknown) {
  if (
    typeof data !== "object" ||
    data === null ||
    !("choices" in data) ||
    !Array.isArray(data.choices)
  ) {
    return "";
  }

  const content = data.choices[0]?.delta?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof part.text === "string"
          ? part.text
          : "",
      )
      .join("");
  }

  return "";
}

export function parseOpenRouterStreamEvent(event: string) {
  const dataText = event
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();

  if (!dataText) {
    return { done: false, delta: "" };
  }

  if (dataText === "[DONE]") {
    return { done: true, delta: "" };
  }

  const data = JSON.parse(dataText) as unknown;

  if (typeof data === "object" && data !== null && "error" in data) {
    throw new Error(getErrorMessage(data, "OpenRouter stream failed."));
  }

  return { done: false, delta: getOpenRouterStreamChunkText(data) };
}

export async function streamOpenRouterFromBrowser({
  apiKey,
  model,
  messages,
  temperature,
  maxCompletionTokens,
  sessionId,
  signal,
  timeoutMs = DEFAULT_TEXT_TIMEOUT_MS,
  onDelta,
}: Omit<OpenRouterChatRequest, "responseFormat"> & {
  onDelta?: (delta: string, content: string) => void;
}) {
  validateChatRequest({ apiKey, model, messages, temperature });
  const request = createRequestContext(signal, timeoutMs);

  try {
    const response = await fetchWithRetry(
      `${OPENROUTER_API_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: getOpenRouterHeaders(apiKey),
        body: JSON.stringify({
          ...getOpenRouterChatRequestBody({
            model,
            messages,
            temperature,
            maxCompletionTokens,
            sessionId,
          }),
          stream: true,
        }),
      },
      { signal: request.signal, retries: 1 },
    );

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as unknown;
      throw new Error(
        getErrorMessage(data, `OpenRouter request failed (${response.status}).`),
      );
    }

    if (!response.body) {
      throw new Error("OpenRouter did not return a readable stream.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let streamFinished = false;

    const processEvent = (event: string) => {
      const parsed = parseOpenRouterStreamEvent(event);

      if (parsed.done) {
        streamFinished = true;
        return;
      }

      if (parsed.delta) {
        content += parsed.delta;
        onDelta?.(parsed.delta, content);
      }
    };

    while (!streamFinished) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      // Normalize after concatenation so CRLF split across network chunks is
      // handled correctly as well.
      buffer = buffer.replaceAll("\r\n", "\n");

      let boundary = buffer.indexOf("\n\n");

      while (boundary !== -1) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        processEvent(event);
        boundary = buffer.indexOf("\n\n");
      }

      if (done) {
        if (buffer.trim()) {
          processEvent(buffer);
        }
        break;
      }
    }

    const normalizedContent = content.trim();

    if (!normalizedContent) {
      throw new Error("OpenRouter returned an empty message.");
    }

    return normalizedContent;
  } finally {
    request.cleanup();
  }
}

export async function callOpenRouterSpeechFromBrowser({
  apiKey,
  model,
  input,
  voice,
  instructions,
  signal,
  timeoutMs = DEFAULT_SPEECH_TIMEOUT_MS,
}: {
  apiKey: string;
  model: string;
  input: string;
  voice: string;
  instructions?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
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
  const pcmFormat = PCM_AUDIO_FORMATS[normalizedModel.toLowerCase()];
  const speechInput =
    isGeminiTts && instructions
      ? `${instructions}

Read exactly the following text without adding or omitting words:
${input}`
      : input;
  const request = createRequestContext(signal, timeoutMs);

  try {
    const response = await fetchWithRetry(
      `${OPENROUTER_API_BASE_URL}/audio/speech`,
      {
        method: "POST",
        headers: getOpenRouterHeaders(apiKey),
        body: JSON.stringify({
          model: normalizedModel,
          input: speechInput,
          voice,
          response_format: pcmFormat ? "pcm" : "mp3",
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
      },
      { signal: request.signal, retries: 1 },
    );

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

    return pcmFormat
      ? wrapPcmInWav(await blob.arrayBuffer(), pcmFormat)
      : blob;
  } finally {
    request.cleanup();
  }
}

type OpenRouterModelCatalog = {
  source: "user" | "public";
  models: OpenRouterModel[];
  speechModels: OpenRouterModel[];
  warning?: string;
};

const MODEL_CATALOG_CACHE_PREFIX = "english-shadow-coach.model-catalog.v2";
const MODEL_CATALOG_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function getApiKeyFingerprint(apiKey: string) {
  let hash = 2166136261;

  for (let index = 0; index < apiKey.length; index += 1) {
    hash ^= apiKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function getModelCatalogCacheKey(apiKey: string) {
  return `${MODEL_CATALOG_CACHE_PREFIX}:${
    apiKey.trim() ? `user-${getApiKeyFingerprint(apiKey.trim())}` : "public"
  }`;
}

function readModelCatalogCache(apiKey: string) {
  try {
    const raw = window.sessionStorage.getItem(getModelCatalogCacheKey(apiKey));

    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as {
      savedAt?: unknown;
      catalog?: unknown;
    };

    if (
      typeof cached.savedAt !== "number" ||
      Date.now() - cached.savedAt > MODEL_CATALOG_CACHE_TTL_MS ||
      !cached.catalog ||
      typeof cached.catalog !== "object"
    ) {
      return null;
    }

    const catalog = cached.catalog as OpenRouterModelCatalog;

    return Array.isArray(catalog.models) && Array.isArray(catalog.speechModels)
      ? catalog
      : null;
  } catch {
    return null;
  }
}

function writeModelCatalogCache(
  apiKey: string,
  catalog: OpenRouterModelCatalog,
) {
  try {
    window.sessionStorage.setItem(
      getModelCatalogCacheKey(apiKey),
      JSON.stringify({ savedAt: Date.now(), catalog }),
    );
  } catch {
    // Catalog caching is optional when sessionStorage is unavailable.
  }
}

export function splitOpenRouterModels(models: OpenRouterModel[]) {
  return {
    models: models.filter((model) => model.outputModalities.includes("text")),
    speechModels: models.filter((model) =>
      model.outputModalities.includes("speech"),
    ),
  };
}

async function fetchModelEndpoint({
  apiKey,
  endpoint,
  signal,
}: {
  apiKey: string;
  endpoint: "models" | "models/user";
  signal?: AbortSignal;
}) {
  const url = new URL(`${OPENROUTER_API_BASE_URL}/${endpoint}`);
  // The Models API defaults to text-only. `all` keeps text + dedicated speech
  // discovery in one lazy, cacheable request.
  url.searchParams.set("output_modalities", "all");
  const request = createRequestContext(signal, 20_000);

  try {
    const response = await fetchWithRetry(
      url,
      {
        headers: {
          ...(apiKey.trim()
            ? { Authorization: `Bearer ${apiKey.trim()}` }
            : {}),
          "HTTP-Referer": window.location.origin,
          "X-Title": OPENROUTER_APP_TITLE,
        },
      },
      { signal: request.signal, retries: 1 },
    );
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
      .sort((left, right) => left.name.localeCompare(right.name));
  } finally {
    request.cleanup();
  }
}

export async function fetchOpenRouterModelsFromBrowser(
  apiKey: string,
  {
    force = false,
    signal,
  }: { force?: boolean; signal?: AbortSignal } = {},
) {
  if (!force) {
    const cached = readModelCatalogCache(apiKey);

    if (cached) {
      return cached;
    }
  }

  if (apiKey.trim()) {
    try {
      const accountModels = await fetchModelEndpoint({
        apiKey,
        endpoint: "models/user",
        signal,
      });
      const catalog = {
        source: "user" as const,
        ...splitOpenRouterModels(accountModels),
      };

      writeModelCatalogCache(apiKey, catalog);
      return catalog;
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      const accountWarning =
        error instanceof Error
          ? error.message
          : "Failed to load account models; showing public models.";
      const publicModels = await fetchModelEndpoint({
        apiKey: "",
        endpoint: "models",
        signal,
      });
      const catalog = {
        source: "public" as const,
        warning: accountWarning,
        ...splitOpenRouterModels(publicModels),
      };

      writeModelCatalogCache(apiKey, catalog);
      return catalog;
    }
  }

  const publicModels = await fetchModelEndpoint({
    apiKey: "",
    endpoint: "models",
    signal,
  });
  const catalog = {
    source: "public" as const,
    ...splitOpenRouterModels(publicModels),
  };

  writeModelCatalogCache(apiKey, catalog);
  return catalog;
}

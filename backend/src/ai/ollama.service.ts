import { AppError } from "@/middlewares/error.middleware";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
const MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";

async function fetchWithTimeout(url: string, options: any, timeoutMs = 120000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new AppError("AI assistant request timed out — local model is taking too long to respond", 504);
    }
    throw new AppError("AI assistant is unavailable — make sure Ollama is running locally with the correct model (e.g. `ollama run qwen3:8b`)", 503);
  }
}

export async function askOllama(prompt: string) {
  const response = await fetchWithTimeout(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new AppError(`Ollama returned status ${response.status}`, 500);
  }

  const data = (await response.json()) as any;
  return data.message.content;
}

export async function chatOllama(messages: { role: string; content: string }[], jsonMode: boolean = false) {
  const response = await fetchWithTimeout(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      ...(jsonMode ? { format: "json" } : {}),
      options: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new AppError(`Ollama returned status ${response.status}`, 500);
  }

  const data = (await response.json()) as any;
  return data.message.content;
}

/**
 * Streaming variant — returns the raw fetch Response with stream: true.
 * The caller is responsible for consuming the body as an NDJSON stream.
 * Uses a longer timeout (120 s) because the first token can be slow on
 * a cold local GPU.
 */
export async function streamChatOllama(
  messages: { role: string; content: string }[],
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  // 120 s — streaming responses can start slowly on local hardware
  const id = setTimeout(() => controller.abort(), 120_000);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        options: {
          temperature: 0.2,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok) {
      throw new AppError(`Ollama returned status ${response.status}`, 500);
    }

    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new AppError("AI assistant request timed out — local model is taking too long to respond", 504);
    }
    // Re-throw AppError instances as-is
    if (error instanceof AppError) throw error;
    throw new AppError("AI assistant is unavailable — make sure Ollama is running locally with the correct model (e.g. `ollama run qwen3:8b`)", 503);
  }
}
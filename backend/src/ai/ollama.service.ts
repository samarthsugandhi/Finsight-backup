import { AppError } from "@/middlewares/error.middleware";

// Local Ollama defaults
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
const MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";

/**
 * Cloud Provider Resolution
 * Allows zero-cost, high-speed cloud LLMs (Groq, Gemini, OpenAI) in production
 * while falling back to local Ollama in offline / local development.
 */
function getCloudConfig() {
  if (process.env.GROQ_API_KEY) {
    return {
      provider: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    };
  }
  if (process.env.GEMINI_API_KEY) {
    return {
      provider: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };
  }
  return null;
}

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
      throw new AppError("AI assistant request timed out — model is taking too long to respond", 504);
    }
    throw new AppError(
      "AI assistant is unavailable — make sure Ollama is running locally (e.g. `ollama run qwen3:8b`) or set GROQ_API_KEY / GEMINI_API_KEY in environment variables",
      503
    );
  }
}

export async function askOllama(prompt: string) {
  const cloud = getCloudConfig();
  if (cloud) {
    const res = await fetchWithTimeout(
      cloud.url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cloud.apiKey}`,
        },
        body: JSON.stringify({
          model: cloud.model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        }),
      },
      60_000
    );

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new AppError(`AI cloud provider (${cloud.provider}) returned status ${res.status}: ${err}`, 500);
    }

    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content || "";
  }

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
  const cloud = getCloudConfig();
  if (cloud) {
    const res = await fetchWithTimeout(
      cloud.url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cloud.apiKey}`,
        },
        body: JSON.stringify({
          model: cloud.model,
          messages,
          stream: false,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          temperature: 0.1,
        }),
      },
      60_000
    );

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new AppError(`AI cloud provider (${cloud.provider}) returned status ${res.status}: ${err}`, 500);
    }

    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content || "";
  }

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
 * Streams chat completions from OpenAI-compatible cloud providers (Groq, Gemini, OpenAI)
 * and transforms SSE into NDJSON matching Ollama's stream contract.
 */
async function streamCloudOpenAI(
  apiUrl: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 120_000);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new AppError("AI cloud provider request timed out", 504);
    }
    throw new AppError(`Failed to connect to AI cloud provider: ${error.message}`, 503);
  }

  clearTimeout(id);

  if (!upstreamRes.ok) {
    const errText = await upstreamRes.text().catch(() => "");
    throw new AppError(`AI cloud provider returned status ${upstreamRes.status}: ${errText}`, 500);
  }

  if (!upstreamRes.body) {
    throw new AppError("AI cloud provider returned empty stream", 500);
  }

  const upstreamReader = upstreamRes.body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controllerStream) {
      let buffer = "";
      try {
        while (true) {
          if (controller.signal.aborted) {
            upstreamReader.cancel().catch(() => {});
            break;
          }

          const { done, value } = await upstreamReader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const dataStr = trimmed.replace(/^data:\s*/, "");
            if (dataStr === "[DONE]") {
              controllerStream.enqueue(encoder.encode(JSON.stringify({ done: true }) + "\n"));
              controllerStream.close();
              return;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                const ollamaChunk =
                  JSON.stringify({
                    message: { content },
                    done: false,
                  }) + "\n";
                controllerStream.enqueue(encoder.encode(ollamaChunk));
              }
              if (parsed.choices?.[0]?.finish_reason === "stop") {
                controllerStream.enqueue(encoder.encode(JSON.stringify({ done: true }) + "\n"));
                controllerStream.close();
                return;
              }
            } catch {
              // Ignore partial or unparseable SSE line
            }
          }
        }
        controllerStream.enqueue(encoder.encode(JSON.stringify({ done: true }) + "\n"));
        controllerStream.close();
      } catch (err) {
        controllerStream.error(err);
      }
    },
    cancel() {
      upstreamReader.cancel().catch(() => {});
      controller.abort();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

/**
 * Streaming variant — returns a Response with an NDJSON stream.
 * Automatically delegates to Cloud AI (Groq / Gemini / OpenAI) if an API key is configured,
 * otherwise falls back to local Ollama.
 */
export async function streamChatOllama(
  messages: { role: string; content: string }[],
  externalSignal?: AbortSignal
): Promise<Response> {
  const cloud = getCloudConfig();
  if (cloud) {
    return streamCloudOpenAI(cloud.url, cloud.apiKey, cloud.model, messages, externalSignal);
  }

  const controller = new AbortController();
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
    throw new AppError(
      "AI assistant is unavailable — make sure Ollama is running locally with the correct model (e.g. `ollama run qwen3:8b`), or provide a cloud API key (e.g. GROQ_API_KEY in .env)",
      503
    );
  }
}

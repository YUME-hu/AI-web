/**
 * DeepSeek API 统一封装（OpenAI 兼容协议）
 * 所有模块的 AI 调用都必须经过这里，便于：
 * - 统一超时 / 重试 / 错误处理
 * - Phase 6 统一记录 Token 用量
 */

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** JSON 模式：要求模型只返回 JSON（DeepSeek 支持 response_format） */
  jsonMode?: boolean;
  timeoutMs?: number;
}

export interface ChatCompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  durationMs: number;
}

export class DeepSeekError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "DeepSeekError";
  }
}

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new DeepSeekError("DEEPSEEK_API_KEY 未配置，请在 .env.local 中设置");
  }
  return key;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 非流式对话补全，带超时与指数退避重试
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<ChatCompletionResult> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens,
    jsonMode = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  };

  let lastError: DeepSeekError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // 429 限流 / 5xx 服务端错误可重试，其余直接失败
        const retryable = res.status === 429 || res.status >= 500;
        throw new DeepSeekError(
          `DeepSeek API 错误 ${res.status}: ${text.slice(0, 200)}`,
          res.status,
          retryable,
        );
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      if (!choice?.message?.content) {
        throw new DeepSeekError("DeepSeek 返回内容为空");
      }

      return {
        content: choice.message.content,
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
        },
        model: data.model ?? model,
        durationMs: Date.now() - startedAt,
      };
    } catch (err) {
      if (err instanceof DeepSeekError) {
        lastError = err;
        if (!err.retryable) throw err;
      } else if (err instanceof Error && err.name === "AbortError") {
        lastError = new DeepSeekError(`DeepSeek 请求超时（${timeoutMs}ms）`, undefined, true);
      } else {
        lastError = new DeepSeekError(
          `DeepSeek 请求失败: ${err instanceof Error ? err.message : String(err)}`,
          undefined,
          true,
        );
      }

      // 指数退避：1s / 2s / 4s
      if (attempt < MAX_RETRIES - 1) {
        await sleep(2 ** attempt * 1000);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new DeepSeekError("DeepSeek 请求失败");
}

/**
 * 流式对话补全（SSE），供 Phase 5 RAG / Phase 8 模拟面试使用。
 * 返回 ReadableStream<string>，逐段产出文本 delta。
 */
export function chatCompletionStream(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): ReadableStream<string> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  return new ReadableStream<string>({
    async start(controller) {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), timeoutMs);

      try {
        const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getApiKey()}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            stream: true,
            ...(maxTokens ? { max_tokens: maxTokens } : {}),
          }),
          signal: abort.signal,
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          throw new DeepSeekError(`DeepSeek API 错误 ${res.status}: ${text.slice(0, 200)}`, res.status);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                controller.enqueue(delta);
              }
            } catch {
              // 忽略不完整的 JSON 行
            }
          }
        }

        controller.close();
      } catch (err) {
        controller.error(
          err instanceof DeepSeekError
            ? err
            : new DeepSeekError(`DeepSeek 流式请求失败: ${err instanceof Error ? err.message : String(err)}`),
        );
      } finally {
        clearTimeout(timer);
      }
    },
  });
}

/**
 * JSON 模式便捷封装：调用后解析 JSON，失败时尝试从文本中提取
 */
export async function chatCompletionJson<T>(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<{ data: T; result: ChatCompletionResult }> {
  const result = await chatCompletion(messages, { ...options, jsonMode: true });

  let parsed: T;
  try {
    parsed = JSON.parse(result.content) as T;
  } catch {
    // 兜底：提取第一个 { 或 [ 到最后一个 } 或 ] 之间的内容
    const match = result.content.match(/[{[][\s\S]*[}\]]/);
    if (!match) {
      throw new DeepSeekError(`DeepSeek 返回内容不是合法 JSON: ${result.content.slice(0, 200)}`);
    }
    parsed = JSON.parse(match[0]) as T;
  }

  return { data: parsed, result };
}

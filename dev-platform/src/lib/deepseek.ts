/**
 * DeepSeek API 统一封装（OpenAI 兼容协议）
 * 所有模块的 AI 调用都必须经过这里，便于：
 * - 统一超时 / 重试 / 错误处理
 * - Phase 6 统一记录 Token 用量
 */

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
// deepseek-chat 已于 2026-07-24 弃用，对应 deepseek-v4-flash 非思考模式
const DEFAULT_MODEL = "deepseek-v4-flash";
// 结构化提取/流式问答走非思考模式：更快更便宜，行为与原 deepseek-chat 一致
const THINKING_DISABLED = { type: "disabled" } as const;
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** 用量追踪模块（对应 ai_usage_logs.module 的 CHECK 约束） */
export type TrackModule =
  | "resume"
  | "knowledge"
  | "project_import"
  | "interview"
  | "project_generator"
  | "blog_assistant";

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** JSON 模式：要求模型只返回 JSON（DeepSeek 支持 response_format） */
  jsonMode?: boolean;
  timeoutMs?: number;
  /** 用量追踪：设置后调用前检查当日限额，成功后写 ai_usage_logs */
  trackModule?: TrackModule;
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

/* ==================== 用量追踪与限流（Phase 6） ==================== */

function dailyTokenLimit(): number {
  return Number(process.env.DAILY_TOKEN_LIMIT ?? 500_000);
}

/** 当天 00:00（本地）的 ISO 时间 */
function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** 查询今日已消耗 token 总和 */
async function getTodayTokens(): Promise<number> {
  // 动态 import：避免本 lib 被客户端组件间接引用时打包 service client
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("total_tokens")
    .gte("created_at", todayStartIso());
  if (error) throw new DeepSeekError(`用量查询失败：${error.message}`);
  return (data ?? []).reduce((sum, row) => sum + (row.total_tokens ?? 0), 0);
}

/** 当日限额检查：超限抛 DeepSeekError（不可重试） */
export async function assertWithinDailyLimit(): Promise<void> {
  const used = await getTodayTokens();
  if (used >= dailyTokenLimit()) {
    throw new DeepSeekError(
      "今日 AI 调用额度已用完（Token 上限），请明天再试",
      undefined,
      false,
    );
  }
}

/**
 * 成本估算（美元）：输入 $0.14/1M、输出 $0.28/1M
 * 缓存命中未扣减（cache hit 更便宜），属保守估算
 */
export function estimateCostUsd(
  promptTokens: number,
  completionTokens: number,
): number {
  return (promptTokens * 0.14 + completionTokens * 0.28) / 1_000_000;
}

export interface AiUsageLogEntry {
  module: TrackModule;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  duration_ms: number;
  model: string;
}

/** 写用量日志：失败仅 console.error，不影响主流程 */
export async function logAiUsage(entry: AiUsageLogEntry): Promise<void> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const supabase = createServiceClient();
    const { error } = await supabase.from("ai_usage_logs").insert(entry);
    if (error) console.error("AI 用量日志写入失败", error);
  } catch (err) {
    console.error("AI 用量日志写入失败", err);
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
    trackModule,
  } = options;

  // 调用前限流：当日 token 用量达到上限则拒绝（超限错误不重试）
  if (trackModule) {
    await assertWithinDailyLimit();
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    thinking: THINKING_DISABLED,
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

      const durationMs = Date.now() - startedAt;
      const usage = {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      };

      // 成功后写用量日志（logAiUsage 内部容错，不影响主流程）
      if (trackModule) {
        await logAiUsage({
          module: trackModule,
          prompt_tokens: usage.promptTokens,
          completion_tokens: usage.completionTokens,
          total_tokens: usage.totalTokens,
          cost_usd: estimateCostUsd(usage.promptTokens, usage.completionTokens),
          duration_ms: durationMs,
          model: data.model ?? model,
        });
      }

      return {
        content: choice.message.content,
        usage,
        model: data.model ?? model,
        durationMs,
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
            thinking: THINKING_DISABLED,
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

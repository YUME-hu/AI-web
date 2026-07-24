/**
 * SiliconFlow Embedding 封装（OpenAI 兼容协议）
 * DeepSeek 没有 Embedding API，RAG 向量化走 SiliconFlow 的 BGE-M3（1024 维）
 */

const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
const EMBEDDING_MODEL = "BAAI/bge-m3";
export const EMBEDDING_DIMENSIONS = 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

function getApiKey(): string {
  const key = process.env.SILICONFLOW_API_KEY;
  if (!key) {
    throw new EmbeddingError("SILICONFLOW_API_KEY 未配置，请在 .env.local 中设置");
  }
  return key;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 批量向量化文本，返回与输入等长的向量数组（1024 维）
 * 单次调用建议不超过 32 条（BGE-M3 上下文 8192 token）
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  let lastError: EmbeddingError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const res = await fetch(`${SILICONFLOW_BASE_URL}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const retryable = res.status === 429 || res.status >= 500;
        throw new EmbeddingError(
          `SiliconFlow Embedding 错误 ${res.status}: ${text.slice(0, 200)}`,
          res.status,
          retryable,
        );
      }

      const data = await res.json();
      const embeddings = (data.data as { index: number; embedding: number[] }[])
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      if (embeddings.length !== texts.length) {
        throw new EmbeddingError(
          `Embedding 返回数量不符：期望 ${texts.length}，实际 ${embeddings.length}`,
        );
      }

      return embeddings;
    } catch (err) {
      if (err instanceof EmbeddingError) {
        lastError = err;
        if (!err.retryable) throw err;
      } else if (err instanceof Error && err.name === "AbortError") {
        lastError = new EmbeddingError("Embedding 请求超时", undefined, true);
      } else {
        lastError = new EmbeddingError(
          `Embedding 请求失败: ${err instanceof Error ? err.message : String(err)}`,
          undefined,
          true,
        );
      }

      if (attempt < MAX_RETRIES - 1) {
        await sleep(2 ** attempt * 1000);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new EmbeddingError("Embedding 请求失败");
}

/**
 * 单条文本向量化
 */
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}

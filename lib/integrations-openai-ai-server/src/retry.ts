import pRetry, { AbortError } from "p-retry";
import { isRateLimitError } from "./batch/utils";

/**
 * Retry Wrapper for AI API Calls
 *
 * A API do Gemini (via camada de compatibilidade OpenAI) por vezes devolve
 * erros transitórios como "400 status code (no body)" — o corpo real do
 * erro (normalmente relacionado com limite de pedidos do tier gratuito)
 * fica escondido porque o SDK "openai" não sabe interpretar o formato de
 * erro em array que o Gemini devolve. Estes erros costumam desaparecer
 * numa nova tentativa passados alguns segundos.
 *
 * Use este wrapper à volta de qualquer chamada a `openai.chat.completions
 * .create(...)`, `openai.images.generate(...)`, etc., para tornar essas
 * chamadas resilientes a falhas transitórias.
 *
 * USO:
 * ```typescript
 * import { withAiRetry } from "@workspace/integrations-openai-ai-server";
 *
 * const stream = await withAiRetry(() =>
 *   openai.chat.completions.create({ model: "gemini-2.5-flash", messages, stream: true })
 * );
 * ```
 */

export interface AiRetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

/** Erros "400 (no body)" são frequentemente rate-limits do Gemini mal reportados. */
function isTransientAiError(error: unknown): boolean {
  if (isRateLimitError(error)) return true;

  const status = (error as { status?: number } | null)?.status;
  const message = error instanceof Error ? error.message : String(error);

  // "400 status code (no body)" é o sintoma característico deste bug.
  if (status === 400 && /no body/i.test(message)) return true;

  // Erros 5xx do próprio Google também costumam ser transitórios.
  if (typeof status === "number" && status >= 500) return true;

  return false;
}

export async function withAiRetry<T>(
  fn: () => Promise<T>,
  options: AiRetryOptions = {},
): Promise<T> {
  const { retries = 3, minTimeout = 1000, maxTimeout = 8000, onRetry } = options;

  return pRetry(
    async () => {
      try {
        return await fn();
      } catch (error) {
        if (isTransientAiError(error)) {
          throw error; // deixa o p-retry tentar de novo
        }
        // Erro não-transitório (ex: chave inválida, pedido malformado):
        // falha imediatamente, sem gastar tentativas.
        throw new AbortError(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    },
    {
      retries,
      minTimeout,
      maxTimeout,
      factor: 2,
      onFailedAttempt: (context) => {
        onRetry?.(context.attemptNumber, context.error);
      },
    },
  );
}

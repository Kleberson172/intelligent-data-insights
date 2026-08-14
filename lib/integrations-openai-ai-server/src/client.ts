import OpenAI from "openai";

/**
 * A API do Gemini (via camada de compatibilidade OpenAI) devolve erros
 * num formato (JSON com raiz em array) que o SDK "openai" não sabe
 * interpretar. O resultado é que qualquer erro aparece como "400 status
 * code (no body)", escondendo a mensagem real (ex: pedido demasiado
 * grande, formato inválido, limite de quota, etc.).
 *
 * Este fetch personalizado intercepta respostas com erro e regista o
 * corpo real na consola, para diagnóstico, sem alterar o comportamento
 * normal do SDK (que continua a lançar o erro como sempre).
 */
const loggingFetch: typeof fetch = async (url, init) => {
  const res = await fetch(url, init);
  if (!res.ok) {
    res
      .clone()
      .text()
      .then((body) => {
        console.error(
          `[integrations-openai-ai-server] A API respondeu ${res.status} para ${url}:\n${body}`,
        );
      })
      .catch(() => {});
  }
  return res;
};

function createOpenAIClient(): OpenAI {
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return new Proxy({} as OpenAI, {
      get() {
        throw new Error(
          "AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY must be set. Did you forget to provision the OpenAI AI integration?",
        );
      },
    });
  }

  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    fetch: loggingFetch,
  });
}

export const openai = createOpenAIClient();

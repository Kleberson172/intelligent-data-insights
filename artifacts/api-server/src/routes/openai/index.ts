import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import { openai, withAiRetry } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";
import { getCsvData } from "../../lib/csv-store";

const router: IRouter = Router();

const BASE_SYSTEM_PROMPT = `Você é o Agente de IA da ELEVEN Technology — uma plataforma angolana de inteligência de dados. O seu papel é responder dúvidas do utilizador, analisar dados de negócio e fornecer insights estratégicos.

Contexto padrão (dataset vendas_angola.csv):
- Período: Janeiro 2023 a Dezembro 2024
- Províncias: Luanda, Benguela, Huambo, Namibe, Cabinda, Malanje, Uíge, Zaire
- Produtos: Eletrónicos, Alimentação, Vestuário, Construção, Farmácia, Combustíveis
- Métricas: Vendas (AOA), Despesas, Lucro, Unidades Vendidas, Número de Clientes

REGRAS OBRIGATÓRIAS:
1. Responda SEMPRE em português europeu/angolano — NUNCA em inglês.
2. Seja directo, específico e use números concretos.
3. Formate as respostas com listas, negrito e secções claras.
4. Se o utilizador fizer uma pergunta geral (não sobre dados), responda de forma útil e em português.
5. Cumprimente o utilizador de forma amigável quando iniciar a conversa.`;

function buildSystemPrompt(): string {
  const csv = getCsvData();
  if (!csv) return BASE_SYSTEM_PROMPT;

  return `${BASE_SYSTEM_PROMPT}

======= DADOS REAIS CARREGADOS PELO UTILIZADOR =======
O utilizador carregou um ficheiro CSV personalizado. Utilize estes dados reais para as análises:

${csv.summary}

INSTRUÇÕES: Ao responder perguntas sobre dados, use SEMPRE os dados reais carregados acima em vez do dataset padrão. Mencione o nome do ficheiro "${csv.filename}" quando relevante.`;
}

router.get("/openai/conversations", async (req, res): Promise<void> => {
  const convs = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.createdAt));
  res.json(convs);
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db
    .insert(conversations)
    .values({ title: parsed.data.title })
    .returning();

  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, params.data.id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(messages.createdAt);

  res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db
    .delete(conversations)
    .where(eq(conversations.id, params.data.id))
    .returning();

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);

  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendOpenaiMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, params.data.id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(messages.createdAt);

  await db.insert(messages).values({
    conversationId: conv.id,
    role: "user",
    content: body.data.content,
  });

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: buildSystemPrompt() },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: body.data.content },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    // Envolve com retry porque a API do Gemini por vezes devolve erros
    // transitórios ("400 no body") que desaparecem numa nova tentativa —
    // ver lib/integrations-openai-ai-server/src/retry.ts para detalhes.
    const stream = await withAiRetry(
      () =>
        openai.chat.completions.create({
          model: "gemini-2.5-flash",
          max_completion_tokens: 8192,
          messages: chatMessages,
          stream: true,
        }),
      {
        onRetry: (attempt, error) => {
          req.log.warn(
            { attempt, err: error },
            "Tentativa falhada ao contactar a IA, a repetir",
          );
        },
      },
    );

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: conv.id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    req.log.error({ err }, "Error streaming AI response");
    res.write(`data: ${JSON.stringify({ error: "Erro ao processar resposta da IA" })}\n\n`);
  }

  res.end();
});

export default router;



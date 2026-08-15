/**
 * File Extractors
 *
 * Converte ficheiros em vários formatos (Excel, Word, PDF, imagem) para um
 * de dois formatos internos:
 *  - Tabular: { headers, records } — igual ao que já vem do CSV, alimenta
 *    o dashboard/predições/anomalias.
 *  - Documento: texto simples — usado só como contexto para o Agente de IA
 *    responder perguntas, sem alimentar o dashboard.
 *
 * A decisão de qual dos dois se aplica é automática: tentamos sempre
 * primeiro interpretar o ficheiro como uma tabela; só cai para "documento"
 * se não encontrarmos uma estrutura tabular clara.
 */

import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { openai, withAiRetry } from "@workspace/integrations-openai-ai-server";

export interface TabularResult {
  kind: "tabular";
  headers: string[];
  records: Record<string, string>[];
}

export interface DocumentResult {
  kind: "document";
  text: string;
}

export type ExtractionResult = TabularResult | DocumentResult;

// -------------------- Excel (.xlsx, .xls) --------------------

export function extractExcel(buffer: Buffer): ExtractionResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const records = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false, // formata números/datas como texto, tal como o CSV
  });

  if (records.length === 0) {
    return { kind: "document", text: "" };
  }

  const headers = Object.keys(records[0]);
  return { kind: "tabular", headers, records };
}

// -------------------- Word (.docx) --------------------

// Extrai a primeira tabela HTML encontrada num documento Word convertido
// pelo mammoth. É um parser simples (sem suporte a rowspan/colspan), mas
// cobre bem o caso comum de uma tabela de dados exportada para Word.
function extractFirstHtmlTable(html: string): { headers: string[]; records: Record<string, string>[] } | null {
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return null;

  const rowMatches = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  if (rowMatches.length < 2) return null; // precisa de cabeçalho + pelo menos 1 linha

  const stripTags = (cell: string) =>
    cell.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();

  const parseRow = (row: string) =>
    [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));

  const headers = parseRow(rowMatches[0][1]);
  if (headers.length < 2) return null; // pelo menos 2 colunas para parecer tabela de dados

  const records: Record<string, string>[] = [];
  for (let i = 1; i < rowMatches.length; i++) {
    const cells = parseRow(rowMatches[i][1]);
    if (cells.length === 0) continue;
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h || `coluna_${idx + 1}`] = cells[idx] ?? "";
    });
    records.push(record);
  }

  if (records.length === 0) return null;
  return { headers: headers.map((h, i) => h || `coluna_${i + 1}`), records };
}

export async function extractWord(buffer: Buffer): Promise<ExtractionResult> {
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const table = extractFirstHtmlTable(htmlResult.value);
  if (table) {
    return { kind: "tabular", headers: table.headers, records: table.records };
  }

  const textResult = await mammoth.extractRawText({ buffer });
  return { kind: "document", text: textResult.value.trim() };
}

// -------------------- PDF --------------------

// LIMITAÇÃO CONHECIDA: a deteção de tabelas do pdf-parse depende de
// encontrar geometria vetorial (linhas desenhadas) no PDF que formem uma
// grelha reconhecível. Funciona bem em muitos PDFs "reais" (ex: exportados
// do Excel/Word, faturas geradas por sistemas), mas nem sempre deteta
// tabelas em todos os PDFs. Quando não deteta nada, o ficheiro cai para
// modo "documento" (o agente ainda consegue ler e responder perguntas
// sobre o conteúdo — só não alimenta o dashboard). Não tentamos adivinhar
// a estrutura a partir do texto simples: o texto extraído de um PDF junta
// células com espaços normais, indistinguíveis de espaços dentro do
// próprio conteúdo — uma heurística aí arriscaria gerar tabelas com
// colunas trocadas, o que seria pior do que não detetar nada.
export async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    // O pdf-parse v2 deteta tabelas analisando a grelha vetorial do PDF
    // (linhas/retângulos) — muito mais fiável do que tentar adivinhar por
    // texto. Se não encontrar nenhuma tabela, cai para o texto completo.
    const tableResult = await parser.getTable();
    const bestTable = tableResult.mergedTables
      .filter((t) => t.length >= 2 && t[0].length >= 2) // cabeçalho + 1 linha, 2+ colunas
      .sort((a, b) => b.length - a.length)[0];

    if (bestTable) {
      const headers = bestTable[0].map((h, i) => h?.trim() || `coluna_${i + 1}`);
      const records: Record<string, string>[] = bestTable.slice(1).map((row) => {
        const record: Record<string, string> = {};
        headers.forEach((h, i) => { record[h] = row[i]?.trim() ?? ""; });
        return record;
      });
      if (records.length > 0) {
        return { kind: "tabular", headers, records };
      }
    }

    const textResult = await parser.getText();
    return { kind: "document", text: textResult.text.trim() };
  } finally {
    await parser.destroy();
  }
}

// -------------------- Imagem (foto) --------------------

// Não temos forma determinística de "ler" uma foto — pedimos ao Gemini
// (via a mesma integração de chat já usada no resto da app) para descrever
// o conteúdo e, se identificar uma tabela de dados na imagem (ex: foto de
// uma folha de vendas, factura, etc.), devolvê-la em JSON estruturado.
const IMAGE_CLASSIFICATION_PROMPT = `Analisa esta imagem. Se ela contiver uma tabela de dados (ex: uma folha de vendas, uma factura, uma lista de números organizados em linhas/colunas), responde APENAS com um JSON no formato:
{"type":"table","headers":["coluna1","coluna2",...],"rows":[["valor1","valor2",...],...]}

Se a imagem NÃO contiver uma tabela de dados (ex: é uma foto de um documento de texto, uma paisagem, um objeto, etc.), responde APENAS com um JSON no formato:
{"type":"text","content":"<descrição ou transcrição do conteúdo relevante da imagem, em português>"}

Responde APENAS com o JSON, sem texto adicional, sem markdown, sem \`\`\`.`;

interface ImageTableResponse {
  type: "table";
  headers: string[];
  rows: string[][];
}

interface ImageTextResponse {
  type: "text";
  content: string;
}

function isImageTableResponse(v: unknown): v is ImageTableResponse {
  return (
    typeof v === "object" && v !== null &&
    (v as ImageTableResponse).type === "table" &&
    Array.isArray((v as ImageTableResponse).headers) &&
    Array.isArray((v as ImageTableResponse).rows)
  );
}

function isImageTextResponse(v: unknown): v is ImageTextResponse {
  return (
    typeof v === "object" && v !== null &&
    (v as ImageTextResponse).type === "text" &&
    typeof (v as ImageTextResponse).content === "string"
  );
}

export async function extractImage(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  const response = await withAiRetry(() =>
    openai.chat.completions.create({
      model: "gemini-2.5-flash",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: IMAGE_CLASSIFICATION_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    })
  );

  const raw = response.choices[0]?.message?.content ?? "";
  // O modelo por vezes envolve o JSON em ```json apesar da instrução — remove se acontecer.
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Não conseguimos interpretar a resposta como JSON — guarda o texto
    // devolvido pelo modelo como descrição, para a imagem não ficar perdida.
    return { kind: "document", text: raw.trim() || "Não foi possível interpretar o conteúdo da imagem." };
  }

  if (isImageTableResponse(parsed)) {
    const headers = parsed.headers.length > 0 ? parsed.headers : ["coluna_1"];
    const records = parsed.rows.map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((h, i) => { record[h] = row[i] ?? ""; });
      return record;
    });
    if (records.length > 0) {
      return { kind: "tabular", headers, records };
    }
  }

  if (isImageTextResponse(parsed)) {
    return { kind: "document", text: parsed.content };
  }

  return { kind: "document", text: "Não foi possível interpretar o conteúdo da imagem." };
}

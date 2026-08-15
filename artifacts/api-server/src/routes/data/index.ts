import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { storeCsvData, getCsvData, hasCsvData, clearCsvData } from "../../lib/csv-store";
import { storeDocument, getDocument, hasDocument, clearDocument } from "../../lib/document-store";
import { extractExcel, extractWord, extractPdf, extractImage, type ExtractionResult } from "../../lib/file-extractors";

const router: IRouter = Router();
// 15MB — um pouco acima do limite anterior (10MB) para acomodar fotos e PDFs.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

type SupportedFormat = "csv" | "xlsx" | "docx" | "pdf" | "image";

function detectFormat(filename: string, mimetype: string): SupportedFormat | null {
  const name = filename.toLowerCase();
  if (name.endsWith(".csv") || mimetype === "text/csv") return "csv";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".pdf") || mimetype === "application/pdf") return "pdf";
  if (/\.(jpe?g|png|webp)$/.test(name) || mimetype.startsWith("image/")) return "image";
  return null;
}

function parseCsvBuffer(buffer: Buffer): { headers: string[]; records: Record<string, string>[] } {
  const content = buffer.toString("utf-8");

  const sniff = content.slice(0, 2000);
  const semicolons = (sniff.match(/;/g) ?? []).length;
  const commas = (sniff.match(/,/g) ?? []).length;
  const tabs = (sniff.match(/\t/g) ?? []).length;
  const delimiter = tabs > semicolons && tabs > commas ? "\t"
    : semicolons > commas ? ";" : ",";

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    delimiter,
    relax_column_count: true,
    relax_quotes: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    throw new Error("O ficheiro CSV está vazio");
  }

  return { headers: Object.keys(records[0]), records };
}

router.post("/data/upload", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "Nenhum ficheiro enviado" });
    return;
  }

  // O multer (e o multipart/form-data em geral) interpreta o nome do
  // ficheiro como latin1 por defeito, mesmo quando o browser envia UTF-8
  // (ex: nomes de ficheiro com acentos). Reconverter corrige isso.
  const originalname = Buffer.from(req.file.originalname, "latin1").toString("utf-8");

  const format = detectFormat(originalname, req.file.mimetype);
  if (!format) {
    res.status(400).json({
      error: "Formato não suportado. Envie um ficheiro CSV, Excel (.xlsx), Word (.docx), PDF ou uma foto (.jpg, .png).",
    });
    return;
  }

  try {
    let result: ExtractionResult;

    switch (format) {
      case "csv": {
        const { headers, records } = parseCsvBuffer(req.file.buffer);
        result = { kind: "tabular", headers, records };
        break;
      }
      case "xlsx":
        result = extractExcel(req.file.buffer);
        break;
      case "docx":
        result = await extractWord(req.file.buffer);
        break;
      case "pdf":
        result = await extractPdf(req.file.buffer);
        break;
      case "image":
        result = await extractImage(req.file.buffer, req.file.mimetype || "image/jpeg");
        break;
    }

    if (result.kind === "tabular") {
      if (result.records.length === 0) {
        res.status(400).json({ error: "Não foi encontrada nenhuma linha de dados no ficheiro." });
        return;
      }
      await storeCsvData(originalname, result.headers, result.records);
      clearDocument(); // uma tabela nova substitui qualquer documento solto anterior

      req.log.info(
        { filename: originalname, rows: result.records.length, format },
        "Dataset carregado (tabular)",
      );

      res.json({
        success: true,
        type: "dataset",
        filename: originalname,
        rows: result.records.length,
        columns: result.headers,
        message: `Dados carregados com sucesso: ${result.records.length} registros, ${result.headers.length} colunas`,
      });
      return;
    }

    // Documento sem estrutura tabular — fica disponível só para o chat.
    if (!result.text.trim()) {
      res.status(400).json({ error: "Não foi possível extrair conteúdo legível do ficheiro." });
      return;
    }

    // Um PDF digitalizado (uma foto/scan do documento, sem texto real
    // embutido) extrai muito pouco ou nenhum texto. Nesse caso, é mais
    // honesto avisar do que guardar um "documento" praticamente vazio que
    // o agente não vai conseguir usar para nada.
    const looksLikeScannedPdf = format === "pdf" && result.text.trim().length < 40;
    if (looksLikeScannedPdf) {
      res.status(400).json({
        error: `Não foi possível extrair texto de "${originalname}". Este PDF parece ser um documento digitalizado (uma imagem do documento, sem texto real embutido) — tente carregá-lo como foto (.jpg/.png) em vez de PDF, para o agente conseguir ler o conteúdo.`,
      });
      return;
    }

    storeDocument(originalname, result.text);

    req.log.info(
      { filename: originalname, chars: result.text.length, format },
      "Documento carregado (não tabular)",
    );

    res.json({
      success: true,
      type: "document",
      filename: originalname,
      preview: result.text.slice(0, 300),
      message: `Ficheiro "${originalname}" carregado. Não contém uma tabela de dados, mas já posso responder perguntas sobre o seu conteúdo.`,
    });
  } catch (err) {
    req.log.error({ err, format }, "Falha ao processar ficheiro carregado");
    res.status(400).json({ error: "Erro ao processar o ficheiro. Verifique se não está corrompido." });
  }
});

router.get("/data/status", async (_req: Request, res: Response): Promise<void> => {
  const doc = hasDocument() ? getDocument() : undefined;
  const documentStatus = doc
    ? { loaded: true, filename: doc.filename, uploadedAt: doc.uploadedAt }
    : { loaded: false };

  if (!hasCsvData()) {
    res.json({ loaded: false, document: documentStatus });
    return;
  }

  const data = getCsvData()!;
  res.json({
    loaded: true,
    filename: data.filename,
    rows: data.records.length,
    columns: data.headers,
    uploadedAt: data.uploadedAt,
    document: documentStatus,
  });
});

router.delete("/data/clear", async (_req: Request, res: Response): Promise<void> => {
  await clearCsvData();
  clearDocument();
  res.json({ success: true });
});

export default router;

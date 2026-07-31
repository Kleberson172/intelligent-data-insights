import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { storeCsvData, getCsvData, hasCsvData, clearCsvData } from "../../lib/csv-store";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/data/upload", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "Nenhum ficheiro enviado" });
    return;
  }

  if (!req.file.originalname.toLowerCase().endsWith(".csv") && req.file.mimetype !== "text/csv") {
    res.status(400).json({ error: "Apenas ficheiros CSV são suportados" });
    return;
  }

  try {
    const content = req.file.buffer.toString("utf-8");

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
      res.status(400).json({ error: "O ficheiro CSV está vazio" });
      return;
    }

    const headers = Object.keys(records[0]);
    storeCsvData(req.file.originalname, headers, records);

    req.log.info({ filename: req.file.originalname, rows: records.length }, "CSV uploaded");

    res.json({
      success: true,
      filename: req.file.originalname,
      rows: records.length,
      columns: headers,
      message: `Dados carregados com sucesso: ${records.length} registros, ${headers.length} colunas`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to parse CSV");
    res.status(400).json({ error: "Erro ao processar o ficheiro CSV. Verifique o formato." });
  }
});

router.get("/data/status", async (_req: Request, res: Response): Promise<void> => {
  if (!hasCsvData()) {
    res.json({ loaded: false });
    return;
  }

  const data = getCsvData()!;
  res.json({
    loaded: true,
    filename: data.filename,
    rows: data.records.length,
    columns: data.headers,
    uploadedAt: data.uploadedAt,
  });
});

router.delete("/data/clear", async (_req: Request, res: Response): Promise<void> => {
  clearCsvData();
  res.json({ success: true });
});

export default router;

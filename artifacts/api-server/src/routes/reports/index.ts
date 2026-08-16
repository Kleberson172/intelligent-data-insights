import { Router, type IRouter } from "express";
import { hasCsvData } from "../../lib/csv-store";
import { generateExcelReport, generatePdfReport } from "../../lib/report-generator";

const router: IRouter = Router();

router.get("/reports/excel", async (req, res): Promise<void> => {
  if (!hasCsvData()) {
    res.status(400).json({
      error: "Nenhum dataset carregado. Carregue um ficheiro ou importe uma integração antes de exportar um relatório.",
    });
    return;
  }

  try {
    const buffer = generateExcelReport();
    if (!buffer) {
      res.status(400).json({ error: "Não foi possível gerar o relatório." });
      return;
    }
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="relatorio-eleven.xlsx"`);
    res.send(buffer);
  } catch (err) {
    req.log.error({ err }, "Falha ao gerar relatório Excel");
    res.status(500).json({ error: "Erro ao gerar o relatório Excel." });
  }
});

router.get("/reports/pdf", async (req, res): Promise<void> => {
  if (!hasCsvData()) {
    res.status(400).json({
      error: "Nenhum dataset carregado. Carregue um ficheiro ou importe uma integração antes de exportar um relatório.",
    });
    return;
  }

  try {
    const buffer = await generatePdfReport();
    if (!buffer) {
      res.status(400).json({ error: "Não foi possível gerar o relatório." });
      return;
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="relatorio-eleven.pdf"`);
    res.send(buffer);
  } catch (err) {
    req.log.error({ err }, "Falha ao gerar relatório PDF");
    res.status(500).json({ error: "Erro ao gerar o relatório PDF." });
  }
});

export default router;

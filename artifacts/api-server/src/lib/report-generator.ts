import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import {
  getCsvData,
  computeDashboardFromData,
  computeTopProductsFromData,
  computeCategoryBreakdowns,
} from "./csv-store";

/**
 * Report Generator
 *
 * Gera relatórios (Excel e PDF) a partir do dataset atualmente carregado,
 * reutilizando os mesmos cálculos que já alimentam o dashboard (para os
 * números do relatório serem sempre consistentes com o que se vê na app).
 *
 * Só funciona com um dataset real carregado — não exporta o dataset de
 * demonstração, para não gerar relatórios com dados fictícios.
 */

function formatAOA(value: number): string {
  return `${value.toLocaleString("pt-PT", { maximumFractionDigits: 0 })} AOA`;
}

// -------------------- Excel --------------------

export function generateExcelReport(): Buffer | null {
  const data = getCsvData();
  if (!data) return null;

  const metrics = computeDashboardFromData();
  const topProducts = computeTopProductsFromData(10);
  const breakdowns = computeCategoryBreakdowns();

  const workbook = XLSX.utils.book_new();

  // Folha 1: Resumo com os KPIs principais.
  if (metrics) {
    const resumoRows = [
      ["Relatório gerado em", new Date().toLocaleString("pt-PT")],
      ["Ficheiro de origem", data.filename],
      ["Total de registos", data.records.length],
      [],
      ["Receita Total (AOA)", metrics.totalRevenue],
      ["Total de Encomendas", metrics.totalOrders],
      ["Valor Médio por Encomenda (AOA)", metrics.avgOrderValue],
      ["Taxa de Crescimento (%)", metrics.growthRate],
      ["Clientes Ativos", metrics.activeClients],
      ["Anomalias Detetadas", metrics.anomaliesDetected],
    ];
    const resumoSheet = XLSX.utils.aoa_to_sheet(resumoRows);
    XLSX.utils.book_append_sheet(workbook, resumoSheet, "Resumo");
  }

  // Folha 2: Top produtos (se detetado no dataset).
  if (topProducts && topProducts.length > 0) {
    const topSheet = XLSX.utils.json_to_sheet(
      topProducts.map(p => ({
        Produto: p.produto,
        "Vendas (AOA)": p.vendas,
        Unidades: p.unidades,
        "Crescimento (%)": p.crescimento,
      })),
    );
    XLSX.utils.book_append_sheet(workbook, topSheet, "Top Produtos");
  }

  // Folha 3+: uma folha por cada agrupamento por categoria.
  for (const b of breakdowns.slice(0, 5)) {
    const sheet = XLSX.utils.json_to_sheet(
      b.top.map(item => ({
        [b.column]: item.value,
        [`Total ${b.valueColumn}`]: item.total,
        Registos: item.count,
      })),
    );
    // Nomes de folha no Excel têm limite de 31 caracteres.
    const sheetName = `Por ${b.column}`.slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  }

  // Última folha: dados em bruto, tal como carregados.
  const dadosSheet = XLSX.utils.json_to_sheet(data.records);
  XLSX.utils.book_append_sheet(workbook, dadosSheet, "Dados");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer as Buffer;
}

// -------------------- PDF --------------------

interface PdfCursor {
  page: PDFPage;
  y: number;
}

const PAGE_MARGIN = 50;
const LINE_HEIGHT = 18;

function newPage(pdf: PDFDocument): PdfCursor {
  const page = pdf.addPage([595, 842]); // A4
  return { page, y: 842 - PAGE_MARGIN };
}

function ensureSpace(pdf: PDFDocument, cursor: PdfCursor, needed: number): PdfCursor {
  if (cursor.y - needed < PAGE_MARGIN) {
    return newPage(pdf);
  }
  return cursor;
}

function drawText(
  cursor: PdfCursor,
  text: string,
  font: PDFFont,
  size: number,
  color = rgb(0.1, 0.1, 0.15),
): void {
  cursor.page.drawText(text, { x: PAGE_MARGIN, y: cursor.y, size, font, color });
  cursor.y -= LINE_HEIGHT * (size > 14 ? 1.4 : 1);
}

export async function generatePdfReport(): Promise<Buffer | null> {
  const data = getCsvData();
  if (!data) return null;

  const metrics = computeDashboardFromData();
  const topProducts = computeTopProductsFromData(10);
  const breakdowns = computeCategoryBreakdowns(8);

  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let cursor = newPage(pdf);

  drawText(cursor, "ELEVEN Technology", fontBold, 20, rgb(0.05, 0.4, 0.55));
  drawText(cursor, "Relatório de Análise de Dados", fontRegular, 13, rgb(0.35, 0.35, 0.4));
  cursor.y -= 6;
  drawText(cursor, `Ficheiro: ${data.filename}`, fontRegular, 10, rgb(0.4, 0.4, 0.45));
  drawText(cursor, `Gerado em: ${new Date().toLocaleString("pt-PT")}`, fontRegular, 10, rgb(0.4, 0.4, 0.45));
  drawText(cursor, `Total de registos: ${data.records.length}`, fontRegular, 10, rgb(0.4, 0.4, 0.45));
  cursor.y -= 10;

  if (metrics) {
    cursor = ensureSpace(pdf, cursor, LINE_HEIGHT * 8);
    drawText(cursor, "Indicadores Principais", fontBold, 14);
    cursor.y -= 4;

    const kpis: [string, string][] = [
      ["Receita Total", formatAOA(metrics.totalRevenue)],
      ["Total de Encomendas", metrics.totalOrders.toLocaleString("pt-PT")],
      ["Valor Médio por Encomenda", formatAOA(metrics.avgOrderValue)],
      ["Taxa de Crescimento", `${metrics.growthRate.toFixed(1)}%`],
      ["Clientes Ativos", metrics.activeClients.toLocaleString("pt-PT")],
      ["Anomalias Detetadas", String(metrics.anomaliesDetected)],
    ];
    for (const [label, value] of kpis) {
      cursor = ensureSpace(pdf, cursor, LINE_HEIGHT);
      cursor.page.drawText(label, { x: PAGE_MARGIN, y: cursor.y, size: 10, font: fontRegular, color: rgb(0.3, 0.3, 0.35) });
      cursor.page.drawText(value, { x: PAGE_MARGIN + 220, y: cursor.y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.15) });
      cursor.y -= LINE_HEIGHT;
    }
    cursor.y -= 10;
  }

  if (topProducts && topProducts.length > 0) {
    cursor = ensureSpace(pdf, cursor, LINE_HEIGHT * (topProducts.length + 3));
    drawText(cursor, "Top Produtos", fontBold, 14);
    cursor.y -= 4;
    for (const p of topProducts) {
      cursor = ensureSpace(pdf, cursor, LINE_HEIGHT);
      const line = `${p.produto} — ${formatAOA(p.vendas)} (${p.unidades.toLocaleString("pt-PT")} unidades, ${p.crescimento >= 0 ? "+" : ""}${p.crescimento.toFixed(1)}%)`;
      cursor.page.drawText(line, { x: PAGE_MARGIN, y: cursor.y, size: 10, font: fontRegular, color: rgb(0.15, 0.15, 0.2) });
      cursor.y -= LINE_HEIGHT;
    }
    cursor.y -= 10;
  }

  for (const b of breakdowns) {
    cursor = ensureSpace(pdf, cursor, LINE_HEIGHT * (b.top.length + 3));
    drawText(cursor, `Totais por ${b.column}`, fontBold, 13);
    cursor.y -= 2;
    for (const item of b.top) {
      cursor = ensureSpace(pdf, cursor, LINE_HEIGHT);
      const line = `${item.value}: ${item.total.toLocaleString("pt-PT")} (${item.count} registos)`;
      cursor.page.drawText(line, { x: PAGE_MARGIN, y: cursor.y, size: 10, font: fontRegular, color: rgb(0.15, 0.15, 0.2) });
      cursor.y -= LINE_HEIGHT;
    }
    cursor.y -= 8;
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

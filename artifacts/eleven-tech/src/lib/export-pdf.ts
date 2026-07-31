import jsPDF from "jspdf";

interface SalesRow { month: string; vendas: number; lucro: number; despesas?: number; }
interface ProvinceRow { provincia: string; vendas: number; }
interface ProductRow { produto: string; vendas: number; unidades: number; crescimento: number; }
interface MsgRow { role: string; content: string; }

export interface ExportData {
  summary?: { totalRevenue: number; totalOrders: number; growthRate: number; anomaliesDetected: number };
  salesData?: SalesRow[];
  provinceData?: ProvinceRow[];
  topProducts?: ProductRow[];
  aiMessages?: MsgRow[];
  csvFilename?: string;
}

function fmtAOA(v: number) {
  if (v >= 1e9) return `AOA ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `AOA ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `AOA ${(v / 1e3).toFixed(0)}K`;
  return `AOA ${v.toLocaleString("pt-AO")}`;
}

type RGB = [number, number, number];
const CYAN: RGB    = [56, 189, 248];
const INDIGO: RGB  = [129, 140, 248];
const DARK: RGB    = [10, 14, 20];
const CARD: RGB    = [17, 24, 39];
const CARD2: RGB   = [20, 28, 45];
const MUTED: RGB   = [107, 114, 128];
const WHITE: RGB   = [255, 255, 255];
const EMERALD: RGB = [52, 211, 153];
const AMBER: RGB   = [245, 158, 11];
const PROV_COLORS: RGB[] = [CYAN, INDIGO, EMERALD, AMBER, [244,114,182], [167,139,250], [96,165,250], [251,146,60]];

export async function exportDashboardPDF(data: ExportData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 14, CW = W - M * 2;

  // ─── helpers ──────────────────────────────────────────────────────────────
  const fill = (c: RGB) => doc.setFillColor(...c);
  const stroke = (c: RGB) => doc.setDrawColor(...c);
  const color = (c: RGB) => doc.setTextColor(...c);
  const font = (sz: number, style: "normal"|"bold" = "normal") => {
    doc.setFontSize(sz);
    doc.setFont("helvetica", style);
  };

  function newPage() {
    doc.addPage();
    fill(DARK); doc.rect(0, 0, W, H, "F");
  }

  function sectionHeader(label: string, accent: RGB, cy: number): number {
    font(11, "bold"); color(WHITE);
    doc.text(label, M, cy);
    fill(accent); doc.rect(M, cy + 1.5, label.length * 1.85, 0.5, "F");
    return cy + 8;
  }

  function tableHeader(cols: string[], widths: number[], cy: number): number {
    fill(CARD); doc.rect(M, cy, CW, 8, "F");
    let x = M;
    cols.forEach((c, i) => {
      font(7.5, "bold"); color(MUTED);
      doc.text(c, x + 2, cy + 5.5);
      x += widths[i];
    });
    return cy + 8;
  }

  function tableRow(cells: string[], widths: number[], styles: ("bold"|"normal")[], colors: RGB[], cy: number, stripe: boolean): number {
    if (stripe) { fill(CARD2); doc.rect(M, cy, CW, 7, "F"); }
    let x = M;
    cells.forEach((val, i) => {
      font(8, styles[i]); color(colors[i]);
      doc.text(val, x + 2, cy + 4.8);
      x += widths[i];
    });
    return cy + 7;
  }

  // ─── PAGE 1 ────────────────────────────────────────────────────────────────
  fill(DARK); doc.rect(0, 0, W, H, "F");

  // Banner
  fill(CARD); doc.rect(0, 0, W, 44, "F");
  fill(CYAN); doc.rect(0, 0, W, 2, "F");

  // Logo square
  fill(CYAN); doc.roundedRect(M, 11, 12, 12, 2, 2, "F");
  font(9, "bold"); color(DARK);
  doc.text("11", M + 3.2, 19.2);

  // Title
  font(18, "bold"); color(WHITE);
  doc.text("ELEVEN Technology", M + 17, 18);
  font(8, "normal"); color(MUTED);
  doc.text("Relatório de Análise de Dados  ·  Angola", M + 17, 24.5);

  // Date top-right
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-PT", { day:"2-digit", month:"long", year:"numeric" });
  const timeStr = now.toLocaleTimeString("pt-PT");
  font(7.5, "normal"); color(MUTED);
  doc.text(`Gerado em ${dateStr} às ${timeStr}`, W - M, 18, { align:"right" });
  if (data.csvFilename) {
    font(7, "normal"); color(CYAN);
    doc.text(`Dataset: ${data.csvFilename}`, W - M, 24.5, { align:"right" });
  }

  let y = 52;

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  y = sectionHeader("Indicadores Chave de Desempenho", CYAN, y);

  const kpiW = (CW - 6) / 4;
  const kpis = [
    { label:"RECEITA TOTAL",     value: fmtAOA(data.summary?.totalRevenue ?? 0),                      change:"+12.4% vs. anterior", c: CYAN    },
    { label:"TOTAL PEDIDOS",     value: (data.summary?.totalOrders ?? 0).toLocaleString("pt-PT"),     change:"+8.1% vs. anterior",  c: INDIGO  },
    { label:"TAXA CRESCIMENTO",  value: `+${data.summary?.growthRate ?? 0}%`,                          change:"+3.2pp vs. anterior", c: EMERALD },
    { label:"ANOMALIAS",         value: String(data.summary?.anomaliesDetected ?? 0),                  change:"-2 este mês",         c: AMBER   },
  ];
  kpis.forEach(({ label, value, change, c }, i) => {
    const kx = M + i * (kpiW + 2);
    fill(CARD); doc.roundedRect(kx, y, kpiW, 30, 2, 2, "F");
    fill(c); doc.roundedRect(kx, y, kpiW, 1.5, 1, 1, "F");
    font(6.5, "bold"); color(MUTED); doc.text(label, kx + 4, y + 9);
    font(13, "bold"); color(WHITE); doc.text(value, kx + 4, y + 19);
    font(7, "normal"); color(c); doc.text(change, kx + 4, y + 26);
  });
  y += 38;

  // ─── Vendas Mensais ────────────────────────────────────────────────────────
  if (data.salesData?.length) {
    y = sectionHeader("Evolução Mensal de Vendas & Lucro", CYAN, y);
    const wCols = [26, 42, 38, 38, 18];
    const hCols = ["Mês", "Vendas (AOA)", "Lucro (AOA)", "Despesas (AOA)", "Margem"];
    y = tableHeader(hCols, wCols, y);

    data.salesData.slice(0, 12).forEach((row, idx) => {
      const margin_val = row.vendas > 0 ? `${((row.lucro / row.vendas) * 100).toFixed(1)}%` : "—";
      const cells = [row.month, fmtAOA(row.vendas), fmtAOA(row.lucro), fmtAOA(row.despesas ?? 0), margin_val];
      const styles: ("bold"|"normal")[] = ["bold","normal","normal","normal","normal"];
      const colors: RGB[] = [WHITE, [200,210,220], [200,210,220], [200,210,220], EMERALD];
      y = tableRow(cells, wCols, styles, colors, y, idx % 2 === 0);
    });
    y += 7;
  }

  // ─── Províncias ────────────────────────────────────────────────────────────
  if (data.provinceData?.length) {
    if (y > 218) { newPage(); y = 20; }
    y = sectionHeader("Vendas por Província", INDIGO, y);

    const maxV = Math.max(...data.provinceData.map(p => p.vendas));
    const barMax = CW * 0.52;

    data.provinceData.slice(0, 8).forEach((p, i) => {
      const bw = (p.vendas / maxV) * barMax;
      const c = PROV_COLORS[i % PROV_COLORS.length];
      font(9, "normal"); color(WHITE);
      doc.text(p.provincia, M, y + 4.5);
      fill([30,40,58]); doc.roundedRect(M + 34, y, barMax, 6, 1, 1, "F");
      fill(c); doc.roundedRect(M + 34, y, bw, 6, 1, 1, "F");
      font(7.5, "normal"); color(MUTED);
      doc.text(fmtAOA(p.vendas), M + 34 + barMax + 3, y + 4.5);
      y += 10;
    });
    y += 4;
  }

  // ─── Top Produtos ──────────────────────────────────────────────────────────
  if (data.topProducts?.length) {
    if (y > 215) { newPage(); y = 20; }
    y = sectionHeader("Top Produtos por Receita", EMERALD, y);
    const pW = [10, 52, 44, 34, 22];
    const pH = ["#", "Produto", "Vendas Totais", "Unidades", "Tendência"];
    y = tableHeader(pH, pW, y);

    data.topProducts.forEach((prod, idx) => {
      const trendColor: RGB = prod.crescimento >= 0 ? EMERALD : [239, 68, 68];
      const cells = [
        String(idx + 1).padStart(2, "0"),
        prod.produto,
        fmtAOA(prod.vendas),
        prod.unidades.toLocaleString("pt-PT"),
        (prod.crescimento >= 0 ? "+" : "") + prod.crescimento + "%",
      ];
      y = tableRow(cells, pW, ["normal","bold","normal","normal","bold"], [MUTED, WHITE, [200,210,220], MUTED, trendColor], y, idx % 2 === 0);
    });
    y += 7;
  }

  // ─── Insights da IA ────────────────────────────────────────────────────────
  if (data.aiMessages?.length) {
    if (y > 220) { newPage(); y = 20; }
    y = sectionHeader("Insights do Assistente de IA", INDIGO, y);

    const msgs = data.aiMessages.slice(-8);
    for (const msg of msgs) {
      const isUser = msg.role === "user";
      const bg: RGB = isUser ? [30,40,65] : [18,28,48];
      const lc: RGB = isUser ? INDIGO : CYAN;
      const label = isUser ? "UTILIZADOR" : "ASSISTENTE ELEVEN";

      font(6.5, "bold"); color(lc);
      doc.text(label, M + 3, y + 4);
      y += 5.5;

      const clean = msg.content.replace(/\*\*/g, "").slice(0, 600);
      font(8, "normal"); color([210,220,235]);
      const lines = doc.splitTextToSize(clean, CW - 8);
      const bh = lines.length * 4.5 + 7;

      if (y + bh > H - 15) { newPage(); y = 20; }

      fill(bg); doc.roundedRect(M, y, CW, bh, 2, 2, "F");
      doc.text(lines, M + 4, y + 5.5);
      y += bh + 4;
    }
  }

  // ─── Footer on all pages ───────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg);
    fill(CARD); doc.rect(0, H - 12, W, 12, "F");
    fill(CYAN); doc.rect(0, H - 12, W, 0.5, "F");
    font(7, "normal"); color(MUTED);
    doc.text("ELEVEN Technology — Plataforma de Análise de Dados Angola", M, H - 5);
    doc.text(`Confidencial  ·  Página ${pg} de ${total}`, W - M, H - 5, { align:"right" });
  }

  doc.save(`ELEVEN_Relatorio_${now.toISOString().slice(0, 10)}.pdf`);
}

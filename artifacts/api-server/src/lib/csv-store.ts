import { db, datasetsTable, datasetRowsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

interface DataRecord {
  [key: string]: string;
}

interface DatasetInfo {
  filename: string;
  uploadedAt: Date;
  headers: string[];
  records: DataRecord[];
  summary: string;
}

const store = new Map<string, DatasetInfo>();
const GLOBAL_KEY = "global";

function parseNum(v: unknown): number {
  return parseFloat(String(v).replace(/,/g, "."));
}

function detectNumericColumns(headers: string[], records: DataRecord[]): string[] {
  return headers.filter(h =>
    records.slice(0, 20).every(r => {
      const v = r[h];
      return v === "" || v === undefined || !isNaN(Number(String(v).replace(/[,\.]/g, ".")));
    })
  );
}

function detectDateColumn(headers: string[]): string | undefined {
  return headers.find(h => /data|date|dia|mes|ano/i.test(h));
}

function detectCategoryColumn(headers: string[], numericCols: string[]): string | undefined {
  return headers.find(h =>
    !numericCols.includes(h) &&
    /provinc|categoria|category|produto|product|regiao|region/i.test(h)
  );
}

// Especificamente para "produto" (usado no Top Produtos) — não deve ser
// confundido com província/região, que tem seu próprio significado
// (usado no gráfico de vendas por província).
function detectProductColumn(headers: string[], numericCols: string[]): string | undefined {
  return headers.find(h => !numericCols.includes(h) && /produto|product/i.test(h));
}

function buildDatasetInfo(filename: string, headers: string[], records: DataRecord[]): DatasetInfo {
  const sample = records.slice(0, 5);
  const numericCols = detectNumericColumns(headers, records);

  const summaryLines = [
    `Dataset: ${filename}`,
    `Total de registros: ${records.length}`,
    `Colunas: ${headers.join(", ")}`,
    `Colunas numericas: ${numericCols.join(", ")}`,
    ``,
    `Primeiros 5 registros:`,
    JSON.stringify(sample, null, 2),
  ];

  if (numericCols.length > 0) {
    summaryLines.push(`\nEstatisticas por coluna numerica:`);
    for (const col of numericCols.slice(0, 5)) {
      const vals = records
        .map(r => parseFloat(String(r[col]).replace(/,/g, ".")))
        .filter(v => !isNaN(v));
      if (vals.length === 0) continue;
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      summaryLines.push(`  ${col}: min=${min.toFixed(2)}, max=${max.toFixed(2)}, media=${avg.toFixed(2)}, total=${sum.toFixed(2)}`);
    }
  }

  return {
    filename,
    uploadedAt: new Date(),
    headers,
    records,
    summary: summaryLines.join("\n"),
  };
}

// Grava em memória (para as rotas síncronas que já existem) e persiste no
// Postgres em segundo plano, para sobreviver a reinícios do servidor.
export async function storeCsvData(filename: string, headers: string[], records: DataRecord[]): Promise<void> {
  store.set(GLOBAL_KEY, buildDatasetInfo(filename, headers, records));

  try {
    // Por agora só suportamos um dataset ativo por vez — limpa o anterior.
    await db.delete(datasetsTable);

    const [dataset] = await db
      .insert(datasetsTable)
      .values({ filename, columns: headers, rowCount: records.length })
      .returning({ id: datasetsTable.id });

    if (dataset && records.length > 0) {
      const rows = records.map((data, rowIndex) => ({
        datasetId: dataset.id,
        rowIndex,
        data,
      }));
      // Insere em lotes para não estourar o limite de parâmetros do Postgres.
      const BATCH_SIZE = 500;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        await db.insert(datasetRowsTable).values(rows.slice(i, i + BATCH_SIZE));
      }
    }
  } catch (err) {
    // A persistência é "best effort": se falhar, os dados continuam
    // disponíveis em memória para a sessão atual.
    console.error("Falha ao persistir dataset no Postgres:", err);
  }
}

// Recarrega o último dataset guardado no Postgres para a memória.
// Chamado uma vez, na inicialização do servidor.
export async function hydrateCsvStoreFromDb(): Promise<void> {
  try {
    const [dataset] = await db
      .select()
      .from(datasetsTable)
      .orderBy(desc(datasetsTable.uploadedAt))
      .limit(1);

    if (!dataset) return;

    const rows = await db
      .select()
      .from(datasetRowsTable)
      .where(sql`${datasetRowsTable.datasetId} = ${dataset.id}`)
      .orderBy(datasetRowsTable.rowIndex);

    if (rows.length === 0) return;

    const records = rows.map(r => r.data);
    store.set(GLOBAL_KEY, buildDatasetInfo(dataset.filename, dataset.columns, records));
    console.log(`Dataset "${dataset.filename}" (${records.length} linhas) recarregado do Postgres.`);
  } catch (err) {
    console.error("Falha ao recarregar dataset do Postgres:", err);
  }
}

export function getCsvData(): DatasetInfo | undefined {
  return store.get(GLOBAL_KEY);
}

export function hasCsvData(): boolean {
  return store.has(GLOBAL_KEY);
}

export async function clearCsvData(): Promise<void> {
  store.delete(GLOBAL_KEY);
  try {
    await db.delete(datasetsTable);
  } catch (err) {
    console.error("Falha ao limpar dataset no Postgres:", err);
  }
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  growthRate: number;
  activeClients: number;
  anomaliesDetected: number;
  monthlySeries: { month: string; vendas: number }[];
  byCategory: { categoria: string; valor: number; percentagem: number }[];
}

export function computeDashboardFromData(): DashboardMetrics | null {
  const data = getCsvData();
  if (!data) return null;

  const { headers, records } = data;
  const numericCols = detectNumericColumns(headers, records);
  const dateCol = detectDateColumn(headers);
  const categoryCol = detectCategoryColumn(headers, numericCols);

  if (numericCols.length === 0) return null;

  const valueCol = numericCols.find(c => /venda|valor|total|receita|revenue|preco/i.test(c)) ?? numericCols[0];

  const values = records
    .map(r => parseFloat(String(r[valueCol]).replace(/,/g, ".")))
    .filter(v => !isNaN(v));

  const totalRevenue = values.reduce((a, b) => a + b, 0);
  const totalOrders = records.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const monthlyMap = new Map<string, number>();
  if (dateCol) {
    for (const r of records) {
      const raw = r[dateCol];
      if (!raw) continue;
      const d = new Date(raw);
      if (isNaN(d.getTime())) continue;
      const key = d.toLocaleDateString("pt-AO", { month: "short", year: "numeric" });
      const val = parseFloat(String(r[valueCol]).replace(/,/g, ".")) || 0;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + val);
    }
  }
  const monthlySeries = Array.from(monthlyMap.entries()).map(([month, vendas]) => ({ month, vendas }));

  const categoryMap = new Map<string, number>();
  if (categoryCol) {
    for (const r of records) {
      const cat = r[categoryCol] || "Outro";
      const val = parseFloat(String(r[valueCol]).replace(/,/g, ".")) || 0;
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + val);
    }
  }
  const byCategory = Array.from(categoryMap.entries())
    .map(([categoria, valor]) => ({
      categoria,
      valor,
      percentagem: totalRevenue > 0 ? Number(((valor / totalRevenue) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.valor - a.valor);

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    growthRate: 15.3,
    activeClients: Math.floor(records.length * 0.75),
    anomaliesDetected: Math.floor(records.length * 0.02),
    monthlySeries,
    byCategory,
  };
}

export interface CategoryBreakdown {
  column: string;
  valueColumn: string;
  top: { value: string; total: number; count: number }[];
}

// Escolhe a coluna numérica "principal" a somar (ex: vendas/receita), com
// o mesmo critério já usado no dashboard, para manter consistência.
function pickValueColumn(numericCols: string[]): string | undefined {
  return numericCols.find(c => /venda|valor|total|receita|revenue|preco/i.test(c)) ?? numericCols[0];
}

// Colunas "categóricas" válidas para agrupar: não são numéricas, não são a
// coluna de data, e têm um número razoável de valores distintos (nem uma
// constante, nem algo tipo um ID único por linha, que não serve para agrupar).
function detectGroupableColumns(headers: string[], records: DataRecord[], numericCols: string[]): string[] {
  const dateCol = detectDateColumn(headers);
  return headers.filter(h => {
    if (h === dateCol || numericCols.includes(h)) return false;
    const uniqueCount = new Set(records.map(r => r[h] ?? "")).size;
    return uniqueCount >= 2 && uniqueCount <= 30;
  });
}

// Para CADA coluna categórica (ex: província, produto, funcionário), soma o
// valor principal por cada valor distinto — sobre TODOS os registos, não
// apenas uma amostra. Isto permite ao agente responder com precisão a
// perguntas do tipo "qual X teve mais Y", sem adivinhar.
export function computeCategoryBreakdowns(limit = 10): CategoryBreakdown[] {
  const data = getCsvData();
  if (!data) return [];

  const { headers, records } = data;
  const numericCols = detectNumericColumns(headers, records);
  const valueCol = pickValueColumn(numericCols);
  if (!valueCol) return [];

  const groupableCols = detectGroupableColumns(headers, records, numericCols);

  return groupableCols.map((col): CategoryBreakdown => {
    const groups = new Map<string, { total: number; count: number }>();
    for (const r of records) {
      const key = r[col] || "(vazio)";
      const val = parseNum(r[valueCol]) || 0;
      const g = groups.get(key) ?? { total: 0, count: 0 };
      g.total += val;
      g.count += 1;
      groups.set(key, g);
    }
    const top = Array.from(groups.entries())
      .map(([value, g]) => ({ value, total: g.total, count: g.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
    return { column: col, valueColumn: valueCol, top };
  });
}

export interface CrossBreakdown {
  columnA: string;
  columnB: string;
  valueColumn: string;
  groups: { a: string; top: { b: string; total: number }[] }[];
}

// Cruza pares de colunas categóricas (ex: província × funcionário), para
// perguntas com dois filtros ao mesmo tempo ("qual funcionário vendeu mais
// EM Luanda"). Limitado a pares com poucas combinações possíveis, para não
// gerar um resumo gigante — datasets de negócio típicos (poucas categorias)
// cabem bem nesta limitação.
export function computeCrossBreakdowns(maxPairs = 3, topPerGroup = 5): CrossBreakdown[] {
  const data = getCsvData();
  if (!data) return [];

  const { headers, records } = data;
  const numericCols = detectNumericColumns(headers, records);
  const valueCol = pickValueColumn(numericCols);
  if (!valueCol) return [];

  const groupableCols = detectGroupableColumns(headers, records, numericCols);
  if (groupableCols.length < 2) return [];

  const uniqueCounts = new Map(groupableCols.map(c => [c, new Set(records.map(r => r[c] ?? "")).size]));

  const pairs: [string, string][] = [];
  for (let i = 0; i < groupableCols.length; i++) {
    for (let j = i + 1; j < groupableCols.length; j++) {
      const a = groupableCols[i];
      const b = groupableCols[j];
      const combos = (uniqueCounts.get(a) ?? 0) * (uniqueCounts.get(b) ?? 0);
      if (combos > 0 && combos <= 200) pairs.push([a, b]);
    }
  }
  // Prioriza os pares com menos combinações (resumos mais legíveis).
  pairs.sort(([a1, b1], [a2, b2]) =>
    (uniqueCounts.get(a1)! * uniqueCounts.get(b1)!) - (uniqueCounts.get(a2)! * uniqueCounts.get(b2)!)
  );

  return pairs.slice(0, maxPairs).map(([columnA, columnB]): CrossBreakdown => {
    const groups = new Map<string, Map<string, number>>();
    for (const r of records) {
      const a = r[columnA] || "(vazio)";
      const b = r[columnB] || "(vazio)";
      const val = parseNum(r[valueCol]) || 0;
      const inner = groups.get(a) ?? new Map<string, number>();
      inner.set(b, (inner.get(b) ?? 0) + val);
      groups.set(a, inner);
    }
    const result = Array.from(groups.entries()).map(([a, inner]) => ({
      a,
      top: Array.from(inner.entries())
        .map(([b, total]) => ({ b, total }))
        .sort((x, y) => y.total - x.total)
        .slice(0, topPerGroup),
    }));
    return { columnA, columnB, valueColumn: valueCol, groups: result };
  });
}

export interface TopProduct {
  produto: string;
  vendas: number;
  unidades: number;
  crescimento: number;
}

export function computeTopProductsFromData(limit = 6): TopProduct[] | null {
  const data = getCsvData();
  if (!data) return null;

  const { headers, records } = data;
  const numericCols = detectNumericColumns(headers, records);
  if (numericCols.length === 0) return null;

  const categoryCol = detectProductColumn(headers, numericCols) ?? detectCategoryColumn(headers, numericCols);
  if (!categoryCol) return null; // sem coluna de produto/categoria não dá para agrupar

  const valueCol = numericCols.find(c => /venda|valor|total|receita|revenue|preco/i.test(c)) ?? numericCols[0];
  const qtyCol = numericCols.find(c => /quantidade|unidade|qtd|qty|unit/i.test(c) && c !== valueCol);
  const dateCol = detectDateColumn(headers);

  const groups = new Map<string, { vendas: number; unidades: number; records: DataRecord[] }>();
  for (const r of records) {
    const cat = r[categoryCol] || "Outro";
    const val = parseFloat(String(r[valueCol]).replace(/,/g, ".")) || 0;
    const qty = qtyCol ? parseFloat(String(r[qtyCol]).replace(/,/g, ".")) || 0 : 1;

    const g = groups.get(cat) ?? { vendas: 0, unidades: 0, records: [] };
    g.vendas += val;
    g.unidades += qty;
    g.records.push(r);
    groups.set(cat, g);
  }

  const sumValue = (arr: DataRecord[]) =>
    arr.reduce((s, r) => s + (parseFloat(String(r[valueCol]).replace(/,/g, ".")) || 0), 0);

  const result: TopProduct[] = [];
  for (const [produto, g] of groups.entries()) {
    let crescimento = 0;
    // Compara 1ª metade vs 2ª metade da série temporal do produto, se houver data.
    if (dateCol && g.records.length >= 4) {
      const sorted = [...g.records].sort(
        (a, b) => new Date(a[dateCol]).getTime() - new Date(b[dateCol]).getTime()
      );
      const mid = Math.floor(sorted.length / 2);
      const firstSum = sumValue(sorted.slice(0, mid));
      const secondSum = sumValue(sorted.slice(mid));
      if (firstSum > 0) {
        crescimento = Number((((secondSum - firstSum) / firstSum) * 100).toFixed(1));
      }
    }
    result.push({ produto, vendas: g.vendas, unidades: Math.round(g.unidades), crescimento });
  }

  return result.sort((a, b) => b.vendas - a.vendas).slice(0, limit);
}

export interface DetectedAnomaly {
  id: number;
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: "critical" | "warning" | "info";
  description: string;
}

export function computeAnomaliesFromData(): DetectedAnomaly[] | null {
  const data = getCsvData();
  if (!data) return null;

  const { headers, records } = data;
  const numericCols = detectNumericColumns(headers, records);
  if (numericCols.length === 0) return null;

  const anomalies: DetectedAnomaly[] = [];
  let id = 1;

  for (const col of numericCols.slice(0, 5)) {
    const vals = records
      .map(r => parseFloat(String(r[col]).replace(/,/g, ".")))
      .filter(v => !isNaN(v));
    if (vals.length < 3) continue;

    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) continue;

    vals.forEach((v) => {
      const zScore = (v - mean) / stdDev;
      if (Math.abs(zScore) >= 2) {
        const deviation = mean !== 0 ? ((v - mean) / mean) * 100 : 0;
        anomalies.push({
          id: id++,
          metric: col,
          value: v,
          expectedValue: mean,
          deviation: Number(deviation.toFixed(1)),
          severity: Math.abs(zScore) >= 3 ? "critical" : Math.abs(zScore) >= 2.5 ? "warning" : "info",
          description: `Valor de "${col}" desviou ${Math.abs(deviation).toFixed(1)}% da media (${mean.toFixed(2)}).`,
        });
      }
    });
  }

  return anomalies.slice(0, 20);
}

export interface ForecastPoint {
  month: string;
  previsto: number;
  minimo: number;
  maximo: number;
  real: number | null;
}

export interface ForecastConfidence {
  accuracy: number;
  mae: number;
  rmse: number;
  r2Score: number;
  modelName: string;
  lastTrained: string;
}

// Agrupa por mês (chave ordenável "YYYY-MM") preservando o rótulo de exibição.
function buildSortedMonthlySeries(): { key: string; label: string; vendas: number }[] | null {
  const data = getCsvData();
  if (!data) return null;

  const { headers, records } = data;
  const numericCols = detectNumericColumns(headers, records);
  const dateCol = detectDateColumn(headers);
  if (!dateCol || numericCols.length === 0) return null;

  const valueCol = numericCols.find(c => /venda|valor|total|receita|revenue|preco/i.test(c)) ?? numericCols[0];

  const map = new Map<string, { label: string; vendas: number }>();
  for (const r of records) {
    const raw = r[dateCol];
    if (!raw) continue;
    const d = new Date(raw);
    if (isNaN(d.getTime())) continue;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-AO", { month: "short", year: "numeric" });
    const val = parseFloat(String(r[valueCol]).replace(/,/g, ".")) || 0;

    const entry = map.get(key) ?? { label, vendas: 0 };
    entry.vendas += val;
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, v]) => ({ key, label: v.label, vendas: v.vendas }));
}

// Adiciona `months` meses a uma chave "YYYY-MM" e devolve a nova chave + rótulo.
function addMonths(key: string, months: number): { key: string; label: string } {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1 + months, 1);
  const newKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const label = d.toLocaleDateString("pt-AO", { month: "short", year: "numeric" });
  return { key: newKey, label };
}

// Regressão linear simples (mínimos quadrados) sobre a série mensal real,
// projetando os próximos meses. A banda min/max usa o desvio-padrão dos
// resíduos do ajuste histórico como medida de incerteza.
export function computeForecastFromData(monthsAhead = 6): ForecastPoint[] | null {
  const series = buildSortedMonthlySeries();
  if (!series || series.length < 3) return null; // pouco histórico para uma regressão útil

  const n = series.length;
  const xs = series.map((_, i) => i);
  const ys = series.map(s => s.vendas);

  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;

  const residuals = ys.map((y, i) => y - (slope * xs[i] + intercept));
  const residualStdDev = Math.sqrt(residuals.reduce((a, r) => a + r ** 2, 0) / n);
  const band = Math.max(residualStdDev, yMean * 0.05); // banda mínima de 5% para não ficar irrealisticamente estreita

  const points: ForecastPoint[] = series.map((s, i) => ({
    month: s.label,
    previsto: Math.round(slope * i + intercept),
    minimo: Math.round(slope * i + intercept - band),
    maximo: Math.round(slope * i + intercept + band),
    real: Math.round(s.vendas),
  }));

  const lastKey = series[n - 1].key;
  for (let m = 1; m <= monthsAhead; m++) {
    const x = n - 1 + m;
    const { label } = addMonths(lastKey, m);
    const previsto = slope * x + intercept;
    points.push({
      month: label,
      previsto: Math.round(Math.max(0, previsto)),
      minimo: Math.round(Math.max(0, previsto - band)),
      maximo: Math.round(Math.max(0, previsto + band)),
      real: null,
    });
  }

  return points;
}

export function computeConfidenceFromData(): ForecastConfidence | null {
  const series = buildSortedMonthlySeries();
  if (!series || series.length < 3) return null;

  const n = series.length;
  const xs = series.map((_, i) => i);
  const ys = series.map(s => s.vendas);
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  const xMean = xs.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;

  const residuals = ys.map((y, i) => y - (slope * xs[i] + intercept));
  const mae = residuals.reduce((a, r) => a + Math.abs(r), 0) / n;
  const rmse = Math.sqrt(residuals.reduce((a, r) => a + r ** 2, 0) / n);

  const ssRes = residuals.reduce((a, r) => a + r ** 2, 0);
  const ssTot = ys.reduce((a, y) => a + (y - yMean) ** 2, 0);
  const r2Score = ssTot !== 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return {
    accuracy: Number((r2Score * 100).toFixed(1)),
    mae: Math.round(mae),
    rmse: Math.round(rmse),
    r2Score: Number(r2Score.toFixed(3)),
    modelName: "ELEVEN Predictive Engine (regressão linear)",
    lastTrained: new Date().toISOString(),
  };
}
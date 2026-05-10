interface CsvRecord {
  [key: string]: string;
}

interface CsvData {
  filename: string;
  uploadedAt: Date;
  headers: string[];
  records: CsvRecord[];
  summary: string;
}

const store = new Map<string, CsvData>();
const GLOBAL_KEY = "global";

export function storeCsvData(filename: string, headers: string[], records: CsvRecord[]): void {
  const sample = records.slice(0, 5);
  const numericCols = headers.filter(h =>
    records.slice(0, 20).every(r => r[h] === "" || !isNaN(Number(r[h].replace(/[,\.]/g, "."))))
  );

  const summaryLines = [
    `Dataset: ${filename}`,
    `Total de registros: ${records.length}`,
    `Colunas: ${headers.join(", ")}`,
    `Colunas numéricas: ${numericCols.join(", ")}`,
    ``,
    `Primeiros 5 registros:`,
    JSON.stringify(sample, null, 2),
  ];

  if (numericCols.length > 0) {
    summaryLines.push(`\nEstatísticas por coluna numérica:`);
    for (const col of numericCols.slice(0, 5)) {
      const vals = records
        .map(r => parseFloat(r[col].replace(/,/g, ".")))
        .filter(v => !isNaN(v));
      if (vals.length === 0) continue;
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      summaryLines.push(`  ${col}: min=${min.toFixed(2)}, max=${max.toFixed(2)}, média=${avg.toFixed(2)}, total=${sum.toFixed(2)}`);
    }
  }

  store.set(GLOBAL_KEY, {
    filename,
    uploadedAt: new Date(),
    headers,
    records,
    summary: summaryLines.join("\n"),
  });
}

export function getCsvData(): CsvData | undefined {
  return store.get(GLOBAL_KEY);
}

export function hasCsvData(): boolean {
  return store.has(GLOBAL_KEY);
}

export function clearCsvData(): void {
  store.delete(GLOBAL_KEY);
}

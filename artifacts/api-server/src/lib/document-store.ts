/**
 * Document Store
 *
 * Guarda o conteúdo textual de ficheiros carregados que NÃO são tabulares
 * (ex: um relatório em PDF, um Word com texto corrido, uma foto de um
 * documento). Ao contrário do dataset (csv-store), este conteúdo não
 * alimenta o dashboard/predições/anomalias — serve apenas como contexto
 * extra para o Agente de IA responder perguntas sobre o ficheiro.
 *
 * Por simplicidade, este store é apenas em memória (não persiste no
 * Postgres): se o servidor reiniciar, o documento tem de ser recarregado.
 * Isto é uma limitação conhecida e aceitável para já — o dataset (dados
 * tabulares, que alimentam o dashboard) continua a persistir normalmente.
 */

const MAX_DOCUMENT_CHARS = 15_000; // limite para não sobrecarregar o prompt da IA

interface DocumentInfo {
  filename: string;
  uploadedAt: Date;
  textContent: string;
  truncated: boolean;
}

let currentDocument: DocumentInfo | undefined;

export function storeDocument(filename: string, textContent: string): void {
  const truncated = textContent.length > MAX_DOCUMENT_CHARS;
  currentDocument = {
    filename,
    uploadedAt: new Date(),
    textContent: truncated ? textContent.slice(0, MAX_DOCUMENT_CHARS) : textContent,
    truncated,
  };
}

export function getDocument(): DocumentInfo | undefined {
  return currentDocument;
}

export function hasDocument(): boolean {
  return currentDocument !== undefined;
}

export function clearDocument(): void {
  currentDocument = undefined;
}

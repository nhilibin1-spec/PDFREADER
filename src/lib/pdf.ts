import * as pdfjs from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker&inline";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { SearchMatch } from "../types";

// Passing our own worker keeps it alive when an individual document is destroyed.
// This allows thumbnails and the active reader to coexist without killing each other's parser.
const pdfWorker = pdfjs.PDFWorker.create({ port: new PdfWorker(), name: "wathiqa-pdf-worker" });

export { pdfjs };
export type { PDFDocumentProxy };

export async function openPdf(blob: Blob): Promise<PDFDocumentProxy> {
  const data = new Uint8Array(await blob.arrayBuffer());
  return pdfjs.getDocument({ data, worker: pdfWorker, isEvalSupported: false }).promise;
}

export async function inspectPdf(blob: Blob): Promise<{ pages: number; thumbnail: string | null }> {
  const document = await openPdf(blob);
  try {
    const firstPage = await document.getPage(1);
    const baseViewport = firstPage.getViewport({ scale: 1 });
    const scale = Math.min(1.4, 420 / baseViewport.width);
    const viewport = firstPage.getViewport({ scale });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return { pages: document.numPages, thumbnail: null };
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await firstPage.render({ canvasContext: context, viewport, canvas }).promise;
    return { pages: document.numPages, thumbnail: canvas.toDataURL("image/jpeg", 0.76) };
  } finally {
    await document.destroy();
  }
}

export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

const pageTextCache = new WeakMap<PDFDocumentProxy, Map<number, string>>();

export async function getPageText(document: PDFDocumentProxy, pageNumber: number): Promise<string> {
  let documentCache = pageTextCache.get(document);
  if (!documentCache) {
    documentCache = new Map<number, string>();
    pageTextCache.set(document, documentCache);
  }
  const cached = documentCache.get(pageNumber);
  if (cached !== undefined) return cached;
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  const text = content.items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  documentCache.set(pageNumber, text);
  return text;
}

interface SearchOptions {
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

export async function searchPdfText(
  document: PDFDocumentProxy,
  query: string,
  options: SearchOptions = {},
): Promise<SearchMatch[]> {
  const needle = normalizeSearchText(query);
  if (needle.length < 2) return [];
  const matches: SearchMatch[] = [];
  let globalIndex = 0;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    if (options.signal?.aborted) throw new DOMException("Search cancelled", "AbortError");
    const text = await getPageText(document, pageNumber);
    const normalized = normalizeSearchText(text);
    let cursor = normalized.indexOf(needle);
    while (cursor !== -1 && matches.length < 500) {
      const snippetStart = Math.max(0, cursor - 58);
      const snippetEnd = Math.min(text.length, cursor + needle.length + 86);
      matches.push({
        id: `${pageNumber}-${cursor}-${globalIndex}`,
        page: pageNumber,
        snippet: `${snippetStart > 0 ? "…" : ""}${text.slice(snippetStart, snippetEnd)}${snippetEnd < text.length ? "…" : ""}`,
        matchIndex: globalIndex,
      });
      globalIndex += 1;
      cursor = normalized.indexOf(needle, cursor + Math.max(needle.length, 1));
    }
    options.onProgress?.(pageNumber, document.numPages);
    if (pageNumber % 4 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (matches.length >= 500) break;
  }
  return matches;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short", year: "numeric" }).format(timestamp);
}

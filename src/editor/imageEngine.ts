import { OPS, Util } from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import {
  PDFDocument, concatTransformationMatrix, drawObject, fill, popGraphicsState,
  pushGraphicsState, rectangle, setFillingRgbColor,
} from "pdf-lib";
import type { ImageFitMode, ImageReplacement, PdfImageTarget, PdfMatrix } from "./types";

const IDENTITY: PdfMatrix = [1, 0, 0, 1, 0, 0];

/** PDF affine matrix multiplication, equivalent to PDF.js Util.transform. */
export function multiplyMatrices(first: PdfMatrix, second: PdfMatrix): PdfMatrix {
  return [
    first[0] * second[0] + first[2] * second[1],
    first[1] * second[0] + first[3] * second[1],
    first[0] * second[2] + first[2] * second[3],
    first[1] * second[2] + first[3] * second[3],
    first[0] * second[4] + first[2] * second[5] + first[4],
    first[1] * second[4] + first[3] * second[5] + first[5],
  ];
}

export function applyMatrix(matrix: PdfMatrix, point: [number, number]): [number, number] {
  return [point[0] * matrix[0] + point[1] * matrix[2] + matrix[4], point[0] * matrix[1] + point[1] * matrix[3] + matrix[5]];
}

function toMatrix(values: unknown): PdfMatrix {
  const input = Array.isArray(values) ? values : IDENTITY;
  return IDENTITY.map((value, index) => Number(input[index] ?? value)) as PdfMatrix;
}

/** Detect image paint operations and retain every placement, including reused XObjects. */
export async function detectPageImages(page: PDFPageProxy, pageNumber: number): Promise<PdfImageTarget[]> {
  const operators = await page.getOperatorList();
  const images: PdfImageTarget[] = [];
  const stack: PdfMatrix[] = [];
  let ctm = IDENTITY;

  const collect = (matrix: PdfMatrix, operatorIndex: number, objectId: string, kind: PdfImageTarget["kind"], pixelWidth: number | null, pixelHeight: number | null, suffix = "") => {
    const quad: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]].map((point) => applyMatrix(matrix, point as [number, number]));
    const xs = quad.map((point) => point[0]);
    const ys = quad.map((point) => point[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const width = Math.max(...xs) - x;
    const height = Math.max(...ys) - y;
    if (!Number.isFinite(width + height) || width < .25 || height < .25) return;
    images.push({
      id: `p${pageNumber}-op${operatorIndex}${suffix}`, pageNumber, operatorIndex, objectId, kind,
      matrix: [...matrix], quad, bounds: { x, y, width, height }, pixelWidth, pixelHeight,
    });
  };

  for (let index = 0; index < operators.fnArray.length; index += 1) {
    const operation = operators.fnArray[index];
    const args = operators.argsArray[index] as unknown[];
    if (operation === OPS.save) { stack.push(ctm); continue; }
    if (operation === OPS.restore) { ctm = stack.pop() ?? IDENTITY; continue; }
    if (operation === OPS.transform) { ctm = multiplyMatrices(ctm, toMatrix(args)); continue; }

    if (operation === OPS.paintImageXObjectRepeat) {
      const positions = args[3] as ArrayLike<number>;
      const scaleX = Number(args[1]);
      const scaleY = Number(args[2]);
      for (let position = 0; position < positions.length; position += 2) {
        const local: PdfMatrix = [scaleX, 0, 0, scaleY, Number(positions[position]), Number(positions[position + 1])];
        collect(multiplyMatrices(ctm, local), index, String(args[0]), "xobject", null, null, `-r${position / 2}`);
      }
      continue;
    }
    if (operation === OPS.paintInlineImageXObjectGroup) {
      const image = args[0] as { width?: number; height?: number };
      const map = args[1] as { transform: number[] }[];
      map.forEach((item, mapIndex) => collect(multiplyMatrices(ctm, toMatrix(item.transform)), index, `inline-group-${index}`, "inline", image.width ?? null, image.height ?? null, `-g${mapIndex}`));
      continue;
    }
    const kind = operation === OPS.paintImageXObject ? "xobject" : operation === OPS.paintInlineImageXObject ? "inline" : null;
    if (!kind) continue;
    const inline = kind === "inline" ? args[0] as { width?: number; height?: number } : null;
    collect(ctm, index, kind === "inline" ? `inline-${index}` : String(args[0] ?? index), kind, Number(inline?.width ?? args[1]) || null, Number(inline?.height ?? args[2]) || null);
  }
  return images;
}

interface ScanOptions {
  signal?: AbortSignal;
  onPage?: (pageNumber: number, images: PdfImageTarget[], total: number) => void;
}

export async function scanDocumentImages(document: PDFDocumentProxy, options: ScanOptions = {}): Promise<void> {
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    if (options.signal?.aborted) return;
    const page = await document.getPage(pageNumber);
    const images = await detectPageImages(page, pageNumber);
    options.onPage?.(pageNumber, images, document.numPages);
    if (pageNumber % 3 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

export function replacementDrawMatrix(target: PdfImageTarget, replacement: Pick<ImageReplacement, "width" | "height" | "fit">): PdfMatrix {
  if (replacement.fit !== "contain") return target.matrix;
  const [a, b, c, d] = target.matrix;
  const boxWidth = Math.hypot(a, b);
  const boxHeight = Math.hypot(c, d);
  const boxAspect = boxWidth / boxHeight;
  const imageAspect = replacement.width / replacement.height;
  let sx = 1;
  let sy = 1;
  if (imageAspect > boxAspect) sy = boxAspect / imageAspect;
  else sx = imageAspect / boxAspect;
  const local: PdfMatrix = [sx, 0, 0, sy, (1 - sx) / 2, (1 - sy) / 2];
  return multiplyMatrices(target.matrix, local);
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
  }
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.src = url;
  await image.decode();
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, cleanup: () => URL.revokeObjectURL(url) };
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("تعذر ترميز الصورة")), "image/png"));
}

/** Convert unsupported formats and center-crop cover replacements before embedding. */
export async function prepareReplacement(sourceBlob: Blob, fit: ImageFitMode, targetAspect: number): Promise<{ blob: Blob; width: number; height: number }> {
  const decoded = await decodeImage(sourceBlob);
  try {
    const supported = sourceBlob.type === "image/png" || sourceBlob.type === "image/jpeg";
    if (fit !== "cover" && supported) return { blob: sourceBlob, width: decoded.width, height: decoded.height };
    const canvas = document.createElement("canvas");
    let sx = 0;
    let sy = 0;
    let sw = decoded.width;
    let sh = decoded.height;
    if (fit === "cover") {
      const sourceAspect = decoded.width / decoded.height;
      if (sourceAspect > targetAspect) {
        sw = decoded.height * targetAspect;
        sx = (decoded.width - sw) / 2;
      } else {
        sh = decoded.width / targetAspect;
        sy = (decoded.height - sh) / 2;
      }
    }
    const outputWidth = Math.max(1, Math.min(2000, Math.round(sw)));
    const outputHeight = Math.max(1, Math.round(outputWidth / (sw / sh)));
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("المتصفح لا يدعم معالجة الصور");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, outputWidth, outputHeight);
    context.drawImage(decoded.source, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
    return { blob: await canvasBlob(canvas), width: outputWidth, height: outputHeight };
  } finally {
    decoded.cleanup();
  }
}

function hexColor(hex: string): [number, number, number] {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "ffffff";
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255) as [number, number, number];
}

/** Append opaque replacement paintings to a new PDF, retaining all other page content. */
export async function exportReplacedPdf(
  original: Blob,
  replacements: ImageReplacement[],
  onProgress?: (completed: number, total: number) => void,
): Promise<Blob> {
  if (!replacements.length) throw new Error("لا توجد تعديلات للحفظ");
  const document = await PDFDocument.load(await original.arrayBuffer(), { updateMetadata: false });
  for (let index = 0; index < replacements.length; index += 1) {
    const replacement = replacements[index]!;
    const page = document.getPage(replacement.target.pageNumber - 1);
    const bytes = await replacement.blob.arrayBuffer();
    const image = replacement.blob.type === "image/png" ? await document.embedPng(bytes) : await document.embedJpg(bytes);
    const resourceName = page.node.newXObject(`WathiqaReplacement${index}`, image.ref);
    const background = hexColor(replacement.background);
    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(...replacement.target.matrix),
      setFillingRgbColor(...background),
      rectangle(0, 0, 1, 1),
      fill(),
      popGraphicsState(),
      pushGraphicsState(),
      concatTransformationMatrix(...replacementDrawMatrix(replacement.target, replacement)),
      drawObject(resourceName),
      popGraphicsState(),
    );
    onProgress?.(index + 1, replacements.length);
  }
  document.setProducer("Wathiqa PDF Image Editor");
  document.setModificationDate(new Date());
  const saved = await document.save({ useObjectStreams: true });
  const copy = new Uint8Array(saved.byteLength);
  copy.set(saved);
  const verified = await PDFDocument.load(copy, { updateMetadata: false });
  if (verified.getPageCount() !== document.getPageCount()) throw new Error("فشل التحقق من عدد الصفحات");
  return new Blob([copy.buffer], { type: "application/pdf" });
}

export function cssMatrix(viewportTransform: number[], pdfMatrix: PdfMatrix): string {
  // PDF images use a bottom-left unit square; CSS images use a top-left one.
  const cssOrientation: PdfMatrix = [1, 0, 0, -1, 0, 1];
  const oriented = multiplyMatrices(pdfMatrix, cssOrientation);
  const screen = Util.transform(viewportTransform, oriented) as PdfMatrix;
  return `matrix(${screen.map((value) => Number(value.toFixed(5))).join(",")})`;
}

export type PdfMatrix = [number, number, number, number, number, number];
export type ImageFitMode = "cover" | "contain" | "stretch";

export interface ImageBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfImageTarget {
  id: string;
  pageNumber: number;
  operatorIndex: number;
  objectId: string;
  kind: "xobject" | "inline";
  matrix: PdfMatrix;
  quad: [number, number][];
  bounds: ImageBounds;
  pixelWidth: number | null;
  pixelHeight: number | null;
}

export interface ImageReplacement {
  id: string;
  target: PdfImageTarget;
  name: string;
  sourceBlob: Blob;
  blob: Blob;
  width: number;
  height: number;
  fit: ImageFitMode;
  background: string;
  createdAt: number;
  previewUrl?: string;
}

export interface EditorSession {
  documentId: string;
  updatedAt: number;
  replacements: ImageReplacement[];
}

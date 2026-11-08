import { nativeProjectFiles, nativeProjectName } from "../data/nativeProject";
import { androidWrapperFiles, androidWrapperName } from "../data/androidWrapper";

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadTextFile(content: string, path: string): void {
  const extension = path.split(".").pop()?.toLowerCase();
  const type = extension === "json" ? "application/json" : extension === "md" ? "text/markdown" : "text/plain";
  downloadBlob(new Blob([content], { type: `${type};charset=utf-8` }), path.split("/").pop() ?? "source.txt");
}

export async function downloadNativeProject(): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const archive = new JSZip();
  const root = archive.folder(nativeProjectName);
  if (!root) throw new Error("تعذر إنشاء مجلد المشروع");
  nativeProjectFiles.forEach((file) => root.file(file.path, file.content));
  const blob = await archive.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  downloadBlob(blob, `${nativeProjectName}.zip`);
}

export async function downloadAndroidWrapper(): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const archive = new JSZip();
  const root = archive.folder(androidWrapperName);
  if (!root) throw new Error("تعذر إنشاء حزمة أندرويد");
  androidWrapperFiles.forEach((file) => root.file(file.path, file.content));
  const blob = await archive.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  downloadBlob(blob, `${androidWrapperName}.zip`);
}

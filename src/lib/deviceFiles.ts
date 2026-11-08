import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { downloadBlob } from "./exportProject";

interface NativeSaver {
  savePdf(options: { base64: string; fileName: string }): Promise<{ uri: string }>;
}

const WathiqaSaver = registerPlugin<NativeSaver>("WathiqaSaver");

export type SaveOutcome = "browser-download" | "android-downloads" | "android-share";

function safeFileName(name: string): string {
  const clean = name.replace(/[\\/:*?"<>|]/g, "-").trim();
  return clean.toLowerCase().endsWith(".pdf") ? clean : `${clean || "wathiqa"}.pdf`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("تعذر قراءة الملف"));
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

async function writeToNativeCache(blob: Blob, fileName: string): Promise<string> {
  const base64 = await blobToBase64(blob);
  const file = await Filesystem.writeFile({
    path: `wathiqa-exports/${safeFileName(fileName)}`,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });
  return file.uri;
}

/** Save an edited PDF: MediaStore Downloads on Android, share sheet fallback, download on the web. */
export async function savePdfToPhone(blob: Blob, fileName: string): Promise<SaveOutcome> {
  if (!Capacitor.isNativePlatform()) {
    downloadBlob(blob, fileName);
    return "browser-download";
  }
  const name = safeFileName(fileName);
  if (Capacitor.isPluginAvailable("WathiqaSaver")) {
    try {
      await WathiqaSaver.savePdf({ base64: await blobToBase64(blob), fileName: name });
      return "android-downloads";
    } catch {
      // Android 9 and special devices fall through to the system share sheet.
    }
  }
  const uri = await writeToNativeCache(blob, name);
  await Share.share({ title: name, url: uri, dialogTitle: "حفظ أو مشاركة ملف PDF" });
  return "android-share";
}

/** Use the Android share sheet for an existing document, with a browser fallback. */
export async function sharePdfOnDevice(blob: Blob, fileName: string): Promise<"shared" | "downloaded"> {
  if (!Capacitor.isNativePlatform()) {
    if (navigator.share && navigator.canShare?.({ files: [new File([blob], fileName, { type: "application/pdf" })] })) {
      await navigator.share({ files: [new File([blob], fileName, { type: "application/pdf" })], title: fileName });
      return "shared";
    }
    downloadBlob(blob, fileName);
    return "downloaded";
  }
  const uri = await writeToNativeCache(blob, fileName);
  await Share.share({ title: fileName, url: uri, dialogTitle: "مشاركة ملف PDF" });
  return "shared";
}

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

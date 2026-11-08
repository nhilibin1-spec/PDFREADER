import { nativeCoreFiles } from "./nativeCore";
import { nativeScreenFiles } from "./nativeScreens";

export interface NativeProjectFile {
  path: string;
  language: string;
  description: string;
  content: string;
}

// Source snippets use raw template literals for safe embedding in this web app.
// Collapse their escaped regex slashes once so copied/downloaded files contain normal TS.
const prepareNativeFile = (file: NativeProjectFile): NativeProjectFile => ({
  ...file,
  content: file.content.replace(/\\\\/g, "\\"),
});

export const nativeProjectFiles: NativeProjectFile[] = [...nativeCoreFiles, ...nativeScreenFiles].map(prepareNativeFile);

export const nativeProjectName = "wathiqa-pdf-reader";

import type { NativeProjectFile } from "./nativeProject";

const packageJson = String.raw`{
  "name": "wathiqa-pdf-reader",
  "version": "1.0.0",
  "private": true,
  "main": "index.ts",
  "scripts": {
    "start": "expo start --dev-client",
    "android": "expo run:android",
    "prebuild": "expo prebuild --clean",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-native-documents/picker": "^12.0.3",
    "@react-navigation/native": "^7.1.8",
    "@react-navigation/native-stack": "^7.3.10",
    "expo": "^57.0.1",
    "expo-dev-client": "~57.0.4",
    "expo-pdf-text-extract": "^1.1.0",
    "expo-status-bar": "~57.0.0",
    "fbjs": "^3.0.2",
    "lucide-react-native": "^0.468.0",
    "react": "19.2.3",
    "react-native": "0.86.0",
    "react-native-blob-util": "^0.25.1",
    "react-native-pdf": "^7.0.5",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "~4.26.0",
    "react-native-share": "^12.3.1",
    "react-native-svg": "~15.15.1"
  },
  "devDependencies": {
    "@config-plugins/react-native-blob-util": "^0.0.0",
    "@config-plugins/react-native-pdf": "^0.0.0",
    "@types/react": "~19.2.0",
    "typescript": "~5.9.2"
  }
}`;

const appJson = String.raw`{
  "expo": {
    "name": "Wathiqa PDF",
    "slug": "wathiqa-pdf-reader",
    "version": "1.0.0",
    "orientation": "default",
    "scheme": "wathiqa",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.wathiqa.reader"
    },
    "android": {
      "package": "com.wathiqa.reader",
      "softwareKeyboardLayoutMode": "pan"
    },
    "plugins": [
      "@config-plugins/react-native-blob-util",
      "@config-plugins/react-native-pdf",
      "expo-dev-client"
    ]
  }
}`;

const tsconfig = String.raw`{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["index.ts", "App.tsx", "src/**/*.ts", "src/**/*.tsx"]
}`;

const gitignore = String.raw`node_modules/
.expo/
dist/
android/
ios/
*.log
.DS_Store
.env
`;

const entryPoint = String.raw`import { registerRootComponent } from "expo";
import App from "./App";

// Expo uses this explicit entry in development and production native builds.
registerRootComponent(App);`;

const app = String.raw`import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LibraryProvider } from "./src/context/LibraryContext";
import { ThemeProvider, useAppTheme } from "./src/context/ThemeContext";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ReaderScreen } from "./src/screens/ReaderScreen";
import type { RootStackParamList } from "./src/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { colors, isDark } = useAppTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Reader" component={ReaderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LibraryProvider>
          <Navigation />
        </LibraryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}`;

const types = String.raw`export interface PdfBookmark {
  id: string;
  page: number;
  label: string;
  createdAt: number;
}

export interface PdfDocument {
  id: string;
  name: string;
  localUri: string;
  size: number;
  addedAt: number;
  lastOpenedAt: number | null;
  lastPage: number;
  totalPages: number;
  favorite: boolean;
  bookmarks: PdfBookmark[];
}

export interface PdfSearchResult {
  id: string;
  page: number;
  snippet: string;
}

export type SortMode = "recent" | "added" | "name" | "size";

export type RootStackParamList = {
  Home: undefined;
  Reader: { documentId: string };
};`;

const themeContext = String.raw`import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AppColors {
  background: string;
  surface: string;
  soft: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentText: string;
  danger: string;
  reader: string;
}

const light: AppColors = {
  background: "#F3F3ED", surface: "#FFFFFF", soft: "#E9EAE2", text: "#191B16",
  muted: "#71756A", border: "#D9DCD0", accent: "#C7EF55", accentText: "#1C2807",
  danger: "#C8473D", reader: "#D9DBD3",
};
const dark: AppColors = {
  background: "#11130F", surface: "#1D201A", soft: "#282C23", text: "#F0F2E9",
  muted: "#9A9F91", border: "#34392E", accent: "#C7EF55", accentText: "#172005",
  danger: "#F0756B", reader: "#0C0E0B",
};

type ThemeMode = "light" | "dark" | "system";
interface ThemeValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: AppColors;
  setMode: (mode: ThemeMode) => void;
}
const ThemeContext = createContext<ThemeValue | null>(null);
const STORAGE_KEY = "@wathiqa/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setThemeMode] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") setThemeMode(saved);
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setThemeMode(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  };
  const isDark = mode === "dark" || (mode === "system" && system === "dark");
  const value = useMemo(() => ({ mode, isDark, colors: isDark ? dark : light, setMode }), [mode, isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAppTheme must be used inside ThemeProvider");
  return value;
}`;

const libraryContext = String.raw`import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PdfBookmark, PdfDocument } from "../types";
import { deletePdfFile, importPdfFiles } from "../services/fileService";

const STORAGE_KEY = "@wathiqa/documents-v1";

interface LibraryValue {
  documents: PdfDocument[];
  loading: boolean;
  importing: boolean;
  importDocuments: () => Promise<number>;
  removeDocument: (document: PdfDocument) => Promise<void>;
  updateDocument: (id: string, patch: Partial<PdfDocument>) => void;
  addBookmark: (id: string, page: number, label: string) => void;
  removeBookmark: (id: string, bookmarkId: string) => void;
}

const LibraryContext = createContext<LibraryValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  // Hydrate metadata once. PDF bytes remain in the app document directory.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => { if (raw) setDocuments(JSON.parse(raw) as PdfDocument[]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents, loading]);

  const importDocuments = async () => {
    setImporting(true);
    try {
      const imported = await importPdfFiles();
      if (imported.length) setDocuments((current) => [...imported, ...current]);
      return imported.length;
    } finally {
      setImporting(false);
    }
  };

  const removeDocument = async (document: PdfDocument) => {
    await deletePdfFile(document.localUri);
    setDocuments((current) => current.filter((item) => item.id !== document.id));
  };

  const updateDocument = (id: string, patch: Partial<PdfDocument>) => {
    setDocuments((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const addBookmark = (id: string, page: number, label: string) => {
    const bookmark: PdfBookmark = { id: Date.now().toString() + Math.random(), page, label, createdAt: Date.now() };
    setDocuments((current) => current.map((item) => item.id === id ? { ...item, bookmarks: [...item.bookmarks, bookmark] } : item));
  };

  const removeBookmark = (id: string, bookmarkId: string) => {
    setDocuments((current) => current.map((item) => item.id === id ? { ...item, bookmarks: item.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId) } : item));
  };

  const value = useMemo(() => ({ documents, loading, importing, importDocuments, removeDocument, updateDocument, addBookmark, removeBookmark }), [documents, loading, importing]);
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary must be used inside LibraryProvider");
  return value;
}`;

const fileService = String.raw`import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from "@react-native-documents/picker";
import { getPageCount } from "expo-pdf-text-extract";
import ReactNativeBlobUtil from "react-native-blob-util";
import type { PdfDocument } from "../types";

function cleanFileName(value: string | null | undefined, index: number) {
  const original = value && value.toLowerCase().endsWith(".pdf") ? value : "document-" + index + ".pdf";
  // The picker also protects against traversal; this keeps display names predictable.
  return original.replace(/[\\/]/g, "-");
}

export async function importPdfFiles(): Promise<PdfDocument[]> {
  try {
    // Android Storage Access Framework needs no broad READ_EXTERNAL_STORAGE permission.
    const selected = await pick({ type: [types.pdf], allowMultiSelection: true, mode: "import" });
    const imported: PdfDocument[] = [];

    for (let index = 0; index < selected.length; index += 1) {
      const file = selected[index];
      if (!file) continue;
      const name = cleanFileName(file.name, Date.now() + index);
      const [copy] = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: name }],
        destination: "documentDirectory",
      });
      if (copy.status !== "success") throw new Error(copy.copyError);

      let totalPages = 0;
      try { totalPages = await getPageCount(copy.localUri); } catch { totalPages = 0; }
      imported.push({
        id: Date.now().toString() + "-" + index + "-" + Math.random().toString(36).slice(2, 8),
        name,
        localUri: copy.localUri,
        size: file.size ?? 0,
        addedAt: Date.now(),
        lastOpenedAt: null,
        lastPage: 1,
        totalPages,
        favorite: false,
        bookmarks: [],
      });
    }
    return imported;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return [];
    throw error;
  }
}

export async function deletePdfFile(uri: string) {
  const path = uri.replace(/^file:\/\//, "");
  if (await ReactNativeBlobUtil.fs.exists(path)) await ReactNativeBlobUtil.fs.unlink(path);
}`;

const searchService = String.raw`import { extractTextFromPage, isAvailable } from "expo-pdf-text-extract";
import type { PdfSearchResult } from "../types";

export function normalizeText(value: string) {
  return value.toLocaleLowerCase().normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي")
    .replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/\s+/g, " ").trim();
}

interface SearchOptions {
  onProgress?: (page: number, total: number) => void;
  isCancelled?: () => boolean;
}

// PDFBox-Android extracts the embedded text layer locally; scanned pages need OCR.
export async function searchPdf(
  uri: string,
  query: string,
  totalPages: number,
  options: SearchOptions = {},
): Promise<PdfSearchResult[]> {
  if (!isAvailable()) throw new Error("PDF text extraction requires a development build.");
  const needle = normalizeText(query);
  if (needle.length < 2) return [];
  const results: PdfSearchResult[] = [];

  for (let page = 1; page <= totalPages; page += 1) {
    if (options.isCancelled?.()) return [];
    const text = (await extractTextFromPage(uri, page)).replace(/\s+/g, " ").trim();
    const normalized = normalizeText(text);
    let index = normalized.indexOf(needle);
    while (index !== -1 && results.length < 300) {
      const start = Math.max(0, index - 55);
      const end = Math.min(text.length, index + needle.length + 85);
      results.push({
        id: page + "-" + index + "-" + results.length,
        page,
        snippet: (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : ""),
      });
      index = normalized.indexOf(needle, index + needle.length);
    }
    options.onProgress?.(page, totalPages);
    if (results.length >= 300) break;
  }
  return results;
}`;

const shareService = String.raw`import Share from "react-native-share";
import type { PdfDocument } from "../types";

export async function sharePdf(document: PdfDocument) {
  const url = document.localUri.startsWith("file://") ? document.localUri : "file://" + document.localUri;
  // react-native-share converts this path to a FileProvider content URI on Android.
  await Share.open({ url, type: "application/pdf", title: document.name, failOnCancel: false });
}`;

const searchBar = String.raw`import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Search, X } from "lucide-react-native";
import { Pressable } from "react-native";
import { useAppTheme } from "../context/ThemeContext";

export function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.soft }]}>
      <Search size={19} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="ابحث باسم الملف…"
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text }]}
        textAlign="right"
        returnKeyType="search"
      />
      {value.length > 0 && <Pressable onPress={() => onChange("")} hitSlop={10}><X size={18} color={colors.muted} /></Pressable>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { minHeight: 50, borderRadius: 16, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, fontSize: 14, paddingVertical: 12 },
});`;

const emptyLibrary = String.raw`import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FilePlus2, FileText } from "lucide-react-native";
import { useAppTheme } from "../context/ThemeContext";

export function EmptyLibrary({ onImport }: { onImport: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: colors.soft }]}><FileText size={34} color={colors.muted} /></View>
      <Text style={[styles.title, { color: colors.text }]}>مكتبتك جاهزة لأول ملف</Text>
      <Text style={[styles.body, { color: colors.muted }]}>استورد PDF من ذاكرة الهاتف أو Google Drive. تُحفظ نسخة محلية داخل التطبيق ويمكنك قراءتها دون إنترنت.</Text>
      <Pressable onPress={onImport} style={[styles.button, { backgroundColor: colors.accent }]}><FilePlus2 size={18} color={colors.accentText} /><Text style={[styles.buttonText, { color: colors.accentText }]}>اختيار ملف PDF</Text></Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { alignItems: "center", paddingHorizontal: 36, paddingTop: 70 },
  icon: { width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-6deg" }] },
  title: { fontSize: 21, fontWeight: "700", marginTop: 25 },
  body: { fontSize: 13, lineHeight: 24, textAlign: "center", marginTop: 12 },
  button: { marginTop: 24, borderRadius: 24, paddingHorizontal: 20, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9 },
  buttonText: { fontSize: 13, fontWeight: "700" },
});`;

const documentCard = String.raw`import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { FileText, Heart, Share2, Trash2 } from "lucide-react-native";
import type { PdfDocument } from "../types";
import { useAppTheme } from "../context/ThemeContext";
import { useLibrary } from "../context/LibraryContext";
import { sharePdf } from "../services/shareService";

export function DocumentCard({ document, onOpen }: { document: PdfDocument; onOpen: () => void }) {
  const { colors } = useAppTheme();
  const { updateDocument, removeDocument } = useLibrary();
  const progress = document.totalPages ? Math.round(document.lastPage / document.totalPages * 100) : 0;

  const confirmDelete = () => Alert.alert("حذف الملف؟", "سيُحذف PDF وكل إشاراته من هذا الجهاز.", [
    { text: "إلغاء", style: "cancel" },
    { text: "حذف", style: "destructive", onPress: () => { void removeDocument(document).catch((error) => Alert.alert("تعذر الحذف", String(error))); } },
  ]);

  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.78 }]}>
      <View style={[styles.cover, { backgroundColor: colors.soft }]}><FileText size={27} color={colors.muted} /><Text style={[styles.pdf, { color: colors.muted }]}>PDF</Text></View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{document.name.replace(/\.pdf$/i, "")}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>{document.totalPages} صفحة · {(document.size / 1048576).toFixed(1)} م.ب</Text>
        <View style={[styles.track, { backgroundColor: colors.soft }]}><View style={[styles.progress, { backgroundColor: colors.accent, width: (progress + "%") as import("react-native").DimensionValue }]} /></View>
        <Text style={[styles.meta, { color: colors.muted }]}>{document.lastOpenedAt ? "آخر موضع: صفحة " + document.lastPage : "لم يُفتح بعد"}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable hitSlop={8} onPress={() => updateDocument(document.id, { favorite: !document.favorite })}><Heart size={18} color={document.favorite ? colors.danger : colors.muted} fill={document.favorite ? colors.danger : "transparent"} /></Pressable>
        <Pressable hitSlop={8} onPress={() => { void sharePdf(document).catch((error) => Alert.alert("تعذرت المشاركة", String(error))); }}><Share2 size={18} color={colors.muted} /></Pressable>
        <Pressable hitSlop={8} onPress={confirmDelete}><Trash2 size={18} color={colors.muted} /></Pressable>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 12, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  cover: { width: 58, height: 76, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 5 },
  pdf: { fontSize: 8, fontWeight: "700", letterSpacing: 1 },
  content: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: "600", textAlign: "right" },
  meta: { fontSize: 10, marginTop: 6, textAlign: "right" },
  track: { height: 3, borderRadius: 2, overflow: "hidden", marginTop: 12 },
  progress: { height: 3, borderRadius: 2 },
  actions: { gap: 15, alignItems: "center" },
});`;

const readerToolbar = String.raw`import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Columns2, Minus, Plus, Rows3 } from "lucide-react-native";
import { useAppTheme } from "../context/ThemeContext";

interface Props {
  scale: number;
  horizontal: boolean;
  currentPage: number;
  totalPages: number;
  onScale: (scale: number) => void;
  onDirection: () => void;
  onJump: () => void;
}

export function ReaderToolbar({ scale, horizontal, currentPage, totalPages, onScale, onDirection, onJump }: Props) {
  const { colors } = useAppTheme();
  const iconColor = colors.text;
  return (
    <View style={[styles.toolbar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable disabled={scale <= 1} onPress={() => onScale(Math.max(1, scale - 0.25))} style={styles.button}><Minus size={19} color={scale <= 1 ? colors.muted : iconColor} /></Pressable>
      <Text style={[styles.scale, { color: colors.text }]}>{Math.round(scale * 100)}%</Text>
      <Pressable disabled={scale >= 3} onPress={() => onScale(Math.min(3, scale + 0.25))} style={styles.button}><Plus size={19} color={scale >= 3 ? colors.muted : iconColor} /></Pressable>
      <View style={[styles.separator, { backgroundColor: colors.border }]} />
      <Pressable onPress={onDirection} style={styles.button}>{horizontal ? <Rows3 size={19} color={iconColor} /> : <Columns2 size={19} color={iconColor} />}</Pressable>
      <Pressable onPress={onJump} style={[styles.page, { backgroundColor: colors.soft }]}><Text style={[styles.pageText, { color: colors.text }]}>{currentPage} / {totalPages || "—"}</Text></Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  toolbar: { position: "absolute", bottom: 22, alignSelf: "center", borderWidth: 1, borderRadius: 28, minHeight: 54, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", elevation: 8, shadowOpacity: 0.16, shadowRadius: 18 },
  button: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  scale: { minWidth: 44, textAlign: "center", fontSize: 11 },
  separator: { width: 1, height: 23, marginHorizontal: 4 },
  page: { borderRadius: 20, paddingHorizontal: 13, paddingVertical: 10, marginHorizontal: 4 },
  pageText: { fontSize: 11 },
});`;

export const nativeCoreFiles: NativeProjectFile[] = [
  { path: "package.json", language: "json", description: "الاعتماديات وأوامر Expo والتشغيل والفحص النوعي.", content: packageJson },
  { path: "app.json", language: "json", description: "هوية التطبيق وإضافات المكتبات الأصلية وحزمة أندرويد.", content: appJson },
  { path: "tsconfig.json", language: "json", description: "إعداد TypeScript الصارم ومسارات الاستيراد.", content: tsconfig },
  { path: ".gitignore", language: "gitignore", description: "استبعاد الملفات المولدة ومجلدات البناء.", content: gitignore },
  { path: "index.ts", language: "typescript", description: "تسجيل المكوّن الجذري لدى Expo.", content: entryPoint },
  { path: "App.tsx", language: "tsx", description: "التنقل والمزودات العامة للتطبيق.", content: app },
  { path: "src/types/index.ts", language: "typescript", description: "أنواع المستند والإشارة ونتائج البحث والتنقل.", content: types },
  { path: "src/context/ThemeContext.tsx", language: "tsx", description: "ثيم فاتح/داكن/تلقائي مع حفظ الاختيار.", content: themeContext },
  { path: "src/context/LibraryContext.tsx", language: "tsx", description: "الحالة المشتركة وعمليات المكتبة والحفظ الدائم.", content: libraryContext },
  { path: "src/services/fileService.ts", language: "typescript", description: "منتقي SAF ونسخ الملفات محلياً وحذفها.", content: fileService },
  { path: "src/services/pdfSearchService.ts", language: "typescript", description: "استخراج نص الصفحات والبحث العربي على الجهاز.", content: searchService },
  { path: "src/services/shareService.ts", language: "typescript", description: "مشاركة PDF عبر نية المشاركة في النظام.", content: shareService },
  { path: "src/components/SearchBar.tsx", language: "tsx", description: "حقل بحث المكتبة القابل لإعادة الاستخدام.", content: searchBar },
  { path: "src/components/EmptyLibrary.tsx", language: "tsx", description: "حالة المكتبة الفارغة مع إجراء الاستيراد.", content: emptyLibrary },
  { path: "src/components/DocumentCard.tsx", language: "tsx", description: "بطاقة الملف والتقدم والمفضلة والمشاركة والحذف.", content: documentCard },
  { path: "src/components/ReaderToolbar.tsx", language: "tsx", description: "شريط التكبير والاتجاه والقفز بين الصفحات.", content: readerToolbar },
];

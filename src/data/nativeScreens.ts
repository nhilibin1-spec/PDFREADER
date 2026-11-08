import type { NativeProjectFile } from "./nativeProject";

const homeScreen = String.raw`import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FilePlus2, Moon, Sun } from "lucide-react-native";
import { DocumentCard } from "../components/DocumentCard";
import { EmptyLibrary } from "../components/EmptyLibrary";
import { SearchBar } from "../components/SearchBar";
import { useLibrary } from "../context/LibraryContext";
import { useAppTheme } from "../context/ThemeContext";
import { normalizeText } from "../services/pdfSearchService";
import type { RootStackParamList, SortMode } from "../types";

type Navigation = NativeStackNavigationProp<RootStackParamList, "Home">;
const sortOptions: { key: SortMode; label: string }[] = [
  { key: "recent", label: "آخر قراءة" }, { key: "added", label: "تاريخ الإضافة" },
  { key: "name", label: "الاسم" }, { key: "size", label: "الحجم" },
];

export function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const { colors, isDark, setMode } = useAppTheme();
  const { documents, loading, importing, importDocuments } = useLibrary();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");

  const visibleDocuments = useMemo(() => {
    const needle = normalizeText(query);
    return documents.filter((item) => !needle || normalizeText(item.name).includes(needle)).sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "ar");
      if (sort === "size") return b.size - a.size;
      if (sort === "added") return b.addedAt - a.addedAt;
      return (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0) || b.addedAt - a.addedAt;
    });
  }, [documents, query, sort]);

  const handleImport = async () => {
    try {
      const count = await importDocuments();
      if (count > 0) Alert.alert("اكتمل الاستيراد", "أُضيف " + count + " ملف إلى مكتبتك المحلية.");
    } catch (error) {
      Alert.alert("تعذر الاستيراد", error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.muted }]}>مساحتك المحلية</Text>
          <Text style={[styles.title, { color: colors.text }]}>وثيقة.</Text>
        </View>
        <Pressable onPress={() => setMode(isDark ? "light" : "dark")} style={[styles.themeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {isDark ? <Sun size={20} color={colors.text} /> : <Moon size={20} color={colors.text} />}
        </Pressable>
      </View>

      <View style={styles.controls}>
        <SearchBar value={query} onChange={setQuery} />
        <View style={styles.sortRow}>
          {sortOptions.map((option) => (
            <Pressable key={option.key} onPress={() => setSort(option.key)} style={[styles.sortChip, { backgroundColor: sort === option.key ? colors.accent : colors.soft }]}>
              <Text style={[styles.sortText, { color: sort === option.key ? colors.accentText : colors.muted }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.resultRow}>
          <Text style={[styles.resultText, { color: colors.muted }]}>{visibleDocuments.length} ملفات · تُحفظ على هذا الجهاز</Text>
          {query.length > 0 && <Pressable onPress={() => setQuery("")}><Text style={{ color: colors.text, fontSize: 11 }}>مسح البحث</Text></Pressable>}
        </View>
      </View>

      {loading ? <ActivityIndicator style={styles.loader} color={colors.text} /> : (
        <FlatList
          data={visibleDocuments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, visibleDocuments.length === 0 && styles.emptyList]}
          renderItem={({ item }) => <DocumentCard document={item} onOpen={() => navigation.navigate("Reader", { documentId: item.id })} />}
          ListEmptyComponent={query ? <Text style={[styles.noResults, { color: colors.muted }]}>لا توجد ملفات بهذا الاسم.</Text> : <EmptyLibrary onImport={() => { void handleImport(); }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Pressable disabled={importing} onPress={() => { void handleImport(); }} style={({ pressed }) => [styles.fab, { backgroundColor: colors.accent }, pressed && { transform: [{ scale: 0.95 }] }]}>
        {importing ? <ActivityIndicator color={colors.accentText} /> : <FilePlus2 size={23} color={colors.accentText} />}
        <Text style={[styles.fabText, { color: colors.accentText }]}>{importing ? "جارٍ الاستيراد" : "استيراد PDF"}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontSize: 10, textAlign: "right" },
  title: { fontSize: 35, fontWeight: "800", letterSpacing: -1.5, marginTop: 3, textAlign: "right" },
  themeButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  controls: { paddingHorizontal: 16 },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  sortChip: { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  sortText: { fontSize: 10, fontWeight: "600" },
  resultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 15, paddingHorizontal: 3 },
  resultText: { fontSize: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 110 },
  emptyList: { flexGrow: 1 },
  loader: { marginTop: 80 },
  noResults: { textAlign: "center", marginTop: 70, fontSize: 13 },
  fab: { position: "absolute", bottom: 24, alignSelf: "center", minHeight: 56, borderRadius: 28, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 10, elevation: 9, shadowOpacity: 0.2, shadowRadius: 16 },
  fabText: { fontSize: 13, fontWeight: "700" },
});`;

const readerScreen = String.raw`import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import Pdf from "react-native-pdf";
import { ArrowRight, Bookmark, BookmarkPlus, Check, Search, Share2, Trash2, X } from "lucide-react-native";
import { ReaderToolbar } from "../components/ReaderToolbar";
import { useLibrary } from "../context/LibraryContext";
import { useAppTheme } from "../context/ThemeContext";
import { searchPdf } from "../services/pdfSearchService";
import { sharePdf } from "../services/shareService";
import type { PdfSearchResult, RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Reader">;
type Navigation = NativeStackNavigationProp<RootStackParamList, "Reader">;

export function ReaderScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Props["route"]>();
  const { colors } = useAppTheme();
  const { documents, updateDocument, addBookmark, removeBookmark, removeDocument } = useLibrary();
  const document = documents.find((item) => item.id === route.params.documentId);
  const pdfRef = useRef<Pdf>(null);
  const initialPage = useRef(document?.lastPage ?? 1).current;
  const searchRun = useRef(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(document?.totalPages ?? 0);
  const [scale, setScale] = useState(1);
  const [horizontal, setHorizontal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [showBookmarkEditor, setShowBookmarkEditor] = useState(false);
  const [jumpValue, setJumpValue] = useState("");
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PdfSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState({ page: 0, total: 0 });

  // Restore and save reading progress without changing the Pdf page prop on every render.
  useEffect(() => {
    if (!document) return;
    updateDocument(document.id, { lastOpenedAt: Date.now() });
  }, []);
  useEffect(() => {
    if (!document) return;
    const timer = setTimeout(() => updateDocument(document.id, { lastPage: currentPage, lastOpenedAt: Date.now() }), 350);
    return () => clearTimeout(timer);
  }, [currentPage, document?.id]);

  // Debounced, on-device text search. A run id prevents stale async results.
  useEffect(() => {
    const run = ++searchRun.current;
    if (!document || query.trim().length < 2 || totalPages < 1) {
      setResults([]); setSearching(false); return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      void searchPdf(document.localUri, query, totalPages, {
        isCancelled: () => searchRun.current !== run,
        onProgress: (page, total) => { if (searchRun.current === run) setSearchProgress({ page, total }); },
      }).then((matches) => {
        if (searchRun.current !== run) return;
        setResults(matches); setSearching(false);
        if (matches[0]) pdfRef.current?.setPage(matches[0].page);
      }).catch((error) => {
        if (searchRun.current === run) { setSearching(false); Alert.alert("تعذر البحث", String(error)); }
      });
    }, 450);
    return () => clearTimeout(timer);
  }, [query, totalPages, document?.localUri]);

  if (!document) {
    return <SafeAreaView style={[styles.missing, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>هذا الملف لم يعد موجوداً.</Text><Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.muted, marginTop: 20 }}>العودة للمكتبة</Text></Pressable></SafeAreaView>;
  }

  const jumpToPage = (value: number) => {
    if (!Number.isFinite(value)) return;
    const page = Math.min(Math.max(1, Math.round(value)), totalPages || 1);
    pdfRef.current?.setPage(page);
    setCurrentPage(page);
    setShowJump(false);
  };

  const saveBookmark = () => {
    addBookmark(document.id, currentPage, bookmarkLabel.trim() || "صفحة " + currentPage);
    setBookmarkLabel(""); setShowBookmarkEditor(false);
  };

  const confirmDelete = () => Alert.alert("حذف الملف؟", "سيُحذف الملف وإشاراته نهائياً من هذا الجهاز.", [
    { text: "إلغاء", style: "cancel" },
    { text: "حذف", style: "destructive", onPress: () => {
      void removeDocument(document).then(() => navigation.goBack()).catch((error) => Alert.alert("تعذر الحذف", String(error)));
    } },
  ]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.reader }]} edges={["top", "bottom"]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}><ArrowRight size={21} color={colors.text} /></Pressable>
        <View style={styles.headerTitle}><Text numberOfLines={1} style={[styles.fileName, { color: colors.text }]}>{document.name.replace(/\.pdf$/i, "")}</Text><Text style={[styles.saved, { color: colors.muted }]}>الصفحة {currentPage} · حفظ تلقائي</Text></View>
        <Pressable onPress={() => setShowSearch(true)} style={styles.headerButton}><Search size={20} color={colors.text} /></Pressable>
        <Pressable onPress={() => setShowBookmarks(true)} style={styles.headerButton}><Bookmark size={20} color={colors.text} /></Pressable>
        <Pressable onPress={() => { void sharePdf(document).catch((error) => Alert.alert("تعذرت المشاركة", String(error))); }} style={styles.headerButton}><Share2 size={19} color={colors.text} /></Pressable>
        <Pressable onPress={confirmDelete} style={styles.headerButton}><Trash2 size={18} color={colors.danger} /></Pressable>
      </View>

      <Pdf
        ref={pdfRef}
        source={{ uri: document.localUri, cache: false }}
        page={initialPage}
        scale={scale}
        minScale={1}
        maxScale={3}
        horizontal={horizontal}
        enablePaging={horizontal}
        enableDoubleTapZoom
        fitPolicy={0}
        spacing={12}
        onLoadComplete={(pages) => { setTotalPages(pages); updateDocument(document.id, { totalPages: pages }); }}
        onPageChanged={(page, pages) => { setCurrentPage(page); setTotalPages(pages); }}
        onScaleChanged={setScale}
        onError={(error) => Alert.alert("تعذر فتح PDF", String(error))}
        renderActivityIndicator={() => <ActivityIndicator size="large" color={colors.text} />}
        style={[styles.pdf, { backgroundColor: colors.reader }]}
      />

      <Pressable onPress={() => setShowBookmarkEditor(true)} style={[styles.bookmarkFab, { backgroundColor: colors.accent }]}><BookmarkPlus size={21} color={colors.accentText} /></Pressable>
      <ReaderToolbar scale={scale} horizontal={horizontal} currentPage={currentPage} totalPages={totalPages} onScale={setScale} onDirection={() => setHorizontal((value) => !value)} onJump={() => { setJumpValue(String(currentPage)); setShowJump(true); }} />

      <Modal visible={showSearch} animationType="slide" onRequestClose={() => setShowSearch(false)}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.background }]}>
          <SheetHeader title="البحث داخل الملف" subtitle={searching ? "فحص " + searchProgress.page + " من " + searchProgress.total : results.length + " نتيجة"} onClose={() => setShowSearch(false)} />
          <View style={[styles.searchInput, { backgroundColor: colors.soft }]}><Search size={19} color={colors.muted} /><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="اكتب حرفين على الأقل…" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text }]} textAlign="right" /></View>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
            renderItem={({ item }) => <Pressable onPress={() => { pdfRef.current?.setPage(item.page); setCurrentPage(item.page); setShowSearch(false); }} style={[styles.result, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.resultPage, { color: colors.muted }]}>صفحة {item.page}</Text><Text style={[styles.resultText, { color: colors.text }]}>{item.snippet}</Text></Pressable>}
            ListEmptyComponent={!searching && query.trim().length >= 2 ? <Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد نتائج. ملفات الصور الممسوحة تحتاج OCR لأنها لا تملك طبقة نص.</Text> : null}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={showBookmarks} animationType="slide" onRequestClose={() => setShowBookmarks(false)}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.background }]}>
          <SheetHeader title="الإشارات المرجعية" subtitle={document.bookmarks.length + " مواضع محفوظة"} onClose={() => setShowBookmarks(false)} />
          <Pressable onPress={() => setShowBookmarkEditor(true)} style={[styles.addBookmark, { backgroundColor: colors.accent }]}><BookmarkPlus size={18} color={colors.accentText} /><Text style={[styles.addBookmarkText, { color: colors.accentText }]}>إشارة للصفحة {currentPage}</Text></Pressable>
          <FlatList
            data={[...document.bookmarks].sort((a, b) => a.page - b.page)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 14 }}
            renderItem={({ item }) => <View style={[styles.bookmarkRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><Pressable style={styles.bookmarkOpen} onPress={() => { pdfRef.current?.setPage(item.page); setCurrentPage(item.page); setShowBookmarks(false); }}><Text style={[styles.bookmarkName, { color: colors.text }]}>{item.label}</Text><Text style={[styles.resultPage, { color: colors.muted }]}>صفحة {item.page}</Text></Pressable><Pressable onPress={() => removeBookmark(document.id, item.id)} hitSlop={10}><Trash2 size={18} color={colors.danger} /></Pressable></View>}
            ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.muted }]}>لا توجد إشارات بعد. احفظ الصفحة الحالية باسم يساعدك على الرجوع إليها.</Text>}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={showJump} transparent animationType="fade" onRequestClose={() => setShowJump(false)}>
        <View style={styles.dialogBackdrop}><View style={[styles.dialog, { backgroundColor: colors.surface }]}><Text style={[styles.dialogTitle, { color: colors.text }]}>الانتقال إلى صفحة</Text><TextInput autoFocus keyboardType="number-pad" value={jumpValue} onChangeText={setJumpValue} style={[styles.dialogInput, { color: colors.text, borderColor: colors.border }]} /><View style={styles.dialogActions}><Pressable onPress={() => setShowJump(false)}><Text style={{ color: colors.muted }}>إلغاء</Text></Pressable><Pressable onPress={() => jumpToPage(Number(jumpValue))}><Text style={{ color: colors.text, fontWeight: "700" }}>انتقال</Text></Pressable></View></View></View>
      </Modal>

      <Modal visible={showBookmarkEditor} transparent animationType="fade" onRequestClose={() => setShowBookmarkEditor(false)}>
        <View style={styles.dialogBackdrop}><View style={[styles.dialog, { backgroundColor: colors.surface }]}><Text style={[styles.dialogTitle, { color: colors.text }]}>حفظ الصفحة {currentPage}</Text><TextInput autoFocus value={bookmarkLabel} onChangeText={setBookmarkLabel} placeholder="مثال: خلاصة الفصل" placeholderTextColor={colors.muted} style={[styles.dialogInput, { color: colors.text, borderColor: colors.border }]} textAlign="right" /><View style={styles.dialogActions}><Pressable onPress={() => setShowBookmarkEditor(false)}><X size={20} color={colors.muted} /></Pressable><Pressable onPress={saveBookmark}><Check size={22} color={colors.text} /></Pressable></View></View></View>
      </Modal>
    </SafeAreaView>
  );
}

function SheetHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  const { colors } = useAppTheme();
  return <View style={[styles.sheetHeader, { borderColor: colors.border }]}><View style={styles.headerTitle}><Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.saved, { color: colors.muted }]}>{subtitle}</Text></View><Pressable onPress={onClose} style={styles.headerButton}><X size={21} color={colors.text} /></Pressable></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, pdf: { flex: 1, width: "100%" },
  header: { minHeight: 66, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 5 },
  headerButton: { width: 39, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, minWidth: 0, paddingHorizontal: 5 },
  fileName: { fontSize: 12, fontWeight: "600", textAlign: "right" },
  saved: { fontSize: 9, marginTop: 5, textAlign: "right" },
  bookmarkFab: { position: "absolute", left: 18, bottom: 93, width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", elevation: 6 },
  sheet: { flex: 1 },
  sheetHeader: { minHeight: 72, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  sheetTitle: { fontSize: 19, fontWeight: "700", textAlign: "right" },
  searchInput: { margin: 14, borderRadius: 15, paddingHorizontal: 14, minHeight: 50, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, fontSize: 13 },
  result: { borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 9 },
  resultPage: { fontSize: 10, marginTop: 5, textAlign: "right" },
  resultText: { fontSize: 12, lineHeight: 23, marginTop: 7, textAlign: "right" },
  emptyText: { fontSize: 12, lineHeight: 24, textAlign: "center", margin: 35 },
  addBookmark: { margin: 14, minHeight: 46, borderRadius: 23, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  addBookmarkText: { fontSize: 12, fontWeight: "700" },
  bookmarkRow: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 9, flexDirection: "row", alignItems: "center" },
  bookmarkOpen: { flex: 1 },
  bookmarkName: { fontSize: 13, fontWeight: "600", textAlign: "right" },
  dialogBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.45)", justifyContent: "center", padding: 24 },
  dialog: { borderRadius: 23, padding: 22 },
  dialogTitle: { fontSize: 18, fontWeight: "700", textAlign: "right" },
  dialogInput: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, marginTop: 20, fontSize: 15 },
  dialogActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingHorizontal: 5 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
});`;

const readme = String.raw`# وثيقة — PDF Reader for Android

تطبيق React Native + TypeScript لقراءة وإدارة PDF. يستخدم Expo development build لتوليد مشروع أندرويد أصلي، وليس Expo Go.

## المزايا

- استيراد ملف أو عدة ملفات عبر Android Storage Access Framework.
- مكتبة محلية مع البحث بالاسم والفرز بالاسم والحجم وتاريخ الإضافة وآخر قراءة.
- عرض react-native-pdf مع التكبير واللمس المزدوج والتمرير الرأسي أو الأفقي.
- الانتقال المباشر إلى صفحة وحفظ آخر موضع تلقائياً.
- بحث محلي في طبقة النص لكل الصفحات مع مقتطفات ونتائج قابلة للنقر.
- إشارات مرجعية مسماة ومحفوظة لكل ملف.
- مفضلة ومشاركة عبر تطبيقات النظام وحذف الملف والنسخة المحلية.
- وضع فاتح وداكن وتلقائي، وحفظ الإعدادات والمكتبة في AsyncStorage.

## لماذا development build؟

react-native-pdf وexpo-pdf-text-extract يحتويان على كود Android/iOS أصلي. لذلك لن يعمل المشروع داخل Expo Go. الأمر npm run android يبني تطبيق تطوير خاصاً بك يحتوي على الاعتماديات الأصلية.

## المتطلبات

1. Node.js LTS وnpm.
2. JDK 17، وAndroid Studio مع Android SDK وAndroid SDK Platform وBuild Tools.
3. جهاز أندرويد مع تصحيح USB، أو محاكي من Device Manager.
4. متغيرات ANDROID_HOME وANDROID_SDK_ROOT إن لم يضبطهما Android Studio تلقائياً.
5. على macOS لبناء iOS: Xcode وCocoaPods. التركيز هنا على أندرويد.

## التشغيل خطوة بخطوة

1. فك ضغط المشروع وافتح الطرفية داخل مجلده.
2. ثبّت الاعتماديات:

    npm install

3. راجع توافق الحزم مع إصدار Expo. إن طلب Expo تعديل نسخة فاتبع اقتراحه:

    npx expo install --check

4. شغّل المحاكي أو صل الهاتف وفعّل تصحيح USB، ثم تحقق:

    adb devices

5. ولّد مجلد android وابنِ نسخة التطوير وشغّلها:

    npm run android

الأمر السابق ينفذ expo run:android، ويثبت التطبيق على الجهاز، ويشغّل Metro. عند أول تشغيل قد يستغرق Gradle عدة دقائق.

6. في التشغيلات التالية يمكنك تشغيل Metro فقط:

    npm start

ثم افتح تطبيق Wathiqa PDF المثبت، وليس Expo Go.

7. لفحص TypeScript:

    npm run typecheck

## إعادة توليد المشروع الأصلي

مجلدا android وios مستبعدان من Git لأن Expo يولدهما. عند تغيير app.json أو الحزم الأصلية:

    npm run prebuild
    npm run android

احتفظ بنسخة من أي تعديل يدوي داخل android قبل prebuild --clean.

## بناء APK للتجربة

بعد توليد مجلد android:

    cd android
    ./gradlew assembleDebug

على Windows استخدم gradlew.bat assembleDebug. ملف APK يظهر عادة داخل android/app/build/outputs/apk/debug. إصدار الإنتاج يحتاج مفتاح توقيع خاصاً بك؛ لا ترفع مفتاح التوقيع أو كلمات المرور إلى Git.

## البنية

- App.tsx: التنقل والمزودات.
- src/screens: شاشتا المكتبة والقارئ.
- src/components: بطاقة الملف والبحث والحالة الفارغة وشريط القارئ.
- src/context: الحالة المشتركة والثيم والحفظ.
- src/services: الاستيراد والحذف والمشاركة والبحث داخل PDF.
- src/types: الأنواع المشتركة.

## الملفات والخصوصية على أندرويد

لا يطلب التطبيق إذن قراءة كل مساحة التخزين. منتقي المستندات يمنح وصولاً آمناً للملف الذي يختاره المستخدم فقط، ثم keepLocalCopy ينسخه إلى documentDirectory الخاص بالتطبيق. لذلك تعرض الرئيسية الملفات المستوردة في مكتبة التطبيق، لا تفحص ذاكرة الهاتف كلها دون إذن.

حذف ملف من المكتبة يحذف النسخة الخاصة بالتطبيق، وليس الأصل الذي اخترته من Downloads أو Google Drive. المشاركة تستخدم FileProvider عبر react-native-share ولا ترفع الملف إلى خادم.

## البحث والملفات الممسوحة

expo-pdf-text-extract يستخدم PDFBox-Android لاستخراج النص المضمّن. البحث يعمل دون إنترنت. الصفحات التي هي صور فقط لا تحتوي على نص قابل للاستخراج، لذا يلزم دمج OCR إضافي إذا كنت تحتاج البحث فيها؛ التطبيق لا يعرض نتائج وهمية لهذه الحالة.

## حل المشكلات

- إذا ظهرت رسالة أن الموديول الأصلي غير موجود: احذف التطبيق القديم من الجهاز ونفذ npm run android مرة أخرى، ولا تستخدم Expo Go.
- إذا فشل Gradle: تأكد من JDK وAndroid SDK ثم نفذ cd android && ./gradlew clean وعاود npm run android.
- إذا تعذر فتح content URI: لا تمرر URI المنتقي مباشرة إلى القارئ؛ استخدم copy.localUri كما في fileService.
- إذا كانت المشاركة فشلت بسبب FileProvider: حدّث react-native-share وتأكد أن localUri ملف محلي وليس رابط HTTP.
- إذا كان عدد الصفحات صفراً بعد الاستيراد: يفتح القارئ الملف ويحدث العدد من onLoadComplete. الملفات التالفة أو المحمية قد تحتاج دعم كلمة مرور إضافياً.
- إذا لم يجد البحث نصاً موجوداً بصرياً: افحص هل الصفحة صورة ممسوحة، أو هل يستخدم الخط ترميزاً غير قابل للاستخراج.

## الاعتماديات الأساسية

- react-native-pdf + react-native-blob-util: الرندر والتكبير والتنقل.
- @react-native-documents/picker: اختيار الملفات والنسخ المحلي.
- expo-pdf-text-extract: النص وعدد الصفحات محلياً.
- AsyncStorage: بيانات المكتبة والإشارات والثيم.
- React Navigation: الشاشات.
- react-native-share: مشاركة الملفات.
- lucide-react-native: الأيقونات.

الكود مقسّم ومعلّق عند النقاط غير البديهية، ولا يحتاج أي API key أو backend.`;

export const nativeScreenFiles: NativeProjectFile[] = [
  { path: "src/screens/HomeScreen.tsx", language: "tsx", description: "الرئيسية والبحث والفرز وFAB والاستيراد.", content: homeScreen },
  { path: "src/screens/ReaderScreen.tsx", language: "tsx", description: "القارئ الكامل والبحث والإشارات والقفز والمشاركة.", content: readerScreen },
  { path: "README.md", language: "markdown", description: "خطوات الإعداد والبناء وحل المشكلات والبنية.", content: readme },
];

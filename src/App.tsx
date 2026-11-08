import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, FilePlus2, FileText, Info, LoaderCircle, Trash2, X } from "lucide-react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Library } from "./components/Library";
import { Reader } from "./components/Reader";
import { ImageEditor } from "./components/ImageEditor";
import { CodeStudio } from "./components/CodeStudio";
import { ArchitectureScene } from "./components/ArchitectureScene";
import { EditorGuide } from "./components/EditorGuide";
import { AndroidAppGuide } from "./components/AndroidAppGuide";
import { SetupGuide } from "./components/SetupGuide";
import type { AppSettings, PdfRecord, StoredPdf, ToastMessage } from "./types";
import {
  getStoredDocument, getStoredDocuments, loadSettings, putStoredDocument,
  removeStoredDocument, saveSettings, updateStoredDocument,
} from "./lib/storage";
import { inspectPdf } from "./lib/pdf";
import { createSamplePdf } from "./lib/samplePdf";
import { sharePdfOnDevice } from "./lib/deviceFiles";
import { useInstallPrompt } from "./pwa/useInstallPrompt";

function metadata(record: StoredPdf): PdfRecord {
  const { blob: _blob, ...data } = record;
  void _blob;
  return data;
}

export default function App() {
  const [documents, setDocuments] = useState<PdfRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<PdfRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const install = useInstallPrompt();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importIntentRef = useRef<"library" | "editor">("library");
  const updateQueues = useRef(new Map<string, Promise<unknown>>());
  const activeDocument = documents.find((document) => document.id === activeId) ?? null;
  const editingDocument = documents.find((document) => document.id === editorId) ?? null;

  const notify = useCallback((title: string, detail?: string, tone: ToastMessage["tone"] = "default") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, title, detail, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200);
  }, []);

  useEffect(() => {
    getStoredDocuments()
      .then((stored) => setDocuments(stored.map(metadata).sort((a, b) => b.addedAt - a.addedAt)))
      .catch(() => notify("تعذر قراءة المكتبة المحلية", "تأكد أن المتصفح يسمح بالتخزين المحلي ثم أعد التحميل.", "danger"))
      .finally(() => setLoading(false));
  }, [notify]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    document.body.style.overflow = activeId || editorId ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [activeId, editorId]);

  const updateDocument = useCallback((id: string, patch: Partial<PdfRecord>) => {
    setDocuments((current) => current.map((document) => document.id === id ? { ...document, ...patch } : document));
    const previous = updateQueues.current.get(id) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(() => updateStoredDocument(id, patch));
    updateQueues.current.set(id, next);
    void next.catch(() => notify("لم يُحفظ آخر تعديل", "تحقق من مساحة التخزين المتاحة في المتصفح.", "danger"));
  }, [notify]);

  const importBlobs = useCallback(async (files: File[]): Promise<PdfRecord[]> => {
    if (!files.length) return [];
    setImporting(true);
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const importedRecords: PdfRecord[] = [];
    const seen = new Set(documents.map((document) => `${document.name.toLowerCase()}-${document.size}`));

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
        failed += 1;
        continue;
      }
      if (file.size === 0 || file.size > 200 * 1024 * 1024) {
        failed += 1;
        continue;
      }
      const fingerprint = `${file.name.toLowerCase()}-${file.size}`;
      if (seen.has(fingerprint)) {
        skipped += 1;
        continue;
      }
      try {
        const inspection = await inspectPdf(file);
        const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        const record: PdfRecord = {
          id,
          name: file.name,
          size: file.size,
          addedAt: Date.now(),
          lastOpenedAt: null,
          lastPage: 1,
          totalPages: inspection.pages,
          favorite: false,
          bookmarks: [],
          thumbnail: inspection.thumbnail,
        };
        await putStoredDocument({ ...record, blob: file });
        seen.add(fingerprint);
        setDocuments((current) => [record, ...current.filter((document) => document.id !== id)]);
        imported += 1;
        importedRecords.push(record);
      } catch {
        failed += 1;
      }
    }

    if (imported) notify(`تم استيراد ${imported.toLocaleString("ar")} ${imported === 1 ? "ملف" : "ملفات"}`, "حُفظت الصفحات والبيانات على هذا الجهاز.", "success");
    if (skipped) notify("تم تجاوز الملفات المكررة", `${skipped.toLocaleString("ar")} موجود بالفعل بالاسم والحجم نفسيهما.`);
    if (failed) notify("تعذر استيراد بعض الملفات", "تأكد أنها PDF سليمة وغير فارغة ولا يتجاوز حجم كل منها 200 م.ب.", "danger");
    setImporting(false);
    return importedRecords;
  }, [documents, notify]);

  const handleSample = useCallback(async () => {
    setImporting(true);
    try {
      const blob = await createSamplePdf();
      const sample = new File([blob], "دليل وثيقة التفاعلي.pdf", { type: "application/pdf" });
      const imported = await importBlobs([sample]);
      const sampleDocument = imported[0] ?? documents.find((document) => document.name === sample.name);
      if (sampleDocument) setEditorId(sampleDocument.id);
      else document.getElementById("library")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      notify("تعذر إنشاء الدليل", "أعد المحاولة أو استورد PDF من جهازك.", "danger");
    } finally {
      setImporting(false);
    }
  }, [documents, importBlobs, notify]);

  const openDocument = useCallback((id: string) => {
    updateDocument(id, { lastOpenedAt: Date.now() });
    setActiveId(id);
  }, [updateDocument]);

  const shareDocument = useCallback(async (record: PdfRecord) => {
    try {
      const stored = await getStoredDocument(record.id);
      if (!stored) throw new Error("الملف غير موجود");
      const outcome = await sharePdfOnDevice(stored.blob, stored.name);
      notify(outcome === "shared" ? "تم فتح مشاركة النظام" : "تم تنزيل نسخة من PDF", stored.name, "success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      notify("تعذرت مشاركة الملف", "يمكنك المحاولة مجدداً أو تنزيل الملف من متصفح يدعم Web Share.", "danger");
    }
  }, [notify]);

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await updateQueues.current.get(deleteCandidate.id)?.catch(() => undefined);
      await removeStoredDocument(deleteCandidate.id);
      updateQueues.current.delete(deleteCandidate.id);
      setDocuments((current) => current.filter((document) => document.id !== deleteCandidate.id));
      if (activeId === deleteCandidate.id) setActiveId(null);
      if (editorId === deleteCandidate.id) setEditorId(null);
      notify("حُذف الملف وإشاراته", deleteCandidate.name, "success");
      setDeleteCandidate(null);
    } catch {
      notify("تعذر حذف الملف", "لم تتغير مكتبتك؛ أعد المحاولة.", "danger");
    } finally {
      setDeleting(false);
    }
  };

  const requestImport = (intent: "library" | "editor") => {
    importIntentRef.current = intent;
    fileInputRef.current?.click();
  };

  const pageCount = documents.reduce((sum, document) => sum + document.totalPages, 0);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        const intent = importIntentRef.current;
        event.target.value = "";
        void importBlobs(files).then((imported) => {
          if (intent === "editor" && imported[0]) setEditorId(imported[0].id);
        });
      }} />
      <Header theme={settings.theme} install={install} onToggleTheme={() => setSettings((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }))} />
      <Hero documentCount={documents.length} pageCount={pageCount} importing={importing} onImport={() => requestImport("editor")} onSample={() => { void handleSample(); }} />
      <Library
        documents={documents} loading={loading} importing={importing}
        sortKey={settings.sortKey} viewMode={settings.viewMode}
        onSortChange={(sortKey) => setSettings((current) => ({ ...current, sortKey }))}
        onViewChange={(viewMode) => setSettings((current) => ({ ...current, viewMode }))}
        onImport={() => requestImport("library")} onSample={() => { void handleSample(); }} onOpen={openDocument} onEdit={setEditorId}
        onFavorite={(document) => updateDocument(document.id, { favorite: !document.favorite })}
        onShare={(document) => { void shareDocument(document); }} onDelete={setDeleteCandidate}
      />
      <AndroidAppGuide install={install} />
      <ArchitectureScene />
      <EditorGuide />
      <CodeStudio />
      <SetupGuide />
      <Footer />

      <motion.button initial={{ scale: 0, rotate: -35 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 1, type: "spring" }} onClick={() => requestImport("editor")} disabled={importing} className="fixed bottom-5 left-5 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_70%,#667735)] bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_12px_35px_rgba(70,85,35,.25)] transition hover:scale-105 sm:bottom-7 sm:left-7" aria-label="استيراد PDF لتحرير صوره" title="استيراد PDF للتحرير">
        {importing ? <LoaderCircle size={22} className="spin" /> : <FilePlus2 size={23} />}
      </motion.button>

      <AnimatePresence>
        {editingDocument && <ImageEditor
          key={editingDocument.id} document={editingDocument}
          onClose={() => setEditorId(null)}
          onOutput={(file) => importBlobs([file])}
          notify={notify}
        />}
      </AnimatePresence>

      <AnimatePresence>
        {activeDocument && <Reader
          key={activeDocument.id} document={activeDocument}
          direction={settings.direction} zoom={settings.zoom}
          onDirectionChange={(direction) => setSettings((current) => ({ ...current, direction }))}
          onZoomChange={(zoom) => setSettings((current) => ({ ...current, zoom }))}
          onUpdate={(patch) => updateDocument(activeDocument.id, patch)}
          onClose={() => setActiveId(null)} onEdit={() => { setActiveId(null); setEditorId(activeDocument.id); }} onShare={() => { void shareDocument(activeDocument); }} onDelete={() => setDeleteCandidate(activeDocument)} notify={notify}
        />}
      </AnimatePresence>

      <AnimatePresence>
        {deleteCandidate && <div className="fixed inset-0 z-[80] flex items-center justify-center p-5" dir="rtl">
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !deleting && setDeleteCandidate(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="إلغاء الحذف" />
          <motion.div initial={{ opacity: 0, y: 25, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: .96 }} className="relative w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"><Trash2 size={21} /></div>
            <h2 className="mt-5 text-xl font-semibold tracking-[-.035em]">حذف الملف نهائياً؟</h2>
            <p className="mt-3 text-xs leading-7 text-[var(--muted)]">سيتم حذف «{deleteCandidate.name}» و{deleteCandidate.bookmarks.length.toLocaleString("ar")} إشارات مرجعية من مكتبة هذا المتصفح. لا يمكن التراجع عن ذلك.</p>
            <div className="mt-6 flex gap-2"><button onClick={() => { void confirmDelete(); }} disabled={deleting} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--danger)] px-5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">{deleting ? <LoaderCircle size={17} className="spin" /> : <Trash2 size={16} />}{deleting ? "جارٍ الحذف…" : "نعم، احذف"}</button><button onClick={() => setDeleteCandidate(null)} disabled={deleting} className="secondary-button !min-h-12 !py-3 !text-sm">إلغاء</button></div>
          </motion.div>
        </div>}
      </AnimatePresence>

      <div className="pointer-events-none fixed bottom-5 right-4 z-[100] flex w-[calc(100%-6rem)] max-w-sm flex-col gap-2 sm:right-6 sm:w-full" dir="rtl">
        <AnimatePresence>{toasts.map((toast) => <motion.div layout key={toast.id} initial={{ opacity: 0, x: 50, scale: .95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 30, scale: .96 }} className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elevated)_95%,transparent)] p-4 shadow-[var(--shadow)] backdrop-blur-xl">
          <span className={`mt-0.5 ${toast.tone === "danger" ? "text-[var(--danger)]" : "text-[var(--ink)]"}`}>{toast.tone === "danger" ? <AlertTriangle size={18} /> : toast.tone === "success" ? <CheckCircle2 size={18} /> : <Info size={18} />}</span>
          <div className="min-w-0 flex-1"><div className="text-xs font-medium">{toast.title}</div>{toast.detail && <div className="mt-1.5 text-[10px] leading-5 text-[var(--muted)]">{toast.detail}</div>}</div>
          <button onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} className="icon-button !h-7 !w-7" aria-label="إغلاق التنبيه"><X size={13} /></button>
        </motion.div>)}</AnimatePresence>
      </div>
    </div>
  );
}

function Footer() {
  return <footer className="border-t border-[var(--line)] bg-[var(--ink)] px-5 py-12 text-[var(--bg)] sm:px-8"><div className="mx-auto flex max-w-[1380px] flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]"><FileText size={18} /></span><span className="text-xl font-bold">وثيقة.</span></div><p className="mt-4 max-w-md text-xs font-light leading-6 opacity-60">محرر صور وقارئ PDF محلي، مع كود React/Web ومشروع React Native. ملفاتك لك، وكودك لك، ولا توجد خطوة خفية بينهما.</p></div><div className="flex flex-wrap gap-x-5 gap-y-3 text-[10px] opacity-65"><a href="https://github.com/wonday/react-native-pdf" target="_blank" rel="noreferrer" className="transition hover:opacity-100">react-native-pdf</a><a href="https://react-native-documents.github.io/docs/doc-picker-api" target="_blank" rel="noreferrer" className="transition hover:opacity-100">Document Picker</a><a href="https://github.com/gr8pathik/expo-pdf-text-extract" target="_blank" rel="noreferrer" className="transition hover:opacity-100">PDF Text Extract</a><button onClick={() => document.getElementById("android-app")?.scrollIntoView({ behavior: "smooth" })}>تثبيت على أندرويد</button><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>العودة للأعلى</button></div></div></footer>;
}

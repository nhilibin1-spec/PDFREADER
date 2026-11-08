import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, ChevronLeft, ChevronRight, FileImage, ImagePlus,
  Images, LoaderCircle, Minus, Plus, RotateCcw, Save, ShieldAlert, Trash2, X,
} from "lucide-react";
import type { PDFDocumentProxy, PageViewport } from "pdfjs-dist";
import type { PdfRecord } from "../types";
import { getStoredDocument } from "../lib/storage";
import { openPdf } from "../lib/pdf";
import { savePdfToPhone } from "../lib/deviceFiles";
import {
  applyMatrix, cssMatrix, exportReplacedPdf, prepareReplacement,
  replacementDrawMatrix, scanDocumentImages,
} from "../editor/imageEngine";
import { readEditorSession, writeEditorSession, clearEditorSession } from "../editor/sessionStorage";
import type { EditorSession, ImageFitMode, ImageReplacement, PdfImageTarget, PdfMatrix } from "../editor/types";

interface ImageEditorProps {
  document: PdfRecord;
  onClose: () => void;
  onOutput: (file: File) => Promise<PdfRecord[]>;
  notify: (title: string, detail?: string) => void;
}

export function ImageEditor({ document: fileRecord, onClose, onOutput, notify }: ImageEditorProps) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(fileRecord.lastPage || 1);
  const [imagesByPage, setImagesByPage] = useState<Record<number, PdfImageTarget[]>>({});
  const [scannedPages, setScannedPages] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replacements, setReplacements] = useState<Record<string, ImageReplacement>>({});
  const [hydrated, setHydrated] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ done: 0, total: 0 });
  const [zoom, setZoom] = useState(1);
  const [clearArmed, setClearArmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedTargetRef = useRef<PdfImageTarget | null>(null);
  const replacementsRef = useRef(replacements);
  const previewUrls = useRef(new Set<string>());
  replacementsRef.current = replacements;

  const allTargets = useMemo(() => Object.values(imagesByPage).flat(), [imagesByPage]);
  const selectedTarget = allTargets.find((target) => target.id === selectedId) ?? null;
  const selectedReplacement = selectedId ? replacements[selectedId] : undefined;
  const replacementList = useMemo(() => Object.values(replacements), [replacements]);
  const totalImages = allTargets.length;

  useEffect(() => {
    let alive = true;
    let loaded: PDFDocumentProxy | null = null;
    Promise.all([getStoredDocument(fileRecord.id), readEditorSession(fileRecord.id)])
      .then(async ([stored, session]) => {
        if (!stored) throw new Error("لم يعد الملف موجوداً في التخزين المحلي");
        const opened = await openPdf(stored.blob);
        loaded = opened;
        if (!alive) { void opened.destroy(); return; }
        setOriginalBlob(stored.blob);
        setPdf(opened);
        if (session) {
          const restored: Record<string, ImageReplacement> = {};
          session.replacements.forEach((replacement) => {
            const previewUrl = URL.createObjectURL(replacement.blob);
            previewUrls.current.add(previewUrl);
            restored[replacement.target.id] = { ...replacement, previewUrl };
          });
          setReplacements(restored);
        }
        setHydrated(true);
      })
      .catch((reason: unknown) => { if (alive) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => {
      alive = false;
      if (loaded) void loaded.destroy();
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    };
  }, [fileRecord.id]);

  useEffect(() => {
    if (!pdf) return;
    const controller = new AbortController();
    void scanDocumentImages(pdf, {
      signal: controller.signal,
      onPage: (pageNumber, images) => {
        setImagesByPage((current) => ({ ...current, [pageNumber]: images }));
        setScannedPages(pageNumber);
      },
    }).catch(() => { if (!controller.signal.aborted) notify("تعذر تحليل بعض الصفحات", "يمكنك متابعة الصفحات التي تم فحصها أو إعادة فتح الملف."); });
    return () => controller.abort();
  }, [notify, pdf]);

  useEffect(() => {
    if (!hydrated) return;
    setSavingSession(true);
    const timer = window.setTimeout(() => {
      const session: EditorSession = {
        documentId: fileRecord.id,
        updatedAt: Date.now(),
        replacements: Object.values(replacements).map(({ previewUrl: _previewUrl, ...replacement }) => { void _previewUrl; return replacement; }),
      };
      void writeEditorSession(session).catch(() => notify("لم تُحفظ مسودة التحرير", "التعديلات ما زالت ظاهرة، لكن تحقق من مساحة التخزين.")).finally(() => setSavingSession(false));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [fileRecord.id, hydrated, notify, replacements]);

  const chooseTarget = (target: PdfImageTarget, openGallery = true) => {
    selectedTargetRef.current = target;
    setSelectedId(target.id);
    if (openGallery) inputRef.current?.click();
  };

  const installReplacement = useCallback(async (source: Blob, name: string, fit: ImageFitMode, existing?: ImageReplacement) => {
    const target = existing?.target ?? selectedTargetRef.current;
    if (!target) return;
    setProcessing(true);
    try {
      const boxWidth = Math.hypot(target.matrix[0], target.matrix[1]);
      const boxHeight = Math.hypot(target.matrix[2], target.matrix[3]);
      const prepared = await prepareReplacement(source, fit, boxWidth / boxHeight);
      const previewUrl = URL.createObjectURL(prepared.blob);
      previewUrls.current.add(previewUrl);
      setReplacements((current) => {
        const previous = current[target.id];
        if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
        return {
          ...current,
          [target.id]: {
            id: existing?.id ?? `${target.id}-${Date.now()}`,
            target,
            name,
            sourceBlob: source,
            blob: prepared.blob,
            width: prepared.width,
            height: prepared.height,
            fit,
            background: existing?.background ?? "#ffffff",
            createdAt: existing?.createdAt ?? Date.now(),
            previewUrl,
          },
        };
      });
      notify("تمت معاينة الاستبدال", "راجع الصورة ثم اختر حفظ PDF جديد عندما تصبح جاهزاً.");
    } catch {
      notify("تعذر قراءة الصورة", "استخدم PNG أو JPEG أو WebP سليماً، ولا يتجاوز 25 م.ب.");
    } finally {
      setProcessing(false);
    }
  }, [notify]);

  const exportFile = async () => {
    if (!originalBlob || !replacementList.length) return;
    setExporting(true);
    setExportProgress({ done: 0, total: replacementList.length });
    try {
      const output = await exportReplacedPdf(originalBlob, replacementList, (done, total) => setExportProgress({ done, total }));
      const verification = await openPdf(output);
      const pages = verification.numPages;
      await verification.destroy();
      const base = fileRecord.name.replace(/\.pdf$/i, "");
      const version = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      const fileName = `${base}-صور-معدلة-${version}.pdf`;
      const file = new File([output], fileName, { type: "application/pdf" });
      const outcome = await savePdfToPhone(output, fileName);
      const imported = await onOutput(file);
      const destination = outcome === "android-downloads" ? "حُفظ في Download/Wathiqa" : outcome === "android-share" ? "فُتحت ورقة الحفظ والمشاركة" : "تم تنزيله";
      notify("تم إنشاء PDF الجديد", `${pages.toLocaleString("ar")} صفحة · ${replacementList.length.toLocaleString("ar")} استبدالات · ${destination}${imported.length ? " · وأُضيف للمكتبة" : ""}`);
    } catch (reason) {
      notify("تعذر تصدير الملف", reason instanceof Error ? reason.message : "راجع التعديلات وحاول مرة أخرى.");
    } finally {
      setExporting(false);
    }
  };

  const removeReplacement = (targetId: string) => {
    setReplacements((current) => {
      const next = { ...current };
      const removed = next[targetId];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      delete next[targetId];
      return next;
    });
  };

  const clearAll = async () => {
    if (!clearArmed) {
      setClearArmed(true);
      window.setTimeout(() => setClearArmed(false), 3000);
      return;
    }
    Object.values(replacements).forEach((replacement) => { if (replacement.previewUrl) URL.revokeObjectURL(replacement.previewUrl); });
    setReplacements({});
    setClearArmed(false);
    await clearEditorSession(fileRecord.id);
    notify("تم مسح مسودة التعديلات", "الملف الأصلي لم يتغير.");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[55] flex flex-col bg-[var(--reader)] text-[var(--ink)]" dir="rtl">
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size <= 25 * 1024 * 1024) void installReplacement(file, file.name, "cover"); else if (file) notify("الصورة كبيرة جداً", "الحد الأقصى للصورة 25 م.ب."); event.target.value = ""; }} />
      <header className="z-30 flex min-h-[72px] shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-3 sm:px-5">
        <button onClick={onClose} className="icon-button" aria-label="إغلاق المحرر"><ArrowRight size={20} /></button>
        <span className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] sm:flex"><Images size={19} /></span>
        <div className="min-w-0 flex-1"><h1 className="truncate text-xs font-semibold sm:text-sm">{fileRecord.name.replace(/\.pdf$/i, "")}</h1><p className="mt-1 text-[9px] text-[var(--muted)]">{savingSession ? "حفظ المسودة…" : hydrated ? "المسودة محفوظة محلياً" : "تجهيز المحرر…"} · {replacementList.length.toLocaleString("ar")} تعديلات</p></div>
        {replacementList.length > 0 && <button onClick={() => { void clearAll(); }} className={`secondary-button !hidden !min-h-10 !px-3 !py-2 !text-[10px] sm:!inline-flex ${clearArmed ? "!text-[var(--danger)]" : ""}`}><Trash2 size={14} />{clearArmed ? "تأكيد المسح" : "مسح التعديلات"}</button>}
        <button onClick={() => { void exportFile(); }} disabled={!replacementList.length || exporting} className="primary-button !min-h-11 !px-4 !py-2.5 !text-xs disabled:opacity-45">
          {exporting ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}{exporting ? `${exportProgress.done}/${exportProgress.total}` : "حفظ PDF جديد"}
        </button>
      </header>

      {error ? <div className="flex flex-1 items-center justify-center p-6 text-center"><div><ShieldAlert size={36} className="mx-auto text-[var(--danger)]" /><h2 className="mt-4 font-semibold">تعذر فتح محرر الصور</h2><p className="mt-2 text-sm text-[var(--muted)]">{error}</p><button onClick={onClose} className="secondary-button mx-auto mt-5">العودة</button></div></div> : (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[180px_minmax(0,1fr)_330px]">
          <aside className="scrollbar-slim hidden min-h-0 flex-col border-l border-[var(--line)] bg-[var(--bg-elevated)] lg:flex">
            <div className="border-b border-[var(--line)] p-4"><div className="text-xs font-semibold">الصفحات</div><div className="mt-1.5 text-[9px] text-[var(--muted)]">{totalImages.toLocaleString("ar")} صور مكتشفة</div></div>
            <div className="scrollbar-slim flex-1 overflow-y-auto p-2">
              {Array.from({ length: fileRecord.totalPages }, (_, index) => index + 1).map((pageNumber) => {
                const images = imagesByPage[pageNumber];
                const edited = images?.filter((target) => replacements[target.id]).length ?? 0;
                return <button key={pageNumber} onClick={() => setCurrentPage(pageNumber)} className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-2.5 text-right transition ${currentPage === pageNumber ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-soft)]"}`}><span className={`font-latin flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[10px] ${currentPage === pageNumber ? "border-[var(--accent)]" : ""}`}>{pageNumber}</span><span className="flex-1 text-[10px] text-[var(--muted)]">{images === undefined ? "بانتظار الفحص" : images.length ? `${images.length.toLocaleString("ar")} صور` : "لا صور"}</span>{edited > 0 && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}</button>;
              })}
            </div>
            <div className="border-t border-[var(--line)] p-3 text-[9px] text-[var(--muted)]">فحص {scannedPages.toLocaleString("ar")} / {fileRecord.totalPages.toLocaleString("ar")}</div>
          </aside>

          <main className="relative flex min-h-[58vh] min-w-0 flex-col lg:min-h-0">
            <div className="flex min-h-12 items-center gap-2 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-3 lg:hidden"><select value={currentPage} onChange={(event) => setCurrentPage(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-xs outline-none" aria-label="الصفحة الحالية">{Array.from({ length: fileRecord.totalPages }, (_, index) => <option key={index} value={index + 1}>صفحة {index + 1} · {(imagesByPage[index + 1]?.length ?? 0).toLocaleString("ar")} صور</option>)}</select><Images size={16} className="text-[var(--muted)]" /></div>
            <div className="flex min-h-11 items-center justify-between border-b border-[var(--line)] bg-[var(--bg-elevated)] px-3 text-[10px] text-[var(--muted)]"><span>{imagesByPage[currentPage] === undefined ? "جارٍ اكتشاف الصور…" : `${imagesByPage[currentPage].length.toLocaleString("ar")} أماكن قابلة للتحديد`}</span><div className="flex items-center gap-1" dir="ltr"><button onClick={() => setZoom((value) => Math.max(.6, value - .1))} className="icon-button !h-8 !w-8" aria-label="تصغير"><Minus size={14} /></button><span className="font-latin w-10 text-center">{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(2.5, value + .1))} className="icon-button !h-8 !w-8" aria-label="تكبير"><Plus size={14} /></button></div></div>
            {pdf ? <EditorCanvas pdf={pdf} pageNumber={currentPage} targets={imagesByPage[currentPage] ?? []} replacements={replacements} selectedId={selectedId} zoom={zoom} onSelect={chooseTarget} /> : <div className="flex flex-1 items-center justify-center"><LoaderCircle size={28} className="spin text-[var(--muted)]" /></div>}
            <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] p-1 shadow-lg" dir="ltr"><button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="icon-button pointer-events-auto !h-8 !w-8"><ChevronLeft size={15} /></button><span className="font-latin px-2 text-[10px]">{currentPage} / {fileRecord.totalPages}</span><button onClick={() => setCurrentPage((page) => Math.min(fileRecord.totalPages, page + 1))} disabled={currentPage === fileRecord.totalPages} className="icon-button pointer-events-auto !h-8 !w-8"><ChevronRight size={15} /></button></div>
          </main>

          <aside className="scrollbar-slim min-h-0 overflow-y-auto border-r border-[var(--line)] bg-[var(--bg-elevated)] max-lg:border-t lg:max-h-full">
            <div className="border-b border-[var(--line)] p-5"><div className="flex items-center gap-2 text-xs font-semibold"><FileImage size={16} />مفتش الصورة</div><p className="mt-2 text-[9px] leading-5 text-[var(--muted)]">انقر أي إطار مرقّم داخل الصفحة لفتح معرض الصور.</p></div>
            <AnimatePresence mode="wait">
              {selectedTarget ? <motion.div key={selectedTarget.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5">
                <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-medium">صورة الصفحة {selectedTarget.pageNumber.toLocaleString("ar")}</div><div dir="ltr" className="font-latin mt-1 text-left text-[9px] text-[var(--muted)]">{selectedTarget.objectId}</div></div><button onClick={() => setSelectedId(null)} className="icon-button !h-8 !w-8" aria-label="إلغاء التحديد"><X size={14} /></button></div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[9px]"><div className="rounded-2xl bg-[var(--surface-soft)] p-3"><span className="text-[var(--muted)]">الأبعاد الأصلية</span><strong className="font-latin mt-1 block">{selectedTarget.pixelWidth ?? "—"} × {selectedTarget.pixelHeight ?? "—"}</strong></div><div className="rounded-2xl bg-[var(--surface-soft)] p-3"><span className="text-[var(--muted)]">مساحة الصفحة</span><strong className="font-latin mt-1 block">{Math.round(selectedTarget.bounds.width)} × {Math.round(selectedTarget.bounds.height)} pt</strong></div></div>
                {selectedReplacement ? <div className="mt-5">
                  <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)]"><img src={selectedReplacement.previewUrl} alt="معاينة الصورة البديلة" className="h-40 w-full object-contain" /></div>
                  <div className="mt-2 truncate text-[10px] text-[var(--muted)]" title={selectedReplacement.name}>{selectedReplacement.name}</div>
                  <label className="mt-5 block text-[10px] font-medium">طريقة الملاءمة</label>
                  <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-[var(--surface-soft)] p-1">{(["cover", "contain", "stretch"] as ImageFitMode[]).map((fit) => <button key={fit} disabled={processing} onClick={() => { void installReplacement(selectedReplacement.sourceBlob, selectedReplacement.name, fit, selectedReplacement); }} className={`rounded-xl px-1 py-2.5 text-[9px] transition ${selectedReplacement.fit === fit ? "bg-[var(--surface)] font-semibold shadow-sm" : "text-[var(--muted)]"}`}>{fit === "cover" ? "قص متناسب" : fit === "contain" ? "احتواء" : "تمدد"}</button>)}</div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--line)] p-3"><label htmlFor="editor-background" className="text-[10px]">لون خلفية الاحتواء</label><input id="editor-background" type="color" value={selectedReplacement.background} onChange={(event) => setReplacements((current) => ({ ...current, [selectedTarget.id]: { ...selectedReplacement, background: event.target.value } }))} className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent" /></div>
                  <div className="mt-5 flex gap-2"><button onClick={() => inputRef.current?.click()} disabled={processing} className="secondary-button flex-1 !min-h-11 !px-3 !py-2 !text-[10px]">{processing ? <LoaderCircle size={14} className="spin" /> : <ImagePlus size={14} />}تغيير الصورة</button><button onClick={() => removeReplacement(selectedTarget.id)} className="icon-button !h-11 !w-11 border-[var(--line)] hover:!text-[var(--danger)]" aria-label="استعادة الصورة الأصلية"><RotateCcw size={16} /></button></div>
                </div> : <button onClick={() => inputRef.current?.click()} disabled={processing} className="primary-button mt-5 w-full !min-h-12 !py-3 !text-xs">{processing ? <LoaderCircle size={16} className="spin" /> : <ImagePlus size={16} />}{processing ? "جارٍ معالجة الصورة…" : "اختيار صورة بديلة"}</button>}
              </motion.div> : <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5"><div className="rounded-3xl border border-dashed border-[var(--line-strong)] p-5 text-center"><Images size={27} className="mx-auto text-[var(--muted)]" strokeWidth={1.3} /><h3 className="mt-4 text-xs font-semibold">حدد صورة داخل الصفحة</h3><p className="mt-2 text-[10px] leading-6 text-[var(--muted)]">الإطارات المرقمة هي عمليات رسم صور حقيقية قرأها المحرر من PDF، وليست مجرد مربعات يدوية.</p></div></motion.div>}
            </AnimatePresence>

            {replacementList.length > 0 && <div className="border-t border-[var(--line)] p-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold">سجل التعديلات</h3><span className="font-latin text-[10px] text-[var(--muted)]">{replacementList.length}</span></div><div className="space-y-2">{replacementList.map((replacement) => <div key={replacement.target.id} className="flex items-center gap-2 rounded-2xl bg-[var(--surface-soft)] p-2"><button onClick={() => { setCurrentPage(replacement.target.pageNumber); chooseTarget(replacement.target, false); }} className="flex min-w-0 flex-1 items-center gap-2 text-right"><img src={replacement.previewUrl} alt="" className="h-10 w-10 rounded-xl object-cover" /><span className="min-w-0"><span className="block truncate text-[10px]">{replacement.name}</span><span className="mt-1 block text-[9px] text-[var(--muted)]">صفحة {replacement.target.pageNumber.toLocaleString("ar")}</span></span></button><button onClick={() => removeReplacement(replacement.target.id)} className="icon-button !h-8 !w-8" aria-label="حذف التعديل"><Trash2 size={13} /></button></div>)}</div></div>}
            <div className="m-5 rounded-2xl bg-[var(--surface-soft)] p-4 text-[9px] leading-5 text-[var(--muted)]"><ShieldAlert size={14} className="mb-2" />الاستبدال بصري ويحافظ على بقية الصفحة، لكنه قد يغطي عناصر كانت مرسومة فوق الصورة داخل الإطار نفسه. قد تبقى بيانات الصورة الأصلية في بنية PDF؛ لا تستخدمه كمحو أمني للمعلومات الحساسة.</div>
          </aside>
        </div>
      )}
    </motion.div>
  );
}

interface CanvasProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  targets: PdfImageTarget[];
  replacements: Record<string, ImageReplacement>;
  selectedId: string | null;
  zoom: number;
  onSelect: (target: PdfImageTarget, openGallery?: boolean) => void;
}

function EditorCanvas({ pdf, pageNumber, targets, replacements, selectedId, zoom, onSelect }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [availableWidth, setAvailableWidth] = useState(800);
  const [viewport, setViewport] = useState<PageViewport | null>(null);
  const displayWidth = Math.max(250, Math.min(980, availableWidth - 45)) * zoom;

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let task: { cancel: () => void } | undefined;
    setViewport(null);
    void pdf.getPage(pageNumber).then(async (page) => {
      const base = page.getViewport({ scale: 1 });
      const nextViewport = page.getViewport({ scale: displayWidth / base.width });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(nextViewport.width * ratio);
      canvas.height = Math.ceil(nextViewport.height * ratio);
      canvas.style.width = `${nextViewport.width}px`;
      canvas.style.height = `${nextViewport.height}px`;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;
      const renderViewport = nextViewport.clone({ scale: nextViewport.scale * ratio });
      const renderTask = page.render({ canvasContext: context, viewport: renderViewport, canvas });
      task = renderTask;
      await renderTask.promise;
      if (!cancelled) setViewport(nextViewport);
    }).catch((reason: unknown) => { if (!cancelled && !(reason instanceof Error && reason.name === "RenderingCancelledException")) console.warn(reason); });
    return () => { cancelled = true; task?.cancel(); };
  }, [displayWidth, pageNumber, pdf]);

  return <div ref={containerRef} className="scrollbar-slim relative flex-1 overflow-auto p-5 pb-20 sm:p-8 sm:pb-20"><div className="mx-auto" style={{ width: viewport?.width ?? displayWidth }}><div className="pdf-page-frame relative" style={{ width: viewport?.width ?? displayWidth, height: viewport?.height ?? displayWidth * 1.414 }}>
    <canvas ref={canvasRef} className="absolute inset-0" />
    {viewport && <>
      <svg className="pointer-events-none absolute inset-0" width={viewport.width} height={viewport.height} viewBox={`0 0 ${viewport.width} ${viewport.height}`}>
        {Object.values(replacements).filter((replacement) => replacement.target.pageNumber === pageNumber).map((replacement) => <polygon key={replacement.target.id} points={polygonPoints(replacement.target.quad, viewport.transform)} fill={replacement.background} />)}
      </svg>
      {Object.values(replacements).filter((replacement) => replacement.target.pageNumber === pageNumber && replacement.previewUrl).map((replacement) => <img key={replacement.target.id} src={replacement.previewUrl} alt="" className="pointer-events-none absolute left-0 top-0 h-px w-px max-w-none origin-top-left" style={{ transform: cssMatrix(viewport.transform, replacementDrawMatrix(replacement.target, replacement)) }} />)}
      <svg className="absolute inset-0" width={viewport.width} height={viewport.height} viewBox={`0 0 ${viewport.width} ${viewport.height}`} aria-label="الصور القابلة للتحرير">
        {targets.map((target, index) => {
          const selected = selectedId === target.id;
          const edited = Boolean(replacements[target.id]);
          const center = target.quad.reduce((sum, point) => [sum[0] + point[0] / 4, sum[1] + point[1] / 4], [0, 0]) as [number, number];
          const screenCenter = applyMatrix(viewport.transform as PdfMatrix, center);
          return <g key={target.id} role="button" tabIndex={0} aria-label={`استبدال الصورة ${index + 1} في الصفحة ${pageNumber}`} onClick={() => onSelect(target)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(target); }} className="cursor-pointer outline-none">
            <polygon points={polygonPoints(target.quad, viewport.transform)} fill={selected ? "rgba(199,239,85,.25)" : "rgba(199,239,85,.06)"} stroke={edited ? "#7fa820" : "#9fc831"} strokeWidth={selected ? 3 : 1.5} strokeDasharray={selected ? undefined : "6 4"} vectorEffect="non-scaling-stroke" />
            <circle cx={screenCenter[0]} cy={screenCenter[1]} r={13} fill={selected || edited ? "#c7ef55" : "#191b16"} stroke="#fff" strokeWidth={1.5} />
            <text x={screenCenter[0]} y={screenCenter[1] + 3.5} textAnchor="middle" fontSize="10" fontFamily="Manrope, sans-serif" fontWeight="700" fill={selected || edited ? "#1c2807" : "#fff"} pointerEvents="none">{edited ? "✓" : index + 1}</text>
          </g>;
        })}
      </svg>
    </>}
    {!viewport && <div className="skeleton absolute inset-0 flex items-center justify-center"><LoaderCircle size={24} className="spin text-[var(--muted)]" /></div>}
  </div></div></div>;
}

function polygonPoints(quad: [number, number][], viewportTransform: number[]): string {
  return quad.map((point) => applyMatrix(viewportTransform as PdfMatrix, point).join(",")).join(" ");
}

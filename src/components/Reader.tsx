import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, Bookmark, BookmarkPlus, Check, ChevronDown, ChevronLeft, ChevronRight,
  Columns2, FileWarning, Images, LoaderCircle, Maximize2, Minus, Plus,
  Rows3, Search, Share2, Trash2, X,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PdfBookmark, PdfRecord, ScrollDirection, SearchMatch } from "../types";
import { getStoredDocument } from "../lib/storage";
import { openPdf, searchPdfText } from "../lib/pdf";

interface ReaderProps {
  document: PdfRecord;
  direction: ScrollDirection;
  zoom: number;
  onDirectionChange: (direction: ScrollDirection) => void;
  onZoomChange: (zoom: number) => void;
  onUpdate: (patch: Partial<PdfRecord>) => void;
  onClose: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  notify: (title: string, detail?: string) => void;
}

type Drawer = "search" | "bookmarks" | null;

export function Reader(props: ReaderProps) {
  const { document: fileRecord, direction, zoom } = props;
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(Math.max(1, fileRecord.lastPage));
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [bookmarkModal, setBookmarkModal] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [activeMatch, setActiveMatch] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState({ completed: 0, total: 0 });
  const [viewportWidth, setViewportWidth] = useState(900);
  const viewerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const scrollFrame = useRef<number | null>(null);
  const restoredPage = useRef(false);
  const totalPages = pdf?.numPages ?? fileRecord.totalPages;

  useEffect(() => {
    let alive = true;
    let loadedDocument: PDFDocumentProxy | null = null;
    setLoadError(null);
    setPdf(null);
    getStoredDocument(fileRecord.id)
      .then((stored) => {
        if (!stored) throw new Error("لم يعد الملف موجوداً في التخزين المحلي.");
        return openPdf(stored.blob);
      })
      .then((loaded) => {
        loadedDocument = loaded;
        if (!alive) {
          void loaded.destroy();
          return;
        }
        setPdf(loaded);
        if (loaded.numPages !== fileRecord.totalPages) props.onUpdate({ totalPages: loaded.numPages });
      })
      .catch((error: unknown) => {
        if (alive) setLoadError(error instanceof Error ? error.message : "تعذر فتح ملف PDF. قد يكون تالفاً أو محمياً بكلمة مرور.");
      });
    return () => {
      alive = false;
      if (loadedDocument) void loadedDocument.destroy();
    };
    // The reader is keyed by document id in App, so this runs once per opened file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileRecord.id]);

  useEffect(() => {
    if (!viewerRef.current) return;
    const observer = new ResizeObserver(([entry]) => setViewportWidth(entry.contentRect.width));
    observer.observe(viewerRef.current);
    return () => observer.disconnect();
  }, []);

  const jumpToPage = useCallback((requestedPage: number, behavior: ScrollBehavior = "smooth") => {
    if (!Number.isFinite(requestedPage)) return;
    const page = Math.min(Math.max(1, Math.round(requestedPage)), totalPages || 1);
    setCurrentPage(page);
    pageRefs.current.get(page)?.scrollIntoView({ behavior, block: direction === "vertical" ? "start" : "nearest", inline: "center" });
  }, [direction, totalPages]);

  const previousDirection = useRef(direction);
  useEffect(() => {
    if (previousDirection.current === direction) return;
    previousDirection.current = direction;
    const timer = window.setTimeout(() => jumpToPage(currentPage, "auto"), 100);
    return () => window.clearTimeout(timer);
  }, [currentPage, direction, jumpToPage]);

  useEffect(() => {
    if (!pdf || restoredPage.current) return;
    restoredPage.current = true;
    const timer = window.setTimeout(() => jumpToPage(fileRecord.lastPage, "auto"), 120);
    return () => window.clearTimeout(timer);
  }, [fileRecord.lastPage, jumpToPage, pdf]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      props.onUpdate({ lastPage: currentPage, lastOpenedAt: Date.now() });
    }, 350);
    return () => window.clearTimeout(timer);
    // onUpdate is stable in App; document id identifies the active record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, fileRecord.id]);

  const changeZoom = useCallback((next: number) => {
    props.onZoomChange(Math.min(3, Math.max(.5, Math.round(next * 10) / 10)));
  }, [props]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setDrawer("search");
        return;
      }
      if (event.key === "Escape") {
        if (bookmarkModal) setBookmarkModal(false);
        else if (drawer) setDrawer(null);
        else props.onClose();
        return;
      }
      if (editing) return;
      if (event.key.toLowerCase() === "b") setBookmarkModal(true);
      if (event.key === "+" || event.key === "=") changeZoom(zoom + .1);
      if (event.key === "-") changeZoom(zoom - .1);
      if (event.key === "ArrowRight" || event.key === "ArrowDown") jumpToPage(currentPage + 1);
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") jumpToPage(currentPage - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [bookmarkModal, changeZoom, currentPage, drawer, jumpToPage, props, zoom]);

  useEffect(() => {
    const needle = query.trim();
    if (!pdf || needle.length < 2) {
      setMatches([]);
      setSearching(false);
      setSearchProgress({ completed: 0, total: 0 });
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setActiveMatch(0);
      setSearchProgress({ completed: 0, total: pdf.numPages });
      searchPdfText(pdf, needle, {
        signal: controller.signal,
        onProgress: (completed, total) => setSearchProgress({ completed, total }),
      }).then((results) => {
        setMatches(results);
        setSearching(false);
        if (results[0]) jumpToPage(results[0].page);
      }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearching(false);
        props.notify("تعذر إكمال البحث", "جرّب عبارة أقصر أو أعد فتح الملف.");
      });
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, query]);

  const onViewerScroll = () => {
    if (scrollFrame.current !== null) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      const viewer = viewerRef.current;
      if (!viewer) return;
      const bounds = viewer.getBoundingClientRect();
      const center = direction === "vertical" ? bounds.top + bounds.height / 2 : bounds.left + bounds.width / 2;
      let nearestPage = currentPage;
      let nearestDistance = Number.POSITIVE_INFINITY;
      pageRefs.current.forEach((element, page) => {
        const rect = element.getBoundingClientRect();
        const pageCenter = direction === "vertical" ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
        const distance = Math.abs(pageCenter - center);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPage = page;
        }
      });
      if (nearestPage !== currentPage) setCurrentPage(nearestPage);
    });
  };

  const saveBookmark = () => {
    const label = bookmarkLabel.trim() || `صفحة ${currentPage}`;
    const bookmark: PdfBookmark = {
      id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      page: currentPage,
      label,
      createdAt: Date.now(),
    };
    props.onUpdate({ bookmarks: [...fileRecord.bookmarks, bookmark] });
    setBookmarkModal(false);
    setBookmarkLabel("");
    props.notify("حُفظت الإشارة المرجعية", `${label} · صفحة ${currentPage.toLocaleString("ar")}`);
  };

  const goToMatch = (index: number) => {
    if (!matches.length) return;
    const next = (index + matches.length) % matches.length;
    setActiveMatch(next);
    jumpToPage(matches[next].page);
  };

  const baseWidth = Math.max(260, Math.min(direction === "vertical" ? 860 : 760, viewportWidth - (viewportWidth < 600 ? 30 : 100)));
  const pageWidth = Math.round(baseWidth * zoom);
  const currentPageHasBookmark = fileRecord.bookmarks.some((bookmark) => bookmark.page === currentPage);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-[var(--reader)] text-[var(--ink)]" dir="rtl">
      <header className="relative z-40 flex min-h-[72px] shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elevated)_94%,transparent)] px-3 backdrop-blur-xl sm:px-5">
        <button onClick={() => { props.onUpdate({ lastPage: currentPage, lastOpenedAt: Date.now() }); props.onClose(); }} className="icon-button shrink-0" aria-label="العودة إلى المكتبة"><ArrowRight size={20} /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xs font-medium sm:text-sm">{fileRecord.name.replace(/\.pdf$/i, "")}</h1>
          <p className="mt-1 hidden text-[10px] text-[var(--muted)] sm:block">حُفظت الصفحة {currentPage.toLocaleString("ar")} تلقائياً</p>
        </div>
        <button onClick={props.onEdit} className="icon-button" aria-label="تحرير صور PDF" title="تحرير الصور"><Images size={18} /></button>
        <button onClick={() => setDrawer(drawer === "search" ? null : "search")} className={`icon-button ${drawer === "search" ? "bg-[var(--accent-soft)]" : ""}`} aria-label="البحث داخل الملف" title="بحث · Ctrl+F"><Search size={18} /></button>
        <button onClick={() => setBookmarkModal(true)} className={`icon-button ${currentPageHasBookmark ? "text-[var(--ink)]" : ""}`} aria-label="إضافة إشارة مرجعية" title="إشارة مرجعية · B"><BookmarkPlus size={18} fill={currentPageHasBookmark ? "currentColor" : "none"} /></button>
        <button onClick={() => setDrawer(drawer === "bookmarks" ? null : "bookmarks")} className={`icon-button relative ${drawer === "bookmarks" ? "bg-[var(--accent-soft)]" : ""}`} aria-label="عرض الإشارات المرجعية"><Bookmark size={18} />{fileRecord.bookmarks.length > 0 && <span className="font-latin absolute -left-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[8px] text-[var(--accent-ink)]">{fileRecord.bookmarks.length}</span>}</button>
        <button onClick={props.onShare} className="icon-button hidden sm:inline-flex" aria-label="مشاركة الملف"><Share2 size={18} /></button>
        <button onClick={props.onDelete} className="icon-button hover:!text-[var(--danger)]" aria-label="حذف الملف"><Trash2 size={17} /></button>
      </header>

      <main className="relative min-h-0 flex-1">
        {loadError ? (
          <div className="flex h-full items-center justify-center p-6 text-center"><div className="max-w-md"><FileWarning size={38} className="mx-auto text-[var(--danger)]" strokeWidth={1.3} /><h2 className="mt-5 text-xl font-semibold">لم نتمكن من فتح الملف</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{loadError}</p><button onClick={props.onClose} className="secondary-button mx-auto mt-6">العودة للمكتبة</button></div></div>
        ) : !pdf ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-sm text-[var(--muted)]"><LoaderCircle size={30} className="spin" /><span>جارٍ تجهيز الصفحات محلياً…</span></div>
        ) : (
          <div
            ref={viewerRef}
            onScroll={onViewerScroll}
            dir="ltr"
            className={`scrollbar-slim h-full overflow-auto ${direction === "horizontal" ? "reader-horizontal" : ""}`}
          >
            <div className={direction === "vertical" ? "flex min-h-full w-max min-w-full flex-col items-center gap-7 p-4 pb-32 sm:p-8 sm:pb-32" : "flex h-full min-h-[400px] w-max min-w-full items-center gap-8 px-[max(20px,calc((100vw-var(--page-width))/2))] py-7 pb-28"} style={{ "--page-width": `${pageWidth}px` } as React.CSSProperties}>
              {Array.from({ length: pdf.numPages }, (_, index) => index + 1).map((pageNumber) => (
                <div
                  key={pageNumber}
                  ref={(element) => { if (element) pageRefs.current.set(pageNumber, element); else pageRefs.current.delete(pageNumber); }}
                  className="pdf-page-item relative shrink-0"
                  style={{ width: pageWidth }}
                  data-page={pageNumber}
                >
                  <PdfPage pdf={pdf} pageNumber={pageNumber} width={pageWidth} rootRef={viewerRef} initiallyNear={pageNumber <= 2 || pageNumber === fileRecord.lastPage} />
                  <div dir="rtl" className="font-latin mt-3 text-center text-[10px] text-[var(--muted)]">{pageNumber} / {pdf.numPages}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {drawer && (
            <>
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(null)} className="absolute inset-0 z-30 bg-black/25 backdrop-blur-[2px] lg:bg-black/10" aria-label="إغلاق اللوحة" />
              <motion.aside initial={{ x: "105%" }} animate={{ x: 0 }} exit={{ x: "105%" }} transition={{ type: "spring", damping: 28, stiffness: 280 }} className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[390px] flex-col border-l border-[var(--line)] bg-[var(--bg-elevated)] shadow-[-20px_0_60px_rgba(0,0,0,.12)]">
                {drawer === "search" ? (
                  <SearchPanel
                    query={query} setQuery={setQuery} matches={matches} searching={searching} progress={searchProgress}
                    activeMatch={activeMatch} onClose={() => setDrawer(null)} onMatch={(index) => goToMatch(index)}
                    onNext={() => goToMatch(activeMatch + 1)} onPrevious={() => goToMatch(activeMatch - 1)}
                  />
                ) : (
                  <BookmarksPanel
                    bookmarks={fileRecord.bookmarks} currentPage={currentPage} onClose={() => setDrawer(null)}
                    onJump={(page) => { jumpToPage(page); if (window.innerWidth < 700) setDrawer(null); }}
                    onAdd={() => setBookmarkModal(true)}
                    onDelete={(id) => props.onUpdate({ bookmarks: fileRecord.bookmarks.filter((bookmark) => bookmark.id !== id) })}
                  />
                )}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </main>

      <motion.div initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .25 }} className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:bottom-6">
        <div className="scrollbar-slim pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elevated)_92%,transparent)] p-1.5 shadow-[0_15px_45px_rgba(15,20,10,.2)] backdrop-blur-xl" dir="ltr">
          <button onClick={() => changeZoom(zoom - .1)} disabled={zoom <= .5 || !pdf} className="icon-button !h-10 !w-10" aria-label="تصغير"><Minus size={16} /></button>
          <button onClick={() => props.onZoomChange(1)} className="font-latin h-10 min-w-[58px] rounded-full px-2 text-[11px] transition hover:bg-[var(--surface-soft)]" title="ملاءمة العرض">{Math.round(zoom * 100)}%</button>
          <button onClick={() => changeZoom(zoom + .1)} disabled={zoom >= 3 || !pdf} className="icon-button !h-10 !w-10" aria-label="تكبير"><Plus size={16} /></button>
          <span className="mx-1 h-6 w-px shrink-0 bg-[var(--line)]" />
          <button onClick={() => props.onDirectionChange(direction === "vertical" ? "horizontal" : "vertical")} className="icon-button !h-10 !w-10" aria-label={direction === "vertical" ? "التمرير الأفقي" : "التمرير الرأسي"} title={direction === "vertical" ? "تحويل إلى أفقي" : "تحويل إلى رأسي"}>{direction === "vertical" ? <Columns2 size={17} /> : <Rows3 size={17} />}</button>
          <span className="mx-1 h-6 w-px shrink-0 bg-[var(--line)]" />
          <button onClick={() => jumpToPage(currentPage - 1)} disabled={currentPage <= 1} className="icon-button !h-10 !w-10" aria-label="الصفحة السابقة"><ChevronLeft size={17} /></button>
          <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); jumpToPage(Number(data.get("page"))); }} className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-[var(--surface-soft)] px-2">
            <input key={currentPage} name="page" type="number" min={1} max={totalPages} defaultValue={currentPage} className="reader-page-input font-latin w-9 bg-transparent text-[11px] outline-none" aria-label="رقم الصفحة" onBlur={(event) => { const value = Number(event.currentTarget.value); if (value >= 1 && value <= totalPages) jumpToPage(value); }} />
            <span className="font-latin text-[10px] text-[var(--muted)]">/ {totalPages}</span>
          </form>
          <button onClick={() => jumpToPage(currentPage + 1)} disabled={currentPage >= totalPages} className="icon-button !h-10 !w-10" aria-label="الصفحة التالية"><ChevronRight size={17} /></button>
          <button onClick={() => jumpToPage(currentPage)} className="icon-button !hidden !h-10 !w-10 sm:!inline-flex" aria-label="توسيط الصفحة الحالية"><Maximize2 size={15} /></button>
        </div>
      </motion.div>

      <AnimatePresence>
        {bookmarkModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBookmarkModal(false)} className="absolute inset-0 bg-black/45 backdrop-blur-sm" aria-label="إلغاء" />
            <motion.form initial={{ opacity: 0, y: 25, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: .97 }} onSubmit={(event) => { event.preventDefault(); saveBookmark(); }} className="relative w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)]"><BookmarkPlus size={20} /></div>
              <h2 className="mt-5 text-xl font-semibold tracking-[-.035em]">احفظ هذه الصفحة</h2>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">أضف اسماً يذكّرك بسبب أهمية الصفحة {currentPage.toLocaleString("ar")}. يمكنك حفظ أكثر من إشارة للصفحة نفسها.</p>
              <label className="mt-5 block text-xs text-[var(--muted)]">اسم الإشارة<input autoFocus value={bookmarkLabel} onChange={(event) => setBookmarkLabel(event.target.value)} maxLength={80} placeholder={`مثال: خلاصة الفصل · صفحة ${currentPage}`} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]" /></label>
              <div className="mt-6 flex gap-2"><button type="submit" className="primary-button flex-1 !min-h-12 !py-3 !text-sm"><Check size={17} />حفظ الإشارة</button><button type="button" onClick={() => setBookmarkModal(false)} className="secondary-button !min-h-12 !py-3 !text-sm">إلغاء</button></div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface PdfPageProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  rootRef: RefObject<HTMLDivElement | null>;
  initiallyNear: boolean;
}

function PdfPage({ pdf, pageNumber, width, rootRef, initiallyNear }: PdfPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(initiallyNear);
  const [ratio, setRatio] = useState(.707);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { root: rootRef.current, rootMargin: "700px 500px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootRef]);

  useEffect(() => {
    if (!near || !canvasRef.current) return;
    let cancelled = false;
    let renderTask: { cancel: () => void } | undefined;
    setRendered(false);
    setFailed(false);
    const render = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;
        const original = page.getViewport({ scale: 1 });
        setRatio(original.width / original.height);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: (width / original.width) * pixelRatio });
        const canvas = canvasRef.current;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas is unavailable");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        const task = page.render({ canvasContext: context, viewport, canvas });
        renderTask = task;
        await task.promise;
        if (!cancelled) setRendered(true);
      } catch (error: unknown) {
        if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) setFailed(true);
      }
    };
    void render();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [near, pdf, pageNumber, width]);

  return <div ref={containerRef} className="pdf-page-frame relative w-full" style={{ aspectRatio: ratio }}>
    <canvas ref={canvasRef} className="pdf-page-canvas absolute inset-0" aria-label={`صفحة ${pageNumber}`} />
    {!rendered && !failed && <div className="skeleton absolute inset-0 flex items-center justify-center"><LoaderCircle size={22} className="spin text-[var(--muted)]" /></div>}
    {failed && <div className="absolute inset-0 flex min-h-40 flex-col items-center justify-center gap-2 bg-[var(--surface-soft)] p-5 text-center text-xs text-[var(--muted)]"><FileWarning size={22} /><span>تعذر رندر الصفحة {pageNumber.toLocaleString("ar")}</span></div>}
  </div>;
}

interface SearchPanelProps {
  query: string;
  setQuery: (value: string) => void;
  matches: SearchMatch[];
  searching: boolean;
  progress: { completed: number; total: number };
  activeMatch: number;
  onClose: () => void;
  onMatch: (index: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}

function SearchPanel({ query, setQuery, matches, searching, progress, activeMatch, onClose, onMatch, onNext, onPrevious }: SearchPanelProps) {
  return <>
    <PanelHeader title="البحث داخل الملف" subtitle="في النص المضمّن لكل الصفحات" onClose={onClose} />
    <div className="border-b border-[var(--line)] p-4">
      <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 focus-within:border-[var(--accent)]"><Search size={17} className="text-[var(--muted)]" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اكتب كلمتين أو أكثر…" className="min-w-0 flex-1 bg-transparent py-3.5 text-sm outline-none" aria-label="عبارة البحث داخل PDF" />{query && <button onClick={() => setQuery("")} className="icon-button !h-8 !w-8" aria-label="مسح"><X size={14} /></button>}</label>
      <div className="mt-3 flex min-h-8 items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--muted)]">{searching ? `فحص ${progress.completed.toLocaleString("ar")} من ${progress.total.toLocaleString("ar")} صفحة` : query.trim().length >= 2 ? `${matches.length.toLocaleString("ar")} نتيجة${matches.length >= 500 ? " (الحد الأقصى)" : ""}` : "اكتب حرفين على الأقل"}</span>
        {matches.length > 0 && <div className="flex items-center gap-1" dir="ltr"><button onClick={onPrevious} className="icon-button !h-8 !w-8" aria-label="النتيجة السابقة"><ChevronDown size={15} className="rotate-180" /></button><span className="font-latin min-w-12 text-center text-[10px]">{activeMatch + 1} / {matches.length}</span><button onClick={onNext} className="icon-button !h-8 !w-8" aria-label="النتيجة التالية"><ChevronDown size={15} /></button></div>}
      </div>
      {searching && <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-soft)]"><motion.div className="h-full bg-[var(--accent)]" animate={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} /></div>}
    </div>
    <div className="scrollbar-slim flex-1 overflow-y-auto p-3">
      {!searching && query.trim().length >= 2 && matches.length === 0 ? <div className="px-4 py-12 text-center"><Search size={26} className="mx-auto text-[var(--muted)]" /><h3 className="mt-4 text-sm font-medium">لم نعثر على هذه العبارة</h3><p className="mt-3 text-xs leading-6 text-[var(--muted)]">إذا كان الملف صوراً ممسوحة ضوئياً فلن يحتوي على طبقة نص. يلزم OCR أولاً؛ لا يدّعي التطبيق قراءة الصور.</p></div> : (
        <div className="space-y-2">{matches.map((match, index) => <button key={match.id} onClick={() => onMatch(index)} className={`w-full rounded-2xl border p-4 text-right transition ${index === activeMatch ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-transparent hover:bg-[var(--surface-soft)]"}`}><div className="mb-2 flex items-center justify-between text-[10px] text-[var(--muted)]"><span>صفحة {match.page.toLocaleString("ar")}</span><span className="font-latin">#{index + 1}</span></div><p className="text-xs leading-6 text-[var(--ink-soft)]"><HighlightedSnippet snippet={match.snippet} query={query} /></p></button>)}</div>
      )}
    </div>
  </>;
}

function HighlightedSnippet({ snippet, query }: { snippet: string; query: string }) {
  const index = snippet.toLocaleLowerCase().indexOf(query.trim().toLocaleLowerCase());
  if (index < 0) return <>{snippet}</>;
  return <>{snippet.slice(0, index)}<mark className="rounded bg-[var(--accent)] px-0.5 text-[var(--accent-ink)]">{snippet.slice(index, index + query.trim().length)}</mark>{snippet.slice(index + query.trim().length)}</>;
}

function BookmarksPanel({ bookmarks, currentPage, onClose, onJump, onAdd, onDelete }: { bookmarks: PdfBookmark[]; currentPage: number; onClose: () => void; onJump: (page: number) => void; onAdd: () => void; onDelete: (id: string) => void }) {
  return <>
    <PanelHeader title="الإشارات المرجعية" subtitle={`${bookmarks.length.toLocaleString("ar")} مواضع محفوظة في هذا الملف`} onClose={onClose} />
    <div className="border-b border-[var(--line)] p-4"><button onClick={onAdd} className="secondary-button w-full !min-h-11 !py-2.5 !text-xs"><BookmarkPlus size={16} />إشارة للصفحة {currentPage.toLocaleString("ar")}</button></div>
    <div className="scrollbar-slim flex-1 overflow-y-auto p-3">
      {bookmarks.length === 0 ? <div className="px-5 py-14 text-center"><Bookmark size={30} className="mx-auto text-[var(--muted)]" strokeWidth={1.3} /><h3 className="mt-4 text-sm font-medium">لا توجد إشارات بعد</h3><p className="mt-2 text-xs leading-6 text-[var(--muted)]">احفظ صفحة باسم واضح، وستجدها هنا حتى بعد إغلاق التطبيق.</p></div> : <div className="space-y-2">{[...bookmarks].sort((a, b) => a.page - b.page || a.createdAt - b.createdAt).map((bookmark) => <motion.div layout key={bookmark.id} className={`group flex items-center gap-2 rounded-2xl border p-2 ${bookmark.page === currentPage ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-transparent hover:bg-[var(--surface-soft)]"}`}><button onClick={() => onJump(bookmark.page)} className="flex min-w-0 flex-1 items-center gap-3 p-2 text-right"><span className="font-latin flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-xs">{bookmark.page}</span><span className="min-w-0"><span className="block truncate text-xs font-medium">{bookmark.label}</span><span className="mt-1 block text-[10px] text-[var(--muted)]">الانتقال إلى الصفحة {bookmark.page.toLocaleString("ar")}</span></span></button><button onClick={() => onDelete(bookmark.id)} className="icon-button !h-9 !w-9 shrink-0 hover:!text-[var(--danger)]" aria-label={`حذف ${bookmark.label}`}><Trash2 size={15} /></button></motion.div>)}</div>}
    </div>
  </>;
}

function PanelHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-5"><div className="flex-1"><h2 className="text-base font-semibold tracking-[-.025em]">{title}</h2><p className="mt-1.5 text-[10px] text-[var(--muted)]">{subtitle}</p></div><button onClick={onClose} className="icon-button" aria-label="إغلاق"><X size={18} /></button></div>;
}

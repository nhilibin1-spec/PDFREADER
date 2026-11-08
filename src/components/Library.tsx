import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownUp, Bookmark, BookOpen, Check, Clock3, FilePlus2, FileText, Grid2X2,
  Heart, Images, List, MoreHorizontal, Search, Share2, Sparkles, Trash2, X,
} from "lucide-react";
import type { LibraryFilter, PdfRecord, SortKey, ViewMode } from "../types";
import { formatBytes, formatDate, normalizeSearchText } from "../lib/pdf";

interface LibraryProps {
  documents: PdfRecord[];
  loading: boolean;
  importing: boolean;
  sortKey: SortKey;
  viewMode: ViewMode;
  onSortChange: (value: SortKey) => void;
  onViewChange: (value: ViewMode) => void;
  onImport: () => void;
  onSample: () => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onFavorite: (document: PdfRecord) => void;
  onShare: (document: PdfRecord) => void;
  onDelete: (document: PdfRecord) => void;
}

const filters: { value: LibraryFilter; label: string }[] = [
  { value: "all", label: "كل الملفات" },
  { value: "reading", label: "أكمل القراءة" },
  { value: "favorites", label: "المفضلة" },
  { value: "bookmarked", label: "بإشارات مرجعية" },
];

export function Library(props: LibraryProps) {
  const { documents, loading, importing, sortKey, viewMode } = props;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [menuId, setMenuId] = useState<string | null>(null);

  const visibleDocuments = useMemo(() => {
    const needle = normalizeSearchText(query);
    return documents
      .filter((document) => {
        if (needle && !normalizeSearchText(document.name).includes(needle)) return false;
        if (filter === "reading") return document.lastOpenedAt !== null;
        if (filter === "favorites") return document.favorite;
        if (filter === "bookmarked") return document.bookmarks.length > 0;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === "name") return a.name.localeCompare(b.name, "ar");
        if (sortKey === "size") return b.size - a.size;
        if (sortKey === "added") return b.addedAt - a.addedAt;
        return (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0) || b.addedAt - a.addedAt;
      });
  }, [documents, filter, query, sortKey]);

  const totalPages = documents.reduce((sum, document) => sum + document.totalPages, 0);
  const totalBookmarks = documents.reduce((sum, document) => sum + document.bookmarks.length, 0);
  const totalBytes = documents.reduce((sum, document) => sum + document.size, 0);

  return (
    <section id="library" className="relative scroll-mt-24 border-t border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1380px]">
        <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .75, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs text-[var(--muted)]"><span className="h-px w-8 bg-[var(--line-strong)]" />مساحتك المحلية</div>
            <h2 className="text-4xl font-semibold tracking-[-.055em] sm:text-6xl">مكتبتك<span className="text-[var(--muted)]">، كما تحبها.</span></h2>
            <p className="mt-5 max-w-xl text-sm font-light leading-7 text-[var(--muted)]">كل ملف هنا حقيقي ومحفوظ على جهازك. ابحث بالاسم، غيّر ترتيب المجموعة، وافتح آخر صفحة قرأتها بضغطة واحدة.</p>
          </div>
          <button onClick={props.onImport} disabled={importing} className="primary-button self-start md:self-auto"><FilePlus2 size={18} />إضافة ملفات</button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 35 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} transition={{ duration: .65, delay: .12 }} className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-4">
          {[
            { label: "المستندات", value: documents.length.toLocaleString("ar"), icon: FileText },
            { label: "إجمالي الصفحات", value: totalPages.toLocaleString("ar"), icon: BookOpen },
            { label: "الإشارات المحفوظة", value: totalBookmarks.toLocaleString("ar"), icon: Bookmark },
            { label: "المساحة المستخدمة", value: formatBytes(totalBytes), icon: Clock3 },
          ].map((stat) => <div key={stat.label} className="bg-[var(--surface)] p-5 sm:p-6"><stat.icon size={17} className="mb-5 text-[var(--muted)]" strokeWidth={1.5} /><div className="font-latin text-2xl font-semibold tracking-[-.04em]">{stat.value}</div><div className="mt-1 text-[11px] text-[var(--muted)]">{stat.label}</div></div>)}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .65 }} className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl bg-[var(--surface-soft)] px-4 focus-within:ring-2 focus-within:ring-[var(--accent)]">
              <Search size={18} className="shrink-0 text-[var(--muted)]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم الملف…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]" aria-label="البحث في أسماء الملفات" />
              {query && <button onClick={() => setQuery("")} className="icon-button !h-8 !w-8" aria-label="مسح البحث"><X size={15} /></button>}
            </label>
            <div className="flex items-center gap-2">
              <label className="flex min-h-12 flex-1 items-center gap-2 rounded-2xl border border-[var(--line)] px-3 lg:flex-none">
                <ArrowDownUp size={16} className="text-[var(--muted)]" />
                <select value={sortKey} onChange={(event) => props.onSortChange(event.target.value as SortKey)} className="w-full bg-transparent py-3 text-xs outline-none lg:w-auto" aria-label="ترتيب الملفات">
                  <option value="recent">آخر قراءة</option><option value="added">تاريخ الإضافة</option><option value="name">الاسم</option><option value="size">الحجم</option>
                </select>
              </label>
              <div className="flex rounded-2xl border border-[var(--line)] p-1" aria-label="طريقة العرض">
                <button onClick={() => props.onViewChange("grid")} className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${viewMode === "grid" ? "bg-[var(--ink)] text-[var(--bg)]" : "text-[var(--muted)]"}`} aria-label="عرض شبكي" aria-pressed={viewMode === "grid"}><Grid2X2 size={16} /></button>
                <button onClick={() => props.onViewChange("list")} className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${viewMode === "list" ? "bg-[var(--ink)] text-[var(--bg)]" : "text-[var(--muted)]"}`} aria-label="عرض قائمة" aria-pressed={viewMode === "list"}><List size={17} /></button>
              </div>
            </div>
          </div>
          <div className="scrollbar-slim mt-3 flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[11px] transition ${filter === item.value ? "bg-[var(--accent-soft)] font-medium text-[var(--ink)]" : "text-[var(--muted)] hover:bg-[var(--surface-soft)]"}`} aria-pressed={filter === item.value}>{filter === item.value && <Check size={12} />}{item.label}</button>)}
          </div>
        </motion.div>

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-[420px] rounded-3xl" />)}</div>
        ) : documents.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className="relative mt-8 overflow-hidden rounded-[32px] border border-dashed border-[var(--line-strong)] bg-[var(--surface)] px-6 py-16 text-center sm:py-24">
            <div className="hero-glow pointer-events-none absolute inset-0 opacity-60" />
            <div className="relative mx-auto max-w-lg">
              <div className="mx-auto mb-7 flex h-20 w-20 rotate-[-6deg] items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--bg)] shadow-[var(--shadow)]"><FileText size={32} strokeWidth={1.25} /></div>
              <h3 className="text-2xl font-semibold tracking-[-.04em]">الصفحة الأولى تبدأ من هنا</h3>
              <p className="mx-auto mt-4 max-w-md text-sm font-light leading-7 text-[var(--muted)]">اختر PDF من جهازك، أو أنشئ دليل وثيقة التفاعلي من ثماني صفحات لتجربة البحث والتكبير والإشارات فوراً.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3"><button onClick={props.onImport} disabled={importing} className="primary-button disabled:opacity-60"><FilePlus2 size={17} />اختيار ملف</button><button onClick={props.onSample} disabled={importing} className="secondary-button disabled:opacity-60"><Sparkles size={16} />{importing ? "جارٍ التجهيز…" : "إنشاء الملف التجريبي"}</button></div>
            </div>
          </motion.div>
        ) : visibleDocuments.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--surface)] py-16 text-center"><Search size={28} className="mx-auto text-[var(--muted)]" /><h3 className="mt-4 font-medium">لا توجد نتائج مطابقة</h3><p className="mt-2 text-sm text-[var(--muted)]">جرّب اسماً آخر أو أعد عرض كل الملفات.</p><button onClick={() => { setQuery(""); setFilter("all"); }} className="secondary-button mx-auto mt-5 !min-h-11 !py-2 !text-xs">إعادة ضبط البحث</button></div>
        ) : (
          <motion.div layout className={viewMode === "grid" ? "mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "mt-8 space-y-3"}>
            <AnimatePresence mode="popLayout">
              {visibleDocuments.map((document, index) => (
                <motion.article
                  layout key={document.id}
                  initial={{ opacity: 0, y: 35, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .9, transition: { duration: .2 } }}
                  transition={{ duration: .45, delay: Math.min(index * .045, .3), ease: [0.22, 1, 0.36, 1] }}
                  className={`group relative border border-[var(--line)] bg-[var(--surface)] transition-colors hover:border-[var(--line-strong)] ${viewMode === "grid" ? "overflow-hidden rounded-3xl" : "rounded-2xl"}`}
                >
                  {viewMode === "grid" ? (
                    <>
                      <button onClick={() => props.onOpen(document.id)} className="relative block h-[265px] w-full overflow-hidden bg-[var(--reader)] p-7 text-right" aria-label={`فتح ${document.name}`}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_50%)]" />
                        <div className="relative mx-auto h-full w-[69%] max-w-[190px] rotate-[-2deg] bg-white shadow-[0_18px_40px_rgba(20,25,15,.18)] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-[1.035]">
                          {document.thumbnail ? <img src={document.thumbnail} alt="" className="h-full w-full object-cover object-top" /> : <div className="flex h-full items-center justify-center text-[#9a9d94]"><FileText size={38} strokeWidth={1} /></div>}
                          <span className="font-latin absolute bottom-2 left-2 rounded-full bg-[#171914]/80 px-2 py-1 text-[8px] text-white backdrop-blur">PDF</span>
                        </div>
                        {document.favorite && <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]"><Heart size={14} fill="currentColor" /></span>}
                      </button>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <button onClick={() => props.onOpen(document.id)} className="min-w-0 text-right"><h3 className="truncate text-sm font-medium" title={document.name}>{document.name.replace(/\.pdf$/i, "")}</h3><p className="mt-2 text-[11px] text-[var(--muted)]">{document.totalPages.toLocaleString("ar")} صفحة · {formatBytes(document.size)}</p></button>
                          <div className="relative">
                            <button onClick={() => setMenuId(menuId === document.id ? null : document.id)} className="icon-button !h-9 !w-9" aria-label="خيارات الملف"><MoreHorizontal size={18} /></button>
                            <AnimatePresence>{menuId === document.id && <DocumentMenu document={document} onClose={() => setMenuId(null)} onOpen={props.onOpen} onEdit={props.onEdit} onFavorite={props.onFavorite} onShare={props.onShare} onDelete={props.onDelete} />}</AnimatePresence>
                          </div>
                        </div>
                        <Progress document={document} />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-4 p-3 sm:p-4">
                      <button onClick={() => props.onOpen(document.id)} className="h-[86px] w-[64px] shrink-0 overflow-hidden rounded-lg bg-white shadow-sm"><>{document.thumbnail ? <img src={document.thumbnail} alt="" className="h-full w-full object-cover object-top" /> : <span className="flex h-full items-center justify-center text-[#999]"><FileText size={23} /></span>}</></button>
                      <button onClick={() => props.onOpen(document.id)} className="min-w-0 flex-1 text-right"><h3 className="truncate text-sm font-medium">{document.name.replace(/\.pdf$/i, "")}</h3><p className="mt-2 text-[11px] text-[var(--muted)]">{document.totalPages.toLocaleString("ar")} صفحة · {formatBytes(document.size)} · {formatDate(document.addedAt)}</p><div className="max-w-sm"><Progress document={document} /></div></button>
                      <div className="hidden items-center gap-1 sm:flex"><button onClick={() => props.onEdit(document.id)} className="icon-button" aria-label="تحرير صور PDF"><Images size={17} /></button><button onClick={() => props.onFavorite(document)} className={`icon-button ${document.favorite ? "text-[var(--danger)]" : ""}`} aria-label="تبديل المفضلة"><Heart size={17} fill={document.favorite ? "currentColor" : "none"} /></button><button onClick={() => props.onShare(document)} className="icon-button" aria-label="مشاركة الملف"><Share2 size={17} /></button><button onClick={() => props.onDelete(document)} className="icon-button hover:!text-[var(--danger)]" aria-label="حذف الملف"><Trash2 size={17} /></button></div>
                      <div className="relative sm:hidden"><button onClick={() => setMenuId(menuId === document.id ? null : document.id)} className="icon-button" aria-label="خيارات الملف"><MoreHorizontal size={18} /></button><AnimatePresence>{menuId === document.id && <DocumentMenu document={document} onClose={() => setMenuId(null)} onOpen={props.onOpen} onEdit={props.onEdit} onFavorite={props.onFavorite} onShare={props.onShare} onDelete={props.onDelete} />}</AnimatePresence></div>
                    </div>
                  )}
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function Progress({ document }: { document: PdfRecord }) {
  const progress = document.totalPages ? Math.round((document.lastPage / document.totalPages) * 100) : 0;
  return <div className="mt-5"><div className="mb-2 flex items-center justify-between text-[10px] text-[var(--muted)]"><span>{document.lastOpenedAt ? `توقفت عند صفحة ${document.lastPage.toLocaleString("ar")}` : `أضيف ${formatDate(document.addedAt)}`}</span><span className="flex items-center gap-1">{document.bookmarks.length > 0 && <><Bookmark size={10} />{document.bookmarks.length.toLocaleString("ar")}</>}</span></div><div className="h-1 overflow-hidden rounded-full bg-[var(--surface-soft)]"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full bg-[var(--accent)]" /></div></div>;
}

interface MenuProps {
  document: PdfRecord;
  onClose: () => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onFavorite: (document: PdfRecord) => void;
  onShare: (document: PdfRecord) => void;
  onDelete: (document: PdfRecord) => void;
}

function DocumentMenu({ document, onClose, onOpen, onEdit, onFavorite, onShare, onDelete }: MenuProps) {
  const run = (action: () => void) => { action(); onClose(); };
  return <motion.div initial={{ opacity: 0, y: -8, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: .96 }} transition={{ duration: .18 }} className="absolute left-0 top-11 z-30 w-44 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1.5 text-right shadow-[var(--shadow)]">
    <button onClick={() => run(() => onOpen(document.id))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs hover:bg-[var(--surface-soft)]"><BookOpen size={14} />فتح الملف</button>
    <button onClick={() => run(() => onEdit(document.id))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs hover:bg-[var(--surface-soft)]"><Images size={14} />تحرير الصور</button>
    <button onClick={() => run(() => onFavorite(document))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs hover:bg-[var(--surface-soft)]"><Heart size={14} fill={document.favorite ? "currentColor" : "none"} />{document.favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}</button>
    <button onClick={() => run(() => onShare(document))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs hover:bg-[var(--surface-soft)]"><Share2 size={14} />مشاركة PDF</button>
    <div className="my-1 h-px bg-[var(--line)]" />
    <button onClick={() => run(() => onDelete(document))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-[var(--danger)] hover:bg-[var(--surface-soft)]"><Trash2 size={14} />حذف نهائي</button>
  </motion.div>;
}

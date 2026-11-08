import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Braces, Check, CheckCircle2, ChevronLeft, Clipboard, Code2, Download,
  File, FileCode2, FolderOpen, LoaderCircle, Search, Smartphone, X,
} from "lucide-react";
import { nativeProjectFiles } from "../data/nativeProject";
import { downloadNativeProject, downloadTextFile } from "../lib/exportProject";
import { copyText } from "../lib/clipboard";

export function CodeStudio() {
  const [selectedPath, setSelectedPath] = useState("src/screens/ReaderScreen.tsx");
  const [fileQuery, setFileQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [mobileTree, setMobileTree] = useState(false);
  const selected = nativeProjectFiles.find((file) => file.path === selectedPath) ?? nativeProjectFiles[0]!;
  const totalLines = nativeProjectFiles.reduce((sum, file) => sum + file.content.split("\n").length, 0);
  const visibleFiles = useMemo(() => nativeProjectFiles.filter((file) => file.path.toLowerCase().includes(fileQuery.toLowerCase())), [fileQuery]);

  const copyCode = async () => {
    await copyText(selected.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const downloadAll = async () => {
    setDownloading(true);
    try { await downloadNativeProject(); } finally { setDownloading(false); }
  };

  return (
    <section id="android-source" className="scroll-mt-20 border-t border-[var(--line)] bg-[var(--bg)] px-4 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1380px]">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <motion.div initial={{ opacity: 0, y: 45 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }} transition={{ duration: .75 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-[11px] text-[var(--muted)]"><Smartphone size={14} />React Native · TypeScript · Android</div>
            <h2 className="max-w-4xl text-4xl font-semibold leading-[1.2] tracking-[-.055em] sm:text-6xl">ليس نموذجاً للواجهة.<br /><span className="text-[var(--muted)]">هذا مشروعك الأصلي كاملاً.</span></h2>
            <p className="mt-6 max-w-2xl text-sm font-light leading-8 text-[var(--muted)]">مشروع React Native منفصل لقارئ PDF الأصلي، وليس غلافاً لمحرر الويب. لتغليف محرر الصور الحالي كـAPK استخدم حزمة Capacitor في قسم «تطبيق أندرويد» أعلاه.</p>
          </motion.div>
          <motion.button initial={{ opacity: 0, x: -25 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} onClick={() => { void downloadAll(); }} disabled={downloading} className="primary-button self-start lg:self-auto">
            {downloading ? <LoaderCircle size={18} className="spin" /> : <Download size={18} />}{downloading ? "جارٍ تجهيز ZIP…" : "تنزيل مشروع أندرويد"}
          </motion.button>
        </div>

        <motion.div initial={{ opacity: 0, y: 45 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .75, delay: .1 }} className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {["استيراد SAF آمن", "PDF Viewer أصلي", "بحث PDFBox محلي", "إشارات دائمة", "مشاركة FileProvider", "ثيم داكن وفاتح"].map((feature) => <div key={feature} className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-[10px] text-[var(--ink-soft)]"><CheckCircle2 size={14} className="shrink-0 text-[var(--ink)]" />{feature}</div>)}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 70, scale: .97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: .12 }} transition={{ duration: .9, ease: [0.22, 1, 0.36, 1] }} className="mt-8 overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
          <div className="flex h-14 items-center gap-3 border-b border-[var(--line)] px-4 sm:px-5">
            <div className="flex gap-1.5" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-[var(--line-strong)]" /><span className="h-2.5 w-2.5 rounded-full bg-[var(--line-strong)]" /><span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" /></div>
            <div className="mr-2 flex items-center gap-2 text-xs font-medium"><Braces size={15} />wathiqa-pdf-reader</div>
            <div className="font-latin mr-auto hidden text-[10px] text-[var(--muted)] sm:block">{nativeProjectFiles.length} files · {totalLines.toLocaleString("en")} lines</div>
            <button onClick={() => setMobileTree(!mobileTree)} className="secondary-button !min-h-9 !px-3 !py-1.5 !text-[10px] lg:hidden"><FolderOpen size={14} />الملفات</button>
          </div>

          <div className="relative grid h-[720px] lg:grid-cols-[285px_minmax(0,1fr)]">
            <aside className="hidden min-h-0 flex-col border-l border-[var(--line)] lg:flex">
              <FileTree files={visibleFiles} query={fileQuery} setQuery={setFileQuery} selectedPath={selected.path} onSelect={setSelectedPath} />
            </aside>
            <AnimatePresence>{mobileTree && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"><motion.aside initial={{ x: "105%" }} animate={{ x: 0 }} exit={{ x: "105%" }} className="absolute inset-y-0 right-0 flex w-[86%] max-w-[330px] flex-col border-l border-[var(--line)] bg-[var(--bg-elevated)]"><button onClick={() => setMobileTree(false)} className="icon-button absolute left-3 top-3 z-10 bg-[var(--surface)]" aria-label="إغلاق الملفات"><X size={17} /></button><FileTree files={visibleFiles} query={fileQuery} setQuery={setFileQuery} selectedPath={selected.path} onSelect={(path) => { setSelectedPath(path); setMobileTree(false); }} /></motion.aside></motion.div>}</AnimatePresence>

            <div className="flex min-w-0 flex-col">
              <div className="flex min-h-[66px] items-center gap-2 border-b border-[var(--line)] px-3 sm:px-5">
                <FileCode2 size={17} className="shrink-0 text-[var(--muted)]" />
                <div className="min-w-0 flex-1" dir="ltr"><div className="truncate text-left text-[11px] font-medium">{selected.path}</div><div className="mt-1 truncate text-left text-[9px] text-[var(--muted)]">{selected.language} · {selected.content.split("\n").length} lines</div></div>
                <button onClick={() => downloadTextFile(selected.content, selected.path)} className="icon-button !h-9 !w-9" aria-label="تنزيل هذا الملف" title="تنزيل الملف"><Download size={15} /></button>
                <button onClick={() => { void copyCode(); }} className="secondary-button !min-h-9 !px-3 !py-1.5 !text-[10px]">{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "تم النسخ" : "نسخ الكود"}</button>
              </div>
              <div className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-[10px] leading-5 text-[var(--muted)]">{selected.description}</div>
              <div className="scrollbar-slim code-scroll flex-1 overflow-auto bg-[var(--bg-elevated)] py-4 text-[11px] leading-[1.55rem] sm:text-xs">
                <AnimatePresence mode="wait"><motion.code key={selected.path} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: .18 }} className="block min-w-max">
                  {selected.content.split("\n").map((line, index) => <div className="code-line" key={index}><span className="code-number">{index + 1}</span><span className={`code-text ${line.trimStart().startsWith("//") || line.trimStart().startsWith("#") ? "text-[var(--muted)]" : "text-[var(--ink-soft)]"}`}>{colorCodeLine(line)}</span></div>)}
                </motion.code></AnimatePresence>
              </div>
              <div className="flex min-h-11 items-center justify-between border-t border-[var(--line)] px-4 text-[9px] text-[var(--muted)]"><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />UTF-8 · LF</span><button onClick={() => { const index = nativeProjectFiles.findIndex((file) => file.path === selected.path); setSelectedPath(nativeProjectFiles[(index + 1) % nativeProjectFiles.length]!.path); }} className="flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]">الملف التالي<ChevronLeft size={12} /></button></div>
            </div>
          </div>
        </motion.div>
        <p className="mt-4 text-center text-[10px] leading-6 text-[var(--muted)]">يحتوي ZIP على {nativeProjectFiles.length.toLocaleString("ar")} ملفاً حقيقياً، بما فيها README عربي وpackage.json. لا يحتاج المشروع إلى API key أو خادم.</p>
      </div>
    </section>
  );
}

function FileTree({ files, query, setQuery, selectedPath, onSelect }: { files: typeof nativeProjectFiles; query: string; setQuery: (value: string) => void; selectedPath: string; onSelect: (path: string) => void }) {
  return <>
    <div className="p-3 pb-2"><label className="flex items-center gap-2 rounded-xl bg-[var(--surface-soft)] px-3"><Search size={14} className="text-[var(--muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن ملف…" className="min-w-0 flex-1 bg-transparent py-2.5 text-[10px] outline-none" /></label></div>
    <div className="px-4 pb-2 pt-2 text-[9px] text-[var(--muted)]" dir="ltr"><span className="flex items-center gap-2"><FolderOpen size={13} />wathiqa-pdf-reader</span></div>
    <div className="scrollbar-slim flex-1 overflow-y-auto px-2 pb-4 pt-1" dir="ltr">
      {files.map((file) => <button key={file.path} onClick={() => onSelect(file.path)} className={`group mb-0.5 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition ${selectedPath === file.path ? "bg-[var(--accent-soft)] text-[var(--ink)]" : "text-[var(--muted)] hover:bg-[var(--surface-soft)]"}`} title={file.description}><File size={13} className="shrink-0" /><span className="min-w-0 flex-1 truncate text-[10px]">{file.path}</span>{selectedPath === file.path && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />}</button>)}
      {files.length === 0 && <div className="p-5 text-center text-[10px] text-[var(--muted)]">No matching files</div>}
    </div>
    <div className="border-t border-[var(--line)] p-4 text-[9px] leading-5 text-[var(--muted)]" dir="rtl"><span className="flex items-center gap-2"><Code2 size={13} />Components · Screens · Services</span></div>
  </>;
}

function colorCodeLine(line: string) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("import ") || trimmed.startsWith("export ")) return <span className="text-[var(--ink)]">{line}</span>;
  return line || " ";
}

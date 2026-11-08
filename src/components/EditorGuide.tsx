import { useState } from "react";
import { motion } from "framer-motion";
import { Braces, Check, Clipboard, Crop, Download, FileCode2, Images, MousePointer2, Save, ScanSearch } from "lucide-react";
import engineSource from "../editor/imageEngine.ts?raw";
import componentSource from "./ImageEditor.tsx?raw";
import typesSource from "../editor/types.ts?raw";
import { copyText } from "../lib/clipboard";
import { downloadTextFile } from "../lib/exportProject";

const sources = {
  engine: { path: "src/editor/imageEngine.ts", label: "محرك الصور", content: engineSource },
  component: { path: "src/components/ImageEditor.tsx", label: "واجهة المحرر", content: componentSource },
  types: { path: "src/editor/types.ts", label: "الأنواع", content: typesSource },
};

type SourceKey = keyof typeof sources;

const steps = [
  { icon: ScanSearch, title: "1. اكتشاف الموضع", text: "تقرأ detectPageImages قائمة عمليات PDF.js. تتبع q وQ وcm بمكدس مستقل، ثم تحوّل مربع الوحدة إلى أربع نقاط. لذلك تعمل الإطارات مع الصور المكررة والمدورة، لا مع آخر cm فقط.", token: "getOperatorList · OPS.transform" },
  { icon: MousePointer2, title: "2. النقر والمعرض", text: "كل polygon فوق الصفحة مرتبط بمعرف عملية الرسم. النقر يحفظ الصورة المستهدفة ثم يستدعي input type=file بقبول PNG وJPEG وWebP، فيفتح منتقي الصور أو معرض الهاتف مباشرة.", token: "onSelect · input.accept" },
  { icon: Crop, title: "3. الملاءمة والمصفوفة", text: "القص المتناسب يعيد قص الصورة في Canvas إلى نسبة الإطار. الاحتواء يضيف مصفوفة محلية للتوسيط دون تشويه، والتمدد يستخدم المصفوفة الأصلية كما هي. المعاينة والتصدير يشتركان في replacementDrawMatrix نفسها.", token: "replacementDrawMatrix" },
  { icon: Save, title: "4. ملف جديد", text: "يحمّل exportReplacedPdf الأصل بلا تغيير، يضمّن الصورة بـembedPng أو embedJpg، ويضيف عمليات الرسم بإحداثيات PDF. بعد save يتحقق من عدد الصفحات، ثم ينزّل Blob ويضيفه إلى المكتبة.", token: "PDFDocument.save · Blob" },
];

export function EditorGuide() {
  const [active, setActive] = useState<SourceKey>("engine");
  const [copied, setCopied] = useState(false);
  const source = sources[active];
  const copy = async () => {
    await copyText(source.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section id="editor-guide" className="scroll-mt-20 border-t border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1280px]">
        <motion.div initial={{ opacity: 0, y: 45 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} className="grid gap-7 lg:grid-cols-[1fr_.7fr] lg:items-end">
          <div><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-[11px] text-[var(--muted)]"><Images size={14} />PDF.js + pdf-lib + Canvas</div><h2 className="text-4xl font-semibold leading-[1.2] tracking-[-.055em] sm:text-6xl">الكود الذي يشغّل المحرر.<br /><span className="text-[var(--muted)]">بلا اختصارات مخفية.</span></h2></div>
          <p className="max-w-xl text-sm font-light leading-8 text-[var(--muted)]">هذه الملفات تُقرأ مباشرة من مصدر التطبيق العامل. انسخها إلى مشروع React + TypeScript، وثبّت pdfjs-dist وpdf-lib. لا يحتاج الاكتشاف أو الاستبدال إلى خادم.</p>
        </motion.div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => <motion.article key={step.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }} transition={{ delay: index * .06 }} className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)]"><step.icon size={18} /></span><h3 className="text-sm font-semibold">{step.title}</h3></div><p className="mt-4 text-xs font-light leading-7 text-[var(--muted)]">{step.text}</p><code dir="ltr" className="font-latin mt-4 block text-left text-[10px] text-[var(--ink-soft)]">{step.token}</code></motion.article>)}
        </div>

        <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} className="mt-8 overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--bg)] shadow-[var(--shadow)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] p-3 sm:p-4"><Braces size={17} className="mx-1 text-[var(--muted)]" /><div className="flex flex-1 gap-1">{(Object.keys(sources) as SourceKey[]).map((key) => <button key={key} onClick={() => setActive(key)} className={`rounded-full px-3 py-2 text-[10px] transition ${active === key ? "bg-[var(--accent-soft)] text-[var(--ink)]" : "text-[var(--muted)] hover:bg-[var(--surface-soft)]"}`}>{sources[key].label}</button>)}</div><button onClick={() => downloadTextFile(source.content, source.path)} className="icon-button !h-9 !w-9" aria-label="تنزيل الملف"><Download size={15} /></button><button onClick={() => { void copy(); }} className="secondary-button !min-h-9 !px-3 !py-1.5 !text-[10px]">{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "تم النسخ" : "نسخ الكود"}</button></div>
          <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3" dir="ltr"><FileCode2 size={14} className="text-[var(--muted)]" /><span className="font-latin text-[10px]">{source.path}</span><span className="font-latin ml-auto text-[9px] text-[var(--muted)]">{source.content.split("\n").length} lines</span></div>
          <pre className="scrollbar-slim code-scroll max-h-[560px] overflow-auto p-5 text-[11px] leading-6 text-[var(--ink-soft)]"><code>{source.content}</code></pre>
        </motion.div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-center"><div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-[10px] leading-6 text-[var(--muted)]"><strong className="mb-1 block text-[var(--ink)]">ملاحظة هندسية مهمة</strong>الطريقة تضيف لوحة رسم جديدة فوق القديمة مع الاحتفاظ بالنص. الصور المضمّنة داخل inline images مدعومة للاكتشاف والاستبدال البصري؛ أما صور masks وبعض Form XObjects المركبة فقد تحتاج محرر PDF تجارياً أو معالجة خاصة.</div><button onClick={() => { void copyText("npm install pdfjs-dist pdf-lib"); }} className="secondary-button !text-xs"><Clipboard size={15} />نسخ أمر تثبيت الاعتماديات</button></div>
      </div>
    </section>
  );
}

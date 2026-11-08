import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowLeft, Bookmark, FilePlus2, Search, ShieldCheck, Sparkles } from "lucide-react";

interface HeroProps {
  documentCount: number;
  pageCount: number;
  importing: boolean;
  onImport: () => void;
  onSample: () => void;
}

export function Hero({ documentCount, pageCount, importing, onImport, onSample }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const deviceY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 190]);
  const deviceScale = useTransform(scrollYProgress, [0, 1], [1, reduceMotion ? 1 : 0.74]);
  const deviceRotate = useTransform(scrollYProgress, [0, 1], [-4, reduceMotion ? -4 : 7]);
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -130]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0.15]);

  return (
    <section ref={sectionRef} className="relative min-h-[100svh] overflow-hidden pb-16 pt-28 sm:pt-32" aria-labelledby="hero-title">
      <motion.div style={{ y: backgroundY }} className="hero-grid pointer-events-none absolute -inset-y-32 inset-x-0" />
      <div className="hero-glow pointer-events-none absolute -left-[15vw] top-[5vh] h-[70vw] max-h-[850px] w-[70vw] max-w-[850px] rounded-full" />
      <motion.div style={{ y: backgroundY }} className="font-latin pointer-events-none absolute -bottom-[5vw] left-[-2vw] select-none text-[30vw] font-bold leading-none tracking-[-.1em] text-[var(--ink)] opacity-[.025]">PDF</motion.div>

      <div className="relative mx-auto grid min-h-[calc(100svh-10rem)] max-w-[1480px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:gap-4">
        <motion.div style={{ opacity: textOpacity }} className="relative z-10 pt-4 lg:pt-0">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: .25, duration: .65 }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-xs text-[var(--muted)] shadow-sm"
          >
            <ShieldCheck size={15} className="text-[var(--ink)]" />
محرر صور PDF محلي · لا رفع للملفات
          </motion.div>

          <h1 id="hero-title" className="hero-title max-w-[800px]">
            <span className="title-mask">
              <motion.span className="block" initial={{ y: "110%", rotate: 2 }} animate={{ y: 0, rotate: 0 }} transition={{ duration: .9, delay: .08, ease: [0.22, 1, 0.36, 1] }}>بدّل صور PDF.</motion.span>
            </span>
            <span className="title-mask text-[var(--muted)]">
              <motion.span className="block" initial={{ y: "110%", rotate: -2 }} animate={{ y: 0, rotate: 0 }} transition={{ duration: .9, delay: .18, ease: [0.22, 1, 0.36, 1] }}>في مكانها تماماً.</motion.span>
            </span>
          </h1>

          <motion.p initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .48, duration: .7 }} className="mt-7 max-w-[570px] text-base font-light leading-8 text-[var(--muted)] sm:text-lg">
            اكتشف الصور داخل صفحاتك، انقر أي صورة، واختر بديلاً من معرض هاتفك. يحافظ المحرر على الإحداثيات والأبعاد والنص، ثم يحفظ نسخة PDF جديدة.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .6, duration: .7 }} className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={onImport} disabled={importing} className="primary-button group">
              <FilePlus2 size={19} />
              {importing ? "جارٍ تجهيز الملف…" : "استورد PDF للتحرير"}
              <ArrowLeft size={17} className="transition-transform group-hover:-translate-x-1" />
            </button>
            <button onClick={onSample} disabled={importing} className="secondary-button">
              <Sparkles size={17} />
              جرّب محرر الصور
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .85, duration: .8 }} className="mt-10 flex items-center gap-6 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)] sm:gap-9">
            <div><strong className="font-latin mb-1 block text-xl font-semibold text-[var(--ink)]">{documentCount.toLocaleString("ar")}</strong>ملفات في مكتبتك</div>
            <div className="h-8 w-px bg-[var(--line)]" />
            <div><strong className="font-latin mb-1 block text-xl font-semibold text-[var(--ink)]">{pageCount.toLocaleString("ar")}</strong>صفحة محلية</div>
            <div className="hidden h-8 w-px bg-[var(--line)] sm:block" />
            <div className="hidden sm:block"><strong className="font-latin mb-1 block text-xl font-semibold text-[var(--ink)]">100%</strong>خصوصية للملف</div>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ y: deviceY, scale: deviceScale, rotate: deviceRotate }}
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.15, delay: .2, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto hidden h-[650px] w-full max-w-[620px] origin-center items-center justify-center sm:flex lg:h-[720px]"
          aria-hidden="true"
        >
          <motion.div animate={reduceMotion ? undefined : { y: [0, -12, 0], rotate: [-8, -6, -8] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="floating-paper absolute right-[1%] top-[12%] h-[390px] w-[285px] rounded-[5px] border border-[var(--line)] bg-[var(--surface)] p-7 opacity-75">
            <div className="h-2 w-16 bg-[var(--accent)]" />
            <div className="mt-12 h-4 w-4/5 rounded-full bg-[var(--surface-soft)]" />
            <div className="mt-3 h-4 w-3/5 rounded-full bg-[var(--surface-soft)]" />
          </motion.div>

          <div className="device-shell relative h-[610px] w-[400px] overflow-hidden rounded-[42px] p-3 xl:h-[650px] xl:w-[430px]">
            <div className="flex h-full flex-col overflow-hidden rounded-[32px] bg-[var(--bg)]">
              <div className="flex h-16 items-center justify-between border-b border-[var(--line)] px-5">
                <div className="flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-[var(--ink)]" /><span className="text-xs font-semibold">دليل وثيقة</span></div>
                <div className="flex gap-1"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-soft)]"><Search size={13} /></span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-soft)]"><Bookmark size={13} /></span></div>
              </div>
              <div className="flex-1 overflow-hidden bg-[var(--reader)] p-5 pt-7">
                <motion.div animate={reduceMotion ? undefined : { y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="device-page relative mx-auto aspect-[.707] w-[90%] bg-white p-7 text-[#20221d]">
                  <div className="h-1.5 w-9 bg-[#c7ef55]" />
                  <p className="font-latin mt-5 text-[6px] font-semibold tracking-[.16em] text-[#7a7d72]">04 / SEARCH</p>
                  <h3 className="font-latin mt-3 text-[27px] font-semibold leading-[1.03] tracking-[-.05em]">Find the sentence,<br />not just the file.</h3>
                  <p className="font-latin mt-5 text-[8px] leading-[1.8] text-[#575b50]">Search reads the embedded text layer page by page and returns useful context around every match.</p>
                  <div className="mt-6 space-y-2">
                    {[92, 100, 96, 82, 98, 90, 64].map((width, index) => <div key={index} className="h-[3px] rounded-full bg-[#e6e7e1]" style={{ width: `${width}%` }} />)}
                  </div>
                  <div className="font-latin absolute bottom-5 left-7 right-7 flex justify-between text-[6px] text-[#888c80]"><span>LOCAL-FIRST / PRIVATE</span><span>04 / 08</span></div>
                </motion.div>
              </div>
              <div className="flex h-16 items-center justify-center gap-5 border-t border-[var(--line)] bg-[var(--surface)] px-5">
                <span className="h-8 w-8 rounded-full border border-[var(--line)]" />
                <span className="font-latin rounded-full bg-[var(--surface-soft)] px-4 py-2 text-[9px]">04 / 08</span>
                <span className="h-8 w-8 rounded-full bg-[var(--accent)]" />
              </div>
            </div>
          </div>

          <motion.div animate={reduceMotion ? undefined : { y: [0, 10, 0], rotate: [5, 3, 5] }} transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[13%] left-[1%] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--ink)]"><Bookmark size={16} /></span><div><div className="text-xs font-semibold">محفوظ للمراجعة</div><div className="mt-1 text-[10px] text-[var(--muted)]">إشارتك تبقى بعد إغلاق الملف</div></div></div>
          </motion.div>
        </motion.div>
      </div>

      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        onClick={() => document.getElementById("library")?.scrollIntoView({ behavior: "smooth" })}
        className="absolute bottom-5 right-1/2 z-10 flex translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-[11px] text-[var(--muted)] transition hover:text-[var(--ink)]"
      >
        <ArrowDown size={14} className="animate-bounce" /> اكتشف مكتبتك
      </motion.button>
    </section>
  );
}

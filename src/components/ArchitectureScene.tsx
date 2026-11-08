import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";
import { Boxes, Cpu, Layers3, MonitorSmartphone } from "lucide-react";

const layers = [
  { title: "Screens", arabic: "واجهة واضحة", detail: "Home · Reader · Modals", icon: MonitorSmartphone },
  { title: "Context", arabic: "حالة واحدة", detail: "Documents · Theme · Progress", icon: Layers3 },
  { title: "Services", arabic: "عمليات حقيقية", detail: "Picker · Search · Share", icon: Boxes },
  { title: "Android", arabic: "تنفيذ أصلي", detail: "Pdfium · PDFBox · FileProvider", icon: Cpu },
];

export function ArchitectureScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const lineScale = useTransform(scrollYProgress, [.22, .72], [0, 1]);
  const lineOpacity = useTransform(scrollYProgress, [.2, .35], [0, 1]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setCompact(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (reduceMotion) return <StaticArchitecture />;

  return (
    <section ref={sectionRef} className="relative h-[175vh] border-t border-[var(--line)] bg-[var(--bg-elevated)]">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden px-5 py-20">
        <div className="mx-auto w-full max-w-[1180px]">
          <div className="relative z-10 text-center">
            <div className="text-[11px] text-[var(--muted)]">البنية البرمجية · من التفاعل إلى التنفيذ</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-.05em] sm:text-5xl">أربع طبقات. مسار واحد واضح.</h2>
          </div>
          <div className="relative mx-auto mt-4 h-[590px] max-w-[1100px] sm:h-[600px]">
            <motion.div style={{ scaleY: lineScale, opacity: lineOpacity }} className="absolute bottom-[70px] left-1/2 top-[80px] w-px origin-top bg-[var(--line-strong)]" />
            {layers.map((layer, index) => <ArchitectureNode key={layer.title} layer={layer} index={index} progress={scrollYProgress} compact={compact} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function ArchitectureNode({ layer, index, progress, compact }: { layer: typeof layers[number]; index: number; progress: MotionValue<number>; compact: boolean }) {
  const horizontal = compact ? 95 : 355;
  const initialX = index % 2 === 0 ? -horizontal : horizontal;
  const initialY = index < 2 ? -125 : 135;
  const finalY = compact ? -220 + index * 140 : -205 + index * 137;
  const x = useTransform(progress, [.12, .66], [initialX, 0]);
  const y = useTransform(progress, [.12, .66], [initialY, finalY]);
  const rotate = useTransform(progress, [.12, .66], [index % 2 === 0 ? -5 : 5, 0]);
  const scale = useTransform(progress, [.12, .66], [.9, 1]);
  const Icon = layer.icon;
  return <motion.div style={{ x, y, rotate, scale }} className="absolute left-1/2 top-1/2 z-10 -ml-[110px] -mt-[48px] w-[220px] sm:-ml-[145px] sm:w-[290px]">
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)]"><Icon size={18} /></span><div dir="ltr" className="text-left"><div className="font-latin text-sm font-semibold">{layer.title}</div><div className="mt-1 text-[10px] text-[var(--muted)]">{layer.arabic}</div></div><span className="font-latin mr-auto text-[10px] text-[var(--muted)]">0{index + 1}</span></div>
      <div dir="ltr" className="font-latin mt-3 truncate text-left text-[9px] text-[var(--muted)]">{layer.detail}</div>
    </div>
  </motion.div>;
}

function StaticArchitecture() {
  return <section className="border-t border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-24"><div className="mx-auto max-w-5xl text-center"><h2 className="text-3xl font-semibold">أربع طبقات. مسار واحد واضح.</h2><div className="mt-10 grid gap-4 sm:grid-cols-2">{layers.map((layer) => <div key={layer.title} className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 text-right"><layer.icon size={20} /><h3 className="font-latin mt-4 text-left text-lg">{layer.title}</h3><p className="mt-2 text-xs text-[var(--muted)]">{layer.arabic} · {layer.detail}</p></div>)}</div></div></section>;
}

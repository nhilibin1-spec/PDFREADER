import { CheckCircle2, Download, FileText, Moon, Smartphone, Sun } from "lucide-react";
import { motion } from "framer-motion";
import type { ThemeMode } from "../types";
import type { InstallController } from "../pwa/useInstallPrompt";

interface HeaderProps {
  theme: ThemeMode;
  install: InstallController;
  onToggleTheme: () => void;
}

export function Header({ theme, install, onToggleTheme }: HeaderProps) {
  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleInstall = async () => {
    const outcome = await install.install();
    if (outcome === "manual") goTo("android-app");
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6"
    >
      <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elevated)_86%,transparent)] px-3 shadow-[0_8px_30px_rgba(30,35,20,.06)] backdrop-blur-xl sm:px-5">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3 rounded-full" aria-label="العودة إلى البداية">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--bg)]">
            <FileText size={19} strokeWidth={1.8} />
          </span>
          <span className="text-lg font-bold tracking-[-.04em]">وثيقة<span className="text-[var(--muted)]">.</span></span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="التنقل الرئيسي">
          <button onClick={() => goTo("library")} className="rounded-full px-3.5 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]">المكتبة</button>
          <button onClick={() => goTo("android-app")} className="rounded-full px-3.5 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]">تطبيق أندرويد</button>
          <button onClick={() => goTo("editor-guide")} className="rounded-full px-3.5 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]">كود المحرر</button>
          <button onClick={() => goTo("android-source")} className="hidden rounded-full px-3.5 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--ink)] lg:block">مشروع React Native</button>
        </nav>

        <div className="flex items-center gap-1">
          <button onClick={() => { void handleInstall(); }} className="secondary-button !mr-1 !min-h-10 !px-3 !py-2 !text-xs sm:!px-4">
            {install.installed ? <CheckCircle2 size={15} /> : install.canInstall ? <Download size={15} /> : <Smartphone size={15} />}
            <span className="hidden sm:inline">{install.installed ? "مثبّت" : install.canInstall ? "ثبّت التطبيق" : "تطبيق أندرويد"}</span>
          </button>
          <button onClick={onToggleTheme} className="icon-button border-[var(--line)] bg-[var(--surface)]" aria-label={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"} title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </motion.header>
  );
}

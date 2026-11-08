import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownToLine, Check, CheckCircle2, ChevronDown, Clipboard, CloudCog, Code2,
  Download, FileArchive, FileCode2, FolderDown, GitBranch, Globe2, Images,
  LoaderCircle, MonitorSmartphone, PackageCheck, ShieldCheck, Smartphone, Sparkles, TerminalSquare, WifiOff,
} from "lucide-react";
import type { InstallController } from "../pwa/useInstallPrompt";
import { androidWrapperFiles } from "../data/androidWrapper";
import { downloadAndroidWrapper, downloadTextFile } from "../lib/exportProject";
import { copyText } from "../lib/clipboard";

const prerequisites = [
  { label: "Node.js 22+", detail: "Capacitor 8" },
  { label: "JDK 21", detail: "إلزامي للبناء" },
  { label: "Android Studio Otter+", detail: "SDK 36" },
  { label: "Android 7+", detail: "minSdk 24" },
];

const localSteps = [
  { title: "ابنِ نسخة الويب", command: "npm install && npm run build" },
  { title: "أضف Capacitor والحزم", command: "npm install @capacitor/core @capacitor/filesystem @capacitor/share && npm install -D @capacitor/cli && npm install @capacitor/android" },
  { title: "أنشئ مشروع أندرويد", command: "npx cap add android" },
  { title: "فعّل الحفظ في Downloads", command: "node scripts/setup-android-saver.mjs" },
  { title: "زامن نسخة الويب", command: "npm run build && npx cap sync android" },
  { title: "افتح Android Studio", command: "npx cap open android" },
];

const apkSteps = [
  { title: "ابنِ APK للتجربة", command: "cd android && ./gradlew assembleDebug" },
  { title: "ثبّته عبر USB", command: "adb install -r android/app/build/outputs/apk/debug/app-debug.apk" },
  { title: "أو ابنِ AAB للنشر", command: "cd android && ./gradlew bundleRelease" },
];

const manualSteps = [
  "افتح رابط هذا التطبيق في Chrome على أندرويد.",
  "اضغط قائمة النقاط الثلاث ⋮ أعلى المتصفح.",
  "اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».",
  "أكّد التثبيت، ثم افتح «وثيقة» من أيقونتها على الشاشة الرئيسية.",
];

export function AndroidAppGuide({ install }: { install: InstallController }) {
  const [showManual, setShowManual] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [filesOpen, setFilesOpen] = useState(false);
  const [method, setMethod] = useState<"local" | "github">("local");

  const copy = async (value: string, id: string) => {
    await copyText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const installPwa = async () => {
    const result = await install.install();
    if (result === "manual") setShowManual(true);
  };

  const downloadBundle = async () => {
    setDownloading(true);
    try {
      await downloadAndroidWrapper();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section id="android-app" className="relative scroll-mt-20 overflow-hidden border-t border-[var(--line)] bg-[var(--bg)] px-4 py-24 sm:px-8 sm:py-32">
      <div className="hero-glow pointer-events-none absolute -left-[20vw] top-[10%] h-[55vw] max-h-[720px] w-[55vw] max-w-[720px] rounded-full opacity-60" />
      <div className="relative mx-auto max-w-[1320px]">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <motion.div initial={{ opacity: 0, y: 45 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} transition={{ duration: .75 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-[11px] text-[var(--muted)]"><Smartphone size={14} />نسخة أندرويد من محرر الصور</div>
            <h2 className="text-4xl font-semibold leading-[1.15] tracking-[-.06em] sm:text-6xl">من الويب إلى هاتفك.<br /><span className="text-[var(--muted)]">بمسارين واضحين.</span></h2>
            <p className="mt-6 max-w-xl text-sm font-light leading-8 text-[var(--muted)]">ثبّت نسخة PWA فوراً من Chrome دون APK، أو غلّف المحرر بـCapacitor وولّد ملف APK حقيقياً بتوقيعك. الأوامر وملفات الأندرويد جاهزة هنا، وكل معالجة PDF تبقى على الجهاز.</p>
            <div className="mt-7 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-2 text-[10px]"><Globe2 size={13} />PWA قابل للتثبيت</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-2 text-[10px]"><PackageCheck size={13} />APK عبر Capacitor 8</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-2 text-[10px]"><WifiOff size={13} />يعمل محلياً</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => { void installPwa(); }} className="primary-button">
                {install.installed ? <CheckCircle2 size={18} /> : <Download size={18} />}
                {install.installed ? "مثبّت بالفعل على جهازك" : install.canInstall ? "ثبّت التطبيق الآن" : "تثبيت عبر Chrome"}
              </button>
              <button onClick={() => { void downloadBundle(); }} disabled={downloading} className="secondary-button">
                {downloading ? <LoaderCircle size={17} className="spin" /> : <FileArchive size={17} />}
                {downloading ? "جارٍ تجهيز ZIP…" : "تنزيل ملفات أندرويد"}
              </button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[9px] text-[var(--muted)]"><ShieldCheck size={12} />التثبيت متاح عبر HTTPS أو localhost. المعاينة داخل إطار قد تمنع نافذة التثبيت؛ استخدم تعليمات Chrome بالأسفل.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 70, rotate: 3 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .9, ease: [0.22, 1, 0.36, 1] }} className="relative mx-auto w-full max-w-[400px]">
            <div className="absolute inset-x-12 bottom-2 h-16 rounded-[50%] bg-black/30 blur-2xl" />
            <div className="device-shell relative overflow-hidden rounded-[44px] border-[6px] border-[var(--ink)] bg-[var(--bg)] p-3 pt-8">
              <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-full bg-[var(--line-strong)]" />
              <div className="overflow-hidden rounded-[32px] border border-[var(--line)] bg-[var(--bg-elevated)]">
                <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 text-[8px] text-[var(--muted)]"><span className="font-latin">9:41</span><span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />وثيقة</span></div>
                <div className="p-4">
                  <div className="flex items-center justify-between"><div><div className="text-[8px] text-[var(--muted)]">محرر الصور</div><div className="mt-1 text-lg font-bold tracking-[-.04em]">دليل وثيقة</div></div><img src="icons/app-icon.png" alt="أيقونة تطبيق وثيقة" className="h-10 w-10 rounded-xl shadow-sm" /></div>
                  <div className="relative mt-5 min-h-[220px] rounded-2xl bg-[var(--reader)] p-4">
                    <div className="mx-auto h-[200px] w-[76%] rotate-[-2deg] bg-white p-4 shadow-[0_12px_25px_rgba(0,0,0,.18)]">
                      <div className="h-1 w-7 bg-[var(--accent)]" /><div className="mt-3 h-2 w-4/5 rounded bg-[#2b2d27]" /><div className="mt-2 h-1 w-3/5 rounded bg-[#d9dbd3]" />
                      <div className="relative mt-5 h-20 overflow-hidden rounded-md border-2 border-[var(--accent)] bg-[linear-gradient(135deg,#28331d,#111)]"><span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[7px] font-bold text-[var(--accent-ink)]">✓</span><Images size={18} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40" /></div>
                      <div className="mt-4 space-y-1.5"><div className="h-1 w-full rounded bg-[#e8e9e3]" /><div className="h-1 w-5/6 rounded bg-[#e8e9e3]" /><div className="h-1 w-2/3 rounded bg-[#e8e9e3]" /></div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2.5"><span className="text-[8px] font-medium">حفظ PDF جديد</span><span className="rounded-full bg-[var(--accent)] px-3 py-2 text-[7px] font-semibold text-[var(--accent-ink)]">في Downloads</span></div>
                </div>
                <div className="flex justify-around border-t border-[var(--line)] py-3 text-[7px] text-[var(--muted)]"><span className="text-[var(--ink)]">المكتبة</span><span>المحرر</span><span>الإشارات</span></div>
              </div>
            </div>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute -left-5 top-[23%] rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow)]">
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-soft)]"><Sparkles size={14} /></span><div><div className="text-[9px] font-semibold">جاهز للتثبيت</div><div className="mt-0.5 text-[7px] text-[var(--muted)]">بدون متجر إلزامي</div></div></div>
            </motion.div>
          </motion.div>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 35 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} className="relative overflow-hidden rounded-[30px] border border-[color-mix(in_srgb,var(--accent)_55%,var(--line))] bg-[var(--surface)] p-6 sm:p-8">
            <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full bg-[var(--accent)] opacity-20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between"><span className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-[9px] font-semibold text-[var(--accent-ink)]">الخيار الأسرع · لا يحتاج APK</span><Smartphone size={23} strokeWidth={1.4} /></div>
              <h3 className="mt-6 text-2xl font-semibold tracking-[-.04em]">ثبّت PWA الآن.</h3>
              <p className="mt-3 text-xs font-light leading-7 text-[var(--muted)]">نسخة كاملة الشاشة بأيقونة مستقلة، وتخزين محلي، وshell يعمل دون اتصال بعد أول فتح. لا حاجة لـAndroid Studio أو توقيع.</p>
              <div className="mt-6 space-y-2">
                {manualSteps.map((step, index) => <div key={step} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-3"><span className="font-latin flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[9px] font-semibold">{index + 1}</span><p className="text-[10px] leading-5 text-[var(--ink-soft)]">{step}</p></div>)}
              </div>
              <button onClick={() => { void installPwa(); }} className="primary-button mt-5 w-full !min-h-12 !py-3 !text-xs">{install.installed ? <PackageCheck size={17} /> : <Download size={17} />}{install.installed ? "التطبيق مثبّت على هذا الجهاز" : install.canInstall ? "افتح نافذة التثبيت" : "عرض تعليمات التثبيت"}</button>
              {showManual && !install.canInstall && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] p-3 text-[9px] leading-6 text-[var(--muted)]">لم تُطلق نافذة التثبيت هنا. افتح العنوان المنشور في Chrome على أندرويد، ثم استخدم ⋮ ← تثبيت التطبيق. إن كان الرابط داخل iframe فافتحه في نافذة مستقلة، لأن التثبيت قد يكون محجوباً داخل المعاينة.</motion.div>}
              <div className="mt-4 flex items-center gap-2 text-[9px] text-[var(--muted)]"><CheckCircle2 size={13} />يتطلب HTTPS · Chrome on Android · بعد التثبيت لا تحتاج إعادة تحميل كل مرة.</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 35 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ delay: .08 }} className="flex flex-col rounded-[30px] border border-[var(--line)] bg-[var(--ink)] p-6 text-[var(--bg)] sm:p-8">
            <div className="flex items-center justify-between"><span className="rounded-full border border-white/20 px-3 py-1.5 text-[9px] opacity-75">الخيار الكامل · APK</span><Code2 size={23} strokeWidth={1.4} /></div>
            <h3 className="mt-6 text-2xl font-semibold tracking-[-.04em]">غلّف المحرر بـCapacitor.</h3>
            <p className="mt-3 text-xs font-light leading-7 opacity-65">ملف APK حقيقي من كود React الحالي. يحتوي الدليل على إضافة MediaStore لحفظ PDF في Downloads، وworkflow يبني APK على GitHub دون تثبيت Android Studio محلياً.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">{prerequisites.map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="font-latin text-[10px] font-semibold">{item.label}</div><div className="mt-1 text-[8px] opacity-50">{item.detail}</div></div>)}</div>
            <div className="mt-auto pt-6"><button onClick={() => { void downloadBundle(); }} disabled={downloading} className="primary-button w-full !min-h-12 !py-3 !text-xs">{downloading ? <LoaderCircle size={16} className="spin" /> : <FolderDown size={17} />}{downloading ? "جارٍ تجهيز الملفات…" : "تنزيل حزمة أندرويد"}</button><p className="mt-2 text-center text-[8px] opacity-45">{androidWrapperFiles.length} ملفات · README · Plugin · GitHub Actions</p></div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} className="mt-8 overflow-hidden rounded-[30px] border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2"><TerminalSquare size={18} /><h3 className="text-sm font-semibold">أوامر بناء APK</h3></div>
            <div className="flex rounded-full bg-[var(--surface-soft)] p-1"><button onClick={() => setMethod("local")} className={`rounded-full px-3 py-2 text-[10px] ${method === "local" ? "bg-[var(--surface)] font-semibold shadow-sm" : "text-[var(--muted)]"}`}>على جهازك</button><button onClick={() => setMethod("github")} className={`rounded-full px-3 py-2 text-[10px] ${method === "github" ? "bg-[var(--surface)] font-semibold shadow-sm" : "text-[var(--muted)]"}`}>دون Android Studio</button></div>
          </div>
          {method === "local" ? (
            <div className="grid gap-0 md:grid-cols-2">
              <div className="p-4 sm:p-6">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-medium"><MonitorSmartphone size={14} />البناء المحلي</div>
                {localSteps.map((step, index) => <CommandRow key={step.title} index={index + 1} title={step.title} command={step.command} copied={copied === `l${index}`} onCopy={() => { void copy(step.command, `l${index}`); }} />)}
              </div>
              <div className="border-t border-[var(--line)] bg-[var(--bg-elevated)] p-4 sm:p-6 md:border-r md:border-t-0">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-medium"><PackageCheck size={14} />الناتج والتثبيت</div>
                {apkSteps.map((step, index) => <CommandRow key={step.title} index={index + 1} title={step.title} command={step.command} copied={copied === `a${index}`} onCopy={() => { void copy(step.command, `a${index}`); }} />)}
                <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3"><div className="flex items-center gap-2 text-[9px] font-medium"><FolderDown size={13} />مسار APK</div><code dir="ltr" className="font-latin mt-2 block break-all text-left text-[9px] text-[var(--muted)]">android/app/build/outputs/apk/debug/app-debug.apk</code></div>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[1fr_1fr]">
              <div><div className="mb-3 flex items-center gap-2 text-[10px] font-medium"><GitBranch size={14} />بناء سحابي مجاني على GitHub</div><div className="space-y-3">{[
                "ارفع كود المشروع إلى مستودع GitHub خاص أو عام.",
                "انسخ .github/workflows/build-apk.yml من حزمة أندرويد.",
                "شغّل Workflow باسم Build Android APK من تبويب Actions.",
                "بعد دقيقتين نزّل wathiqa-debug-apk من Artifacts.",
              ].map((text, index) => <div key={text} className="flex gap-3 rounded-2xl border border-[var(--line)] p-3"><span className="font-latin flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[9px]">{index + 1}</span><p className="text-[10px] leading-5 text-[var(--muted)]">{text}</p></div>)}</div></div>
              <div className="rounded-2xl bg-[#11130f] p-4"><div className="flex items-center gap-2 text-[9px] text-white/60"><CloudCog size={13} />GitHub Actions · ubuntu-latest</div><div className="font-latin mt-4 space-y-2 text-[9px] text-white/60"><p><span className="text-[#c7ef55]">Node 22</span> · npm ci</p><p><span className="text-[#c7ef55]">JDK 21</span> · setup-java</p><p><span className="text-[#c7ef55]">SDK 36</span> · setup-android</p><p><span className="text-[#c7ef55]">Capacitor 8</span> · add android</p><p><span className="text-[#c7ef55]">Gradle</span> · assembleDebug</p><p><span className="text-[#c7ef55]">Artifact</span> · app-debug.apk</p></div><button onClick={() => downloadTextFile(androidWrapperFiles.find((file) => file.path.endsWith("build-apk.yml"))?.content ?? "", "build-apk.yml")} className="secondary-button mt-5 w-full !min-h-10 !border-white/20 !bg-white/5 !py-2 !text-[10px] !text-white"><Download size={14} />تنزيل ملف Workflow</button></div>
            </div>
          )}
        </motion.div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: ArrowDownToLine, title: "كيف يثبت APK على الهاتف؟", text: "انقل app-debug.apk إلى الهاتف، افتحه، واسمح بتثبيت التطبيقات من هذا المصدر. هذا تحذير أندرويد طبيعي لأي ملف APK خارج المتجر." },
            { icon: Images, title: "ماذا يحدث للصور؟", text: "اختيار الصورة يفتح معرض أندرويد عبر منتقي النظام دون صلاحية تخزين واسعة. بعد المعالجة يُحفظ PDF في Download/Wathiqa على Android 10+." },
            { icon: ShieldCheck, title: "أين تُحفظ المستندات؟", text: "مكتبة WebView في IndexedDB محلياً. ليس هناك خادم أو رفع. إزالة التطبيق تحذف مكتبته، فاحفظ نسخ PDF المهمة خارج التطبيق." },
          ].map((card) => <div key={card.title} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><card.icon size={17} className="text-[var(--muted)]" /><h3 className="mt-4 text-xs font-semibold">{card.title}</h3><p className="mt-2 text-[10px] font-light leading-6 text-[var(--muted)]">{card.text}</p></div>)}
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--line)]">
          <button onClick={() => setFilesOpen(!filesOpen)} className="flex w-full items-center justify-between px-5 py-4 text-right"><span className="flex items-center gap-2 text-xs font-medium"><FileCode2 size={15} />ملفات حزمة أندرويد ({androidWrapperFiles.length})</span><ChevronDown size={16} className={`transition ${filesOpen ? "rotate-180" : ""}`} /></button>
          {filesOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-2 border-t border-[var(--line)] p-4 sm:grid-cols-2">{androidWrapperFiles.map((file) => <div key={file.path} className="flex items-center gap-2 rounded-xl bg-[var(--surface)] p-2.5"><PackageCheck size={14} className="shrink-0 text-[var(--muted)]" /><div className="min-w-0 flex-1"><div dir="ltr" className="font-latin truncate text-left text-[9px]">{file.path}</div><div className="mt-1 truncate text-[8px] text-[var(--muted)]">{file.description}</div></div><button onClick={() => downloadTextFile(file.content, file.path.split("/").pop() ?? file.path)} className="icon-button !h-8 !w-8" aria-label={`تنزيل ${file.path}`}><Download size={13} /></button></div>)}</motion.div>}
        </div>
      </div>
    </section>
  );
}

function CommandRow({ index, title, command, copied, onCopy }: { index: number; title: string; command: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center gap-2 text-[9px] text-[var(--muted)]"><span className="font-latin flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--surface-soft)] px-1 text-[8px]">{index}</span>{title}</div>
      <div className="flex items-center gap-1 rounded-xl bg-[#11130f] p-1 pl-3" dir="ltr"><code className="font-latin min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-left text-[9px] leading-7 text-[#eef1e6]">{command}</code><button onClick={onCopy} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20" aria-label="نسخ الأمر">{copied ? <Check size={13} /> : <Clipboard size={13} />}</button></div>
    </div>
  );
}

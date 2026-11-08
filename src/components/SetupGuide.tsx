import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Clipboard, Download, TerminalSquare } from "lucide-react";
import { downloadNativeProject } from "../lib/exportProject";
import { copyText } from "../lib/clipboard";

const steps = [
  { title: "جهّز أدوات أندرويد", body: "ثبّت Node.js LTS وJDK 17 وAndroid Studio. من Android Studio ثبّت Android SDK وPlatform وBuild-Tools، ثم أنشئ محاكياً أو فعّل تصحيح USB في هاتفك.", command: "node --version && java -version && adb version" },
  { title: "ثبّت اعتماديات المشروع", body: "فك ملف ZIP وافتح الطرفية داخل مجلد wathiqa-pdf-reader. لا تحتاج حساب Expo أو مفتاح API؛ كل القراءة والبحث يتمان على الجهاز.", command: "npm install" },
  { title: "راجع توافق حزم Expo", body: "يعرض هذا الأمر أي نسخة تحتاج مواءمة مع SDK 57. اتبع اقتراح expo install --fix إن ظهر، ثم أعد فحص TypeScript.", command: "npx expo install --check && npm run typecheck" },
  { title: "صِل جهازاً وابنِ Development Build", body: "المكتبات أصلية ولا تعمل في Expo Go. شغّل المحاكي أو صل الهاتف؛ الأمر يولد مجلد android ويبني التطبيق الخاص بك ويثبّته ويشغّل Metro.", command: "adb devices && npm run android" },
  { title: "استأنف التطوير بسرعة", body: "بعد أول بناء ناجح، شغّل Metro وافتح تطبيق Wathiqa PDF المثبت. عند تعديل الحزم الأصلية أعد npm run android بدلاً من الاكتفاء بتحديث JavaScript.", command: "npm start" },
  { title: "أنشئ APK للتجربة", body: "بعد توليد مجلد android يمكنك بناء حزمة debug محلياً. على Windows استخدم gradlew.bat. إصدار الإنتاج يحتاج مفتاح توقيع خاصاً ولا يجب رفعه إلى Git.", command: "cd android && ./gradlew assembleDebug" },
];

const troubleshooting = [
  { q: "لماذا لا يعمل داخل Expo Go؟", a: "لأن react-native-pdf وexpo-pdf-text-extract يحتويان على كود أصلي. نفّذ npm run android لبناء Development Build، ثم افتح تطبيق وثيقة نفسه بدلاً من Expo Go." },
  { q: "هل يفحص التطبيق كل ذاكرة الهاتف؟", a: "لا، وهذا مقصود لحماية الخصوصية. SAF يمنح وصولاً للملفات التي تختارها فقط، ثم تُنسخ إلى مساحة التطبيق وتظهر في المكتبة. لا حاجة لصلاحية تخزين واسعة." },
  { q: "لماذا لا يجد البحث كلاماً ظاهراً في الصفحة؟", a: "غالباً الصفحة صورة ممسوحة ضوئياً ولا تملك طبقة نص. استخراج PDFBox حقيقي لكنه ليس OCR. أضف OCR كمرحلة منفصلة إذا احتجت البحث في الصور." },
  { q: "ماذا يحدث عند حذف ملف؟", a: "تُحذف النسخة المحلية الخاصة بالتطبيق وبيانات الإشارات، ولا يُحذف الملف الأصلي من Downloads أو Google Drive. المشاركة تتم عبر FileProvider دون خادم." },
];

export function SetupGuide() {
  const [copied, setCopied] = useState<number | null>(null);
  const [openQuestion, setOpenQuestion] = useState(0);
  const copy = async (command: string, index: number) => {
    await copyText(command);
    setCopied(index); window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <section id="setup" className="scroll-mt-20 border-t border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1180px]">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} className="text-center">
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)]"><TerminalSquare size={20} /></div>
          <h2 className="text-4xl font-semibold tracking-[-.055em] sm:text-6xl">مشروع React Native: إلى هاتفك.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-light leading-8 text-[var(--muted)]">هذا الدليل لمشروع React Native المنفصل في قسم الكود. إذا أردت تغليف محرر الويب الحالي كتطبيق أندرويد فاستخدم مسار Capacitor في قسم <button onClick={() => document.getElementById("android-app")?.scrollIntoView({ behavior: "smooth" })} className="font-medium text-[var(--ink)] underline decoration-[var(--accent)] underline-offset-4">تطبيق أندرويد</button>.</p>
        </motion.div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-14">
          <div className="relative">
            <div className="absolute bottom-8 right-[22px] top-8 w-px bg-[var(--line)]" />
            {steps.map((step, index) => <motion.article key={step.title} initial={{ opacity: 0, x: 45 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .35 }} transition={{ duration: .55, delay: index * .04 }} className="relative mb-5 flex gap-5">
              <div className="font-latin z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-xs font-semibold">{String(index + 1).padStart(2, "0")}</div>
              <div className="min-w-0 flex-1 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
                <h3 className="text-base font-semibold tracking-[-.02em]">{step.title}</h3><p className="mt-3 text-xs font-light leading-7 text-[var(--muted)]">{step.body}</p>
                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[var(--ink)] p-2 pr-4 text-[var(--bg)]" dir="ltr"><code className="font-latin min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-left text-[11px]">{step.command}</code><button onClick={() => { void copy(step.command, index); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[var(--bg)] transition hover:bg-white/20" aria-label="نسخ الأمر">{copied === index ? <Check size={15} /> : <Clipboard size={15} />}</button></div>
              </div>
            </motion.article>)}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl bg-[var(--ink)] p-6 text-[var(--bg)]">
              <div className="text-[10px] opacity-60">جاهز للبدء؟</div><h3 className="mt-3 text-2xl font-semibold leading-9 tracking-[-.04em]">خذ الكود،<br />وابنِ نسختك.</h3><p className="mt-4 text-xs font-light leading-6 opacity-65">يشمل التنزيل 19 ملفاً وREADME عربياً وكل الاعتماديات المطلوبة.</p><button onClick={() => { void downloadNativeProject(); }} className="primary-button mt-6 w-full !min-h-12 !py-3 !text-xs"><Download size={16} />تنزيل المشروع ZIP</button>
            </div>
            <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <h3 className="mb-3 text-sm font-semibold">قبل التشغيل</h3>
              {["Node.js LTS وnpm", "JDK 17 وAndroid SDK", "محاكي أو هاتف بتصحيح USB", "Development build وليس Expo Go"].map((item) => <div key={item} className="flex items-center gap-2 border-t border-[var(--line)] py-3 text-[11px] text-[var(--muted)] first:border-0"><Check size={13} className="text-[var(--ink)]" />{item}</div>)}
            </div>
          </aside>
        </div>

        <div className="mt-20 grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <div><div className="text-[11px] text-[var(--muted)]">قبل أن تتعثر</div><h2 className="mt-4 text-3xl font-semibold leading-[1.35] tracking-[-.045em]">إجابات صريحة<br />للمشكلات الشائعة.</h2></div>
          <div className="border-t border-[var(--line)]">{troubleshooting.map((item, index) => <div key={item.q} className="border-b border-[var(--line)]"><button onClick={() => setOpenQuestion(openQuestion === index ? -1 : index)} className="flex w-full items-center justify-between gap-4 py-5 text-right"><span className="text-sm font-medium">{item.q}</span><ChevronDown size={17} className={`shrink-0 text-[var(--muted)] transition-transform duration-300 ${openQuestion === index ? "rotate-180" : ""}`} /></button><motion.div initial={false} animate={{ height: openQuestion === index ? "auto" : 0, opacity: openQuestion === index ? 1 : 0 }} className="overflow-hidden"><p className="pb-6 pl-8 text-xs font-light leading-7 text-[var(--muted)]">{item.a}</p></motion.div></div>)}</div>
        </div>
      </div>
    </section>
  );
}

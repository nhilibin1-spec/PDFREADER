export interface AndroidWrapperFile {
  path: string;
  language: string;
  description: string;
  content: string;
}

const readme = `# تغليف وثيقة كتطبيق أندرويد

هذه الحزمة تحوّل نسخة React/Web الحالية من «وثيقة» إلى تطبيق أندرويد أصلي عبر Capacitor 8.
كل عمليات PDF تتم داخل WebView على الهاتف؛ لا يوجد خادم ولا رفع للمستندات.

## المسار الأسرع: PWA

1. انشر المشروع على HTTPS مثل Vercel أو Netlify أو صفحة GitHub.
2. افتح الرابط في Chrome على أندرويد.
3. من قائمة Chrome ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».
4. افتح «وثيقة» من أيقونتها؛ ستعمل بواجهة مستقلة وتُخزّن الملفات محلياً.

ملفات PWA موجودة في public: manifest.webmanifest وsw.js والأيقونات. لا تفتح dist/index.html عبر file:// لأن التثبيت والعامل المؤقت يحتاجان HTTPS أو localhost.

## المسار الكامل: APK وAndroid Studio

### المتطلبات الدقيقة لـ Capacitor 8

- Node.js 22 أو أحدث.
- JDK 21 (وليس 17) لبناء @capacitor/android 8.
- Android Studio Otter 2025.2.1 أو أحدث.
- Android SDK Platform 36 وBuild Tools متوافقة.
- هاتف Android 7.0+ أو محاكٍ.

### 1. جهّز المشروع

    npm install
    npm run build

تأكد أن مجلد dist يحتوي index.html قبل المتابعة. ملف capacitor.config.ts يستخدم webDir: "dist".

### 2. أضف Capacitor

    npm install @capacitor/core
    npm install @capacitor/filesystem @capacitor/share
    npm install -D @capacitor/cli
    npm install @capacitor/android

### 3. أنشئ مشروع أندرويد وأضف حفظ PDF في Downloads

    npx cap add android
    node scripts/setup-android-saver.mjs
    npm run build
    npx cap sync android

السكربت ينسخ WathiqaSaverPlugin.java إلى حزمة التطبيق ويحدّث MainActivity لتسجيله.
الإضافة تستخدم MediaStore.Downloads على Android 10+، فلا تحتاج MANAGE_EXTERNAL_STORAGE.
على Android 9 وأقدم يعود التطبيق تلقائياً إلى ورقة المشاركة في النظام.

### 4. ابنِ وثبّت APK

الطريقة الرسومية:

    npx cap open android

اختر جهازاً أو محاكياً ثم اضغط Run ▶.

الطريقة الطرفية:

    cd android
    chmod +x gradlew
    ./gradlew assembleDebug

على Windows:

    cd android
    gradlew.bat assembleDebug

الملف الناتج:

    android/app/build/outputs/apk/debug/app-debug.apk

ثبّته على الهاتف عبر USB:

    adb install -r android/app/build/outputs/apk/debug/app-debug.apk

أو انسخ APK إلى الهاتف من Google Drive أو USB، ثم افتحه واسمح بتثبيت التطبيقات من هذا المصدر.

### 5. بعد أي تعديل ويب

    npm run build
    npx cap sync android

ثم أعد البناء أو شغّل Live Reload من Android Studio.

## البناء على GitHub دون Android Studio

انسخ .github/workflows/build-apk.yml إلى مستودع GitHub. من تبويب Actions شغّل Build Android APK.
بعد نجاح المهمة نزّل app-debug.apk من قسم Artifacts. الـworkflow يثبت JDK 21 وSDK ويبني الملف على خادم GitHub.

## إصدار Play Store

1. أنشئ مفتاح توقيع عبر Android Studio: Build > Generate Signed Bundle / APK.
2. اختر Android App Bundle (AAB).
3. احفظ ملف keystore وكلمات المرور خارج Git.
4. أضف signingConfig إلى android/app/build.gradle أو استخدم نافذة التوقيع.
5. ابنِ bundleRelease وارفع AAB إلى Google Play Console.

لا تستخدم مفتاح debug للنشر. لا ترفع keystore أو كلمات المرور إلى GitHub.

## الصور والملفات داخل تطبيق أندرويد

- زر اختيار صورة يستخدم input type=file الذي يفتح معرض أندرويد أو منتقي الملفات.
- لا يحتاج اختيار صورة إلى READ_MEDIA_IMAGES أو صلاحية تخزين واسعة.
- PDFs والصور المستوردة تُخزّن في IndexedDB داخل WebView. حذف التطبيق يحذف هذه المكتبة، فصدّر الملفات المهمة.
- الملف الناتج يُحفظ في Download/Wathiqa على Android 10+. على الإصدارات الأقدم تظهر ورقة مشاركة لحفظه.
- Capacitor لا يمنح WebView وصولاً حراً إلى كل ملفات الهاتف؛ الاختيار يمر عبر منتقي النظام.

## حل المشكلات

**شاشة بيضاء:** نفّذ npm run build ثم npx cap sync android. تحقق من webDir في capacitor.config.ts.

**invalid source release: 21:** Gradle يعمل على JDK 17. اضبط Gradle JDK على 21 في Android Studio.

**SDK 36 غير موجود:** ثبّته من SDK Manager ثم أعد المزامنة.

**الصورة المختارة لا تظهر:** أعد بناء التطبيق بعد نسخ الحزم الأصلية. المنتقي هو واجهة WebView أصلية في Capacitor.

**الرابط لا يعمل داخل التطبيق:** في الوضع المحلي كل الملفات في dist. لا تعتمد على localhost:5173 في APK النهائي.

**تثبيت APK محجوب:** اسمح «تثبيت تطبيقات غير معروفة» لتطبيق الملفات أو المتصفح الذي تفتح منه APK. هذا سلوك أندرويد طبيعي، وليس خطأً في التطبيق.

**ملفات PDF كبيرة:** WebView على الهاتف قد يواجه قيود ذاكرة أقل من سطح المكتب. اختبر أكبر مستند متوقع قبل النشر.

## ملاحظة قانونية

استبدال صورة PDF هنا بصري: يحافظ على بقية الصفحة، لكنه لا يحذف بيانات الصورة الأصلية من بنية الملف ولا يُعد محواً أمنياً. لا تستخدمه لإخفاء معلومات حساسة بغرض قانوني.
`;

const capacitorConfig = `import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.wathiqa.editor",
  appName: "وثيقة",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
`;

const saverScript = `// Adds a native MediaStore saver after "npx cap add android".
// Usage: node scripts/setup-android-saver.mjs
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "capacitor.config.ts");
if (!fs.existsSync(configPath)) {
  throw new Error("capacitor.config.ts is missing. Copy it to the project root first.");
}

const config = fs.readFileSync(configPath, "utf8");
const appId = (config.match(/appId\\s*:\\s*["']([^"']+)["']/) || [null, "com.wathiqa.editor"])[1];
const packageDir = path.join(root, "android", "app", "src", "main", "java", ...appId.split("."));
if (!fs.existsSync(packageDir)) {
  throw new Error("Android package not found. Run npx cap add android first.");
}

const templatePath = path.join(root, "android-setup", "native", "WathiqaSaverPlugin.java");
const pluginTemplate = fs.readFileSync(templatePath, "utf8");
fs.writeFileSync(
  path.join(packageDir, "WathiqaSaverPlugin.java"),
  pluginTemplate.replace("package com.wathiqa.editor;", "package " + appId + ";"),
);

const mainSource = [
  "package " + appId + ";",
  "",
  "import android.os.Bundle;",
  "import com.getcapacitor.BridgeActivity;",
  "",
  "public class MainActivity extends BridgeActivity {",
  "    @Override",
  "    public void onCreate(Bundle savedInstanceState) {",
  "        registerPlugin(WathiqaSaverPlugin.class);",
  "        super.onCreate(savedInstanceState);",
  "    }",
  "}",
  "",
].join("\\n");
fs.writeFileSync(path.join(packageDir, "MainActivity.java"), mainSource);
console.log("WathiqaSaver registered in " + appId + ". Run npx cap sync android next.");
`;

const saverPlugin = `package com.wathiqa.editor;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

@CapacitorPlugin(name = "WathiqaSaver")
public class WathiqaSaverPlugin extends Plugin {

    @PluginMethod
    public void savePdf(PluginCall call) {
        String base64 = call.getString("base64");
        String fileName = call.getString("fileName", "wathiqa.pdf");
        if (base64 == null || base64.isEmpty()) {
            call.reject("PDF data is required");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("UNSUPPORTED_ANDROID_VERSION");
            return;
        }

        fileName = fileName.replace("/", "-").replace(":", "-");
        if (!fileName.toLowerCase().endsWith(".pdf")) {
            fileName = fileName + ".pdf";
        }

        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
        values.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Wathiqa");
        values.put(MediaStore.Downloads.IS_PENDING, 1);

        Uri uri = null;
        try {
            Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            uri = getContext().getContentResolver().insert(collection, values);
            if (uri == null) {
                call.reject("Could not create the download entry");
                return;
            }
            try (OutputStream output = getContext().getContentResolver().openOutputStream(uri)) {
                if (output == null) {
                    call.reject("Could not open the output stream");
                    return;
                }
                output.write(Base64.decode(base64, Base64.DEFAULT));
                output.flush();
            }
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            getContext().getContentResolver().update(uri, values, null, null);

            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            result.put("folder", "Download/Wathiqa");
            call.resolve(result);
        } catch (Exception error) {
            if (uri != null) {
                try {
                    getContext().getContentResolver().delete(uri, null, null);
                } catch (Exception ignored) {
                    // Best-effort cleanup of a pending MediaStore row.
                }
            }
            call.reject("Unable to save the PDF", error);
        }
    }
}
`;

const workflow = `name: Build Android APK

on:
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"

      - name: Android SDK
        uses: android-actions/setup-android@v3

      - name: Install web dependencies
        run: npm ci

      - name: Add Capacitor Android
        run: |
          npm install @capacitor/core@8 @capacitor/filesystem@8 @capacitor/share@8
          npm install -D @capacitor/cli@8
          npm install @capacitor/android@8

      - name: Generate native project
        run: npx cap add android

      - name: Register PDF saver
        run: node scripts/setup-android-saver.mjs

      - name: Build web bundle
        run: npm run build

      - name: Sync native assets
        run: npx cap sync android

      - name: Build installable debug APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: wathiqa-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
`;

const packageAdditions = `{
  "scripts": {
    "android:sync": "npm run build && npx cap sync android",
    "android:open": "npx cap open android",
    "android:apk": "npm run build && npx cap sync android && cd android && ./gradlew assembleDebug"
  },
  "dependencies": {
    "@capacitor/core": "^8.6.0",
    "@capacitor/filesystem": "^8.1.5",
    "@capacitor/share": "^8.0.3"
  },
  "devDependencies": {
    "@capacitor/android": "^8.6.0",
    "@capacitor/cli": "^8.6.0"
  }
}
`;

const gitignore = `node_modules/
dist/
android/.gradle/
android/app/build/
android/local.properties
.env
*.jks
*.keystore
`;

export const androidWrapperFiles: AndroidWrapperFile[] = [
  { path: "README.md", language: "markdown", description: "خطوات PWA وAPK والتوقيع وحفظ الملفات.", content: readme },
  { path: "capacitor.config.ts", language: "typescript", description: "معرّف التطبيق ومجلد الويب وإعدادات أندرويد.", content: capacitorConfig },
  { path: "scripts/setup-android-saver.mjs", language: "javascript", description: "تنسخ Plugin الحفظ وتسجله في MainActivity.", content: saverScript },
  { path: "android-setup/native/WathiqaSaverPlugin.java", language: "java", description: "حفظ PDF في Downloads عبر MediaStore.", content: saverPlugin },
  { path: ".github/workflows/build-apk.yml", language: "yaml", description: "بناء APK على GitHub وإتاحته كـArtifact.", content: workflow },
  { path: "package-additions.json", language: "json", description: "الحزم والأوامر المطلوبة للدمج مع package.json.", content: packageAdditions },
  { path: ".gitignore", language: "gitignore", description: "استبعاد البناء ومفاتيح التوقيع من Git.", content: gitignore },
];

export const androidWrapperName = "wathiqa-android-setup";

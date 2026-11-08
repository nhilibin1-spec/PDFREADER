import type { PDFImage } from "pdf-lib";

export interface SamplePage {
  chapter: string;
  title: string;
  intro: string;
  paragraphs: string[];
  points: string[];
}

// Authored, searchable content for the optional demo document. No network request is made.
const samplePages: SamplePage[] = [
  {
    chapter: "01 / WELCOME",
    title: "A quieter way to read.",
    intro: "Wathiqa is a local-first PDF reader designed around the document, not around distractions.",
    paragraphs: [
      "This eight-page field guide is generated on your device as a real PDF. Open it, zoom into a page, switch the reading direction, and try the text search with words such as privacy, search, or bookmark.",
      "Your imported documents stay in this browser's IndexedDB storage. Reading positions, bookmarks, sort preferences, zoom, and theme are restored after a reload.",
    ],
    points: ["Real PDF rendering with PDF.js", "Offline document storage", "No account and no document upload"],
  },
  {
    chapter: "02 / LIBRARY",
    title: "Everything has its place.",
    intro: "A useful library should make the next document obvious without making the collection feel crowded.",
    paragraphs: [
      "Import one or several PDF files with the floating add button. Each file is validated, rendered to produce its own cover thumbnail, and saved with its actual byte size, page count, import date, and reading progress.",
      "Search filters file names instantly. Sort by recent reading, name, size, or date added. Grid and list layouts share exactly the same records, so a favorite or a new bookmark appears consistently in both views.",
    ],
    points: ["Multi-file import", "Four useful sort orders", "Grid and compact list layouts"],
  },
  {
    chapter: "03 / READER",
    title: "The page is the interface.",
    intro: "The reader keeps tools close while giving the page the visual priority it deserves.",
    paragraphs: [
      "Move continuously through pages vertically, or switch to a horizontal page-by-page flow with scroll snapping. Zoom from fifty to three hundred percent, return to fit width, or jump directly to a page number.",
      "Only pages near the viewport are rendered at full resolution. This lazy-rendering approach keeps large documents responsive instead of allocating a high-resolution canvas for every page at once.",
    ],
    points: ["Continuous vertical reading", "Snapping horizontal reading", "Lazy high-DPI page rendering"],
  },
  {
    chapter: "04 / SEARCH",
    title: "Find the sentence, not just the file.",
    intro: "Search reads the embedded text layer page by page and returns useful context around every match.",
    paragraphs: [
      "Queries are case-insensitive. Arabic diacritics are removed and common Arabic letter variants are normalized, while repeated whitespace is collapsed. The original document text is preserved in each result snippet.",
      "Move through matches with next and previous controls. Selecting a result navigates to its source page. Scanned image-only PDFs do not contain an embedded text layer and therefore require OCR before text search can work.",
    ],
    points: ["Up to 500 contextual matches", "Arabic text normalization", "Honest scanned-document limitation"],
  },
  {
    chapter: "05 / BOOKMARKS",
    title: "Keep your place and your ideas.",
    intro: "A bookmark is more than a page number: a short label explains why that page matters.",
    paragraphs: [
      "Add the current page from the reader toolbar. Give it a descriptive label, jump back to it from the bookmarks drawer, or remove it when it is no longer needed. A second bookmark on the same page is allowed when it records a different idea.",
      "Bookmarks belong to their document and are saved with its metadata. They remain available after closing the reader and reloading the application.",
    ],
    points: ["Custom bookmark labels", "Multiple notes per page", "Persistent per-document collection"],
  },
  {
    chapter: "06 / PRIVACY",
    title: "Local means local.",
    intro: "A document reader should not require a remote account merely to open a file already on your device.",
    paragraphs: [
      "Wathiqa performs import, thumbnails, rendering, text extraction, search, and sample generation locally. There is no analytics request and no remote PDF service in the reading workflow.",
      "Sharing uses the operating system share sheet when file sharing is supported. If the browser cannot share files directly, the app clearly offers a downloaded copy instead of claiming that a share occurred.",
    ],
    points: ["No document upload", "System share sheet when available", "Explicit download fallback"],
  },
  {
    chapter: "07 / SHORTCUTS",
    title: "Less reaching for the toolbar.",
    intro: "Keyboard controls make long reading sessions faster on desktop while touch controls remain primary on mobile.",
    paragraphs: [
      "Use Control or Command plus F to focus document search. Use B to bookmark the current page, plus and minus to change zoom, and the left or right arrow keys to move between pages. Escape closes an open drawer or leaves the reader.",
      "Buttons have accessible labels, visible focus states, and disabled states at zoom limits. Reduced-motion preferences disable decorative and scroll-driven motion without hiding content.",
    ],
    points: ["Ctrl/Cmd + F: search", "B: bookmark current page", "Arrows and plus/minus: navigate and zoom"],
  },
  {
    chapter: "08 / ANDROID",
    title: "One workflow, a native delivery.",
    intro: "The included React Native project mirrors the complete product workflow with Android-native file access and PDF rendering.",
    paragraphs: [
      "The source explorer includes screens, reusable components, theme and library contexts, file import, persistent metadata, local text extraction, bookmarks, sharing, and deletion. Download the ZIP to inspect or run the complete project.",
      "The Android app uses react-native-pdf for rendering, the document picker for Storage Access Framework imports, AsyncStorage for library metadata, and a native PDF text extractor for on-device search. It requires a development build rather than Expo Go.",
    ],
    points: ["Typed React Native screens and services", "Native Android file and share intents", "Step-by-step setup and troubleshooting guide"],
  },
];

function wrapText(text: string, font: { widthOfTextAtSize: (value: string, size: number) => number }, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function createArtwork(index: number): Promise<Uint8Array> {
  const canvas = window.document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 400;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  const palettes = [["#c7ef55", "#27331c"], ["#ff8f70", "#34211f"], ["#8db7ff", "#18253a"], ["#e5b8ff", "#2d2038"]];
  const [accent, ink] = palettes[index % palettes.length]!;
  const gradient = context.createLinearGradient(0, 0, 720, 400);
  gradient.addColorStop(0, ink);
  gradient.addColorStop(1, "#11130f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 720, 400);
  context.fillStyle = accent;
  context.beginPath();
  context.arc(540 - index * 35, 170, 125, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = .28;
  context.fillRect(70 + index * 24, 70, 160, 260);
  context.globalAlpha = 1;
  context.fillStyle = "#ffffff";
  context.font = "600 34px sans-serif";
  context.fillText(`WATHIQA / 0${index + 1}`, 55, 350);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Artwork encoding failed")), "image/jpeg", .9));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function createSamplePdf(): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const document = await PDFDocument.create();
  document.setTitle("Wathiqa — Interactive PDF Reader Field Guide");
  document.setAuthor("Wathiqa");
  document.setSubject("A searchable eight-page guide to the PDF reader");
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.1, 0.09);
  const muted = rgb(0.38, 0.4, 0.36);
  const accent = rgb(0.76, 0.9, 0.29);
  const artworkImages: PDFImage[] = [];
  for (let index = 0; index < 4; index += 1) artworkImages.push(await document.embedJpg(await createArtwork(index)));

  samplePages.forEach((content, index) => {
    const page = document.addPage([595.28, 841.89]);
    page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: rgb(0.975, 0.972, 0.95) });
    page.drawImage(artworkImages[index % artworkImages.length]!, { x: 397, y: 704, width: 154, height: 86 });
    page.drawRectangle({ x: 44, y: 756, width: 40, height: 7, color: accent });
    page.drawText("WATHIQA / PDF READER", { x: 44, y: 789, size: 9, font: bold, color: muted });
    page.drawText(content.chapter, { x: 44, y: 716, size: 10, font: bold, color: muted });
    const titleLines = wrapText(content.title, bold, 35, 470);
    titleLines.forEach((line, lineIndex) => page.drawText(line, { x: 44, y: 665 - lineIndex * 43, size: 35, font: bold, color: ink }));
    let cursorY = 665 - titleLines.length * 43 - 10;
    wrapText(content.intro, regular, 16, 450).forEach((line) => {
      page.drawText(line, { x: 44, y: cursorY, size: 16, font: regular, color: ink });
      cursorY -= 24;
    });
    cursorY -= 30;
    content.paragraphs.forEach((paragraph) => {
      wrapText(paragraph, regular, 11.5, 470).forEach((line) => {
        page.drawText(line, { x: 44, y: cursorY, size: 11.5, font: regular, color: muted });
        cursorY -= 18;
      });
      cursorY -= 22;
    });
    page.drawLine({ start: { x: 44, y: cursorY + 6 }, end: { x: 551, y: cursorY + 6 }, thickness: 0.7, color: rgb(0.82, 0.82, 0.78) });
    cursorY -= 28;
    content.points.forEach((point) => {
      page.drawCircle({ x: 49, y: cursorY + 4, size: 3, color: accent });
      page.drawText(point, { x: 62, y: cursorY, size: 11, font: bold, color: ink });
      cursorY -= 25;
    });
    page.drawText("LOCAL-FIRST / GENERATED ON DEVICE", { x: 44, y: 35, size: 8, font: regular, color: muted });
    page.drawText(`${String(index + 1).padStart(2, "0")}  /  08`, { x: 492, y: 35, size: 9, font: bold, color: ink });
  });

  const bytes = await document.save();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "application/pdf" });
}

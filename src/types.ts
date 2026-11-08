export type ThemeMode = "light" | "dark";
export type SortKey = "recent" | "name" | "size" | "added";
export type LibraryFilter = "all" | "reading" | "favorites" | "bookmarked";
export type ViewMode = "grid" | "list";
export type ScrollDirection = "vertical" | "horizontal";

export interface PdfBookmark {
  id: string;
  page: number;
  label: string;
  createdAt: number;
}

export interface PdfRecord {
  id: string;
  name: string;
  size: number;
  addedAt: number;
  lastOpenedAt: number | null;
  lastPage: number;
  totalPages: number;
  favorite: boolean;
  bookmarks: PdfBookmark[];
  thumbnail: string | null;
}

export interface StoredPdf extends PdfRecord {
  blob: Blob;
}

export interface AppSettings {
  theme: ThemeMode;
  sortKey: SortKey;
  viewMode: ViewMode;
  direction: ScrollDirection;
  zoom: number;
}

export interface SearchMatch {
  id: string;
  page: number;
  snippet: string;
  matchIndex: number;
}

export interface ToastMessage {
  id: number;
  title: string;
  detail?: string;
  tone?: "default" | "success" | "danger";
}

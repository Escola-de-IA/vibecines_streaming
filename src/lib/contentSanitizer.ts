import { M3UItem } from "@/lib/m3u-parser";

const ADULT_KEYWORDS = [
  "porn",
  "porno",
  "pornô",
  "xxx",
  "sex",
  "sexo",
  "adult",
  "adulto",
  "erótico",
  "erotico",
  "18+",
  "hentai",
  "onlyfans",
  "camgirl",
];

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(hd|fullhd|1080p|720p|bluray|x264|x265)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isAdult(item: M3UItem): boolean {
  const title = normalizeText(item.title || "");
  const category = normalizeText(item.category || "");

  return ADULT_KEYWORDS.some(
    (kw) => title.includes(kw) || category.includes(kw)
  );
}

function is4K(title: string) {
  return title.toLowerCase().includes("4k");
}

export function sanitizeContent(items: M3UItem[]): M3UItem[] {
  const map = new Map<string, M3UItem>();

  for (const item of items) {
    if (!item.title || !item.url) continue;

    if (isAdult(item)) continue;

    const baseName = normalizeText(item.title);
    const existing = map.get(baseName);

    if (!existing) {
      map.set(baseName, item);
      continue;
    }

    const existingIs4K = is4K(existing.title);
    const currentIs4K = is4K(item.title);

    if (currentIs4K && !existingIs4K) {
      map.set(baseName, item);
    }
  }

  return Array.from(map.values());
}

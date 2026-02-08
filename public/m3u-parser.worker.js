importScripts("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");

/**
 * CONFIGURAÇÕES DE ESCALA
 */
const DEFAULT_BATCH_SIZE = 500;
const LARGE_SCALE_BATCH_SIZE = 300;
const BATCH_DELAY = 5;
const MAX_ITEMS_PER_RUN = 1_500_000;

/**
 * UTILIDADES
 */
const ADULT_REGEX = /(adult|porno|xxx|sex|18\+)/i;
const SERIES_PATTERNS = [
  /\s+[Ss]\d{1,2}[Ee]\d{1,2}/,
  /\s+\d{1,2}[xX]\d{1,2}/,
  /temporada\s*\d+/i,
  /season\s*\d+/i,
];

function isAdultContent(title, category) {
  return ADULT_REGEX.test(title) || ADULT_REGEX.test(category);
}

function normalizeTitle(title) {
  return title.replace(/\s*\(?4k\)?/i, "").trim().toLowerCase();
}

function detectSeries(title) {
  return SERIES_PATTERNS.some((p) => p.test(title));
}

/**
 * PARSER STREAM-LIKE (ANTI MEMORY LEAK)
 */
async function parseM3UStream(text, defaultSource, largeScale) {
  const lines = text.split(/\r?\n/);
  const totalLines = lines.length;

  let current = {};
  let processed = 0;
  let itemsFound = 0;

  const seenMovies = new Map();
  let batch = [];

  const BATCH_SIZE = largeScale
    ? LARGE_SCALE_BATCH_SIZE
    : DEFAULT_BATCH_SIZE;

  postMessage({
    status: "progress",
    message: `🔍 Analisando ${totalLines.toLocaleString()} linhas...`,
    progress: 0,
    total: totalLines,
  });

  for (let i = 0; i < totalLines; i++) {
    const line = lines[i];
    processed++;

    if (processed % 500 === 0) {
      postMessage({
        status: "progress",
        message: `Processando… ${itemsFound.toLocaleString()} itens`,
        progress: processed,
        total: totalLines,
      });
    }

    if (line.startsWith("#EXTINF:")) {
      const title = line.split(/,(.+)/)[1]?.trim() || "Sem título";
      const image = line.match(/tvg-logo="([^"]*)"/)?.[1] || "";
      const category =
        line.match(/group-title="([^"]*)"/)?.[1] || "Sem Categoria";

      const isSeries = detectSeries(title);
      const source = isSeries ? "series" : defaultSource;

      current = { title, image, category, source };
      continue;
    }

    if (!line || line.startsWith("#")) continue;

    current.url = line.trim();
    current.id = `${current.title}::${current.url}`;

    if (isAdultContent(current.title, current.category)) {
      current = {};
      continue;
    }

    if (itemsFound >= MAX_ITEMS_PER_RUN) break;

    if (current.source === "series") {
      batch.push(current);
      itemsFound++;
    } else {
      const key = normalizeTitle(current.title);
      if (!seenMovies.has(key) || /4k/i.test(current.title)) {
        seenMovies.set(key, true);
        batch.push(current);
        itemsFound++;
      }
    }

    current = {};

    if (batch.length >= BATCH_SIZE) {
      postMessage({
        status: "batch",
        items: batch,
        progress: processed,
        total: totalLines,
      });
      batch = [];
      await new Promise((r) => setTimeout(r, BATCH_DELAY));
    }
  }

  if (batch.length) {
    postMessage({
      status: "batch",
      items: batch,
      progress: totalLines,
      total: totalLines,
    });
  }

  postMessage({
    status: "done",
    totalItems: itemsFound,
    message: `✅ Processamento finalizado: ${itemsFound.toLocaleString()} itens`,
  });
}

/**
 * PROCESSADOR PRINCIPAL
 */
async function processFile(file, type, largeScale) {
  try {
    postMessage({
      status: "progress",
      message: `📂 Carregando ${file.name}...`,
      progress: 0,
    });

    let text = "";

    if (file.name.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(file);
      const m3u = Object.values(zip.files).find(
        (f) => !f.dir && f.name.match(/\.m3u8?$/i)
      );
      if (!m3u) throw new Error("ZIP sem arquivo M3U");

      postMessage({
        status: "progress",
        message: `📄 Extraindo ${m3u.name}...`,
        progress: 20,
      });

      text = await m3u.async("string");
    } else {
      text = await file.text();
    }

    postMessage({
      status: "progress",
      message: `📊 Arquivo carregado (${(
        text.length /
        (1024 * 1024)
      ).toFixed(2)} MB)`,
      progress: 40,
    });

    await parseM3UStream(text, type, largeScale);
  } catch (err) {
    postMessage({
      status: "error",
      message: err?.message || "Erro inesperado no processamento",
    });
  }
}

/**
 * LISTENER
 */
self.onmessage = async (e) => {
  const { file, type, largeScale } = e.data;
  await processFile(file, type, largeScale);
};

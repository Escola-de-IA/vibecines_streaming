export interface M3UItem {
  id: string;
  title: string;
  image: string;
  category: string;
  url: string;
  duration: string;
  year: string;
  rating: string;
}

export function parseM3U(content: string): M3UItem[] {
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  const items: M3UItem[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].startsWith("#EXTINF")) {
      const infoLine = lines[i];
      const urlLine = lines[i + 1] || "";

      // Parse attributes
      const titleMatch = infoLine.match(/,(.+)$/);
      const logoMatch = infoLine.match(/tvg-logo="([^"]*)"/);
      const groupMatch = infoLine.match(/group-title="([^"]*)"/);

      const title = titleMatch?.[1]?.trim() || "Sem tÃ­tulo";
      const image = logoMatch?.[1] || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=450&fit=crop";
      const category = groupMatch?.[1] || "Geral";

      items.push({
        id: crypto.randomUUID(),
        title,
        image,
        category,
        url: urlLine.startsWith("http") ? urlLine : "",
        duration: "â€”",
        year: new Date().getFullYear().toString(),
        rating: String(Math.floor(Math.random() * 15) + 85),
      });

      i += 2;
    } else {
      i++;
    }
  }

  return items;
}
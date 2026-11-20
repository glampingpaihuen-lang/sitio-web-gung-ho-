/** Palabras que no puede usar una empresa como enlace porque ya son páginas de la nube */
const RESERVADOS = new Set(["panel", "api", "_next", "favicon.ico", "icon.png"]);

/** "Colegio San José" → "colegio-san-jose" */
export function aSlug(texto: string): string {
  const s = texto
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return s || "empresa";
}

export function slugLibre(base: string, usados: Set<string>): string {
  let s = RESERVADOS.has(base) ? `${base}-1` : base;
  for (let n = 2; usados.has(s); n++) s = `${base}-${n}`;
  return s;
}

export const esReservado = (s: string) => RESERVADOS.has(s);

/** Ayudas que sirven igual en el servidor y en el navegador */
export const cuantas = (n: number) => (n === 1 ? "1 foto" : `${n.toLocaleString("es-CO")} fotos`);

/** "9 fotos · 2 videos" (total = fotos + videos) */
export function cuentaArchivos(total: number, videos: number) {
  const fotos = total - videos;
  const n = (k: number, uno: string, varios: string) => (k === 1 ? `1 ${uno}` : `${k.toLocaleString("es-CO")} ${varios}`);
  return [fotos ? n(fotos, "foto", "fotos") : "", videos ? n(videos, "video", "videos") : ""].filter(Boolean).join(" · ") || "0 fotos";
}

/** Iniciales para cuando la empresa no tiene logo: "Colegio San José" → "CS" */
export const iniciales = (nombre: string) =>
  nombre.split(/\s+/).filter(p => p.length > 2 || /^[A-ZÁÉÍÓÚÑ0-9]/.test(p)).slice(0, 2).map(p => p[0]).join("").toUpperCase() || nombre.slice(0, 2).toUpperCase();

export function Logo({ src, nombre, className }: { src: string | null; nombre: string; className: string }) {
  return (
    <span className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" /> : <b>{iniciales(nombre)}</b>}
    </span>
  );
}

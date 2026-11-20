import { open, stat } from "node:fs/promises";
import path from "node:path";
import { LOCAL_DIR, MIME, supa } from "@/lib/archivos";

/**
 * Solo pruebas en el PC sin Supabase: entrega las fotos y videos guardados en .datos/archivos/.
 * Los videos se mandan por partes (Range), que es como los piden el iPhone y los navegadores.
 */
export async function GET(req: Request, { params }: { params: Promise<{ ruta: string[] }> }) {
  if (supa()) return new Response("No encontrado", { status: 404 });
  const { ruta } = await params;
  const rel = ruta.join("/");
  if (!/^[a-z0-9/_.-]+$/i.test(rel) || rel.includes("..")) return new Response("No encontrado", { status: 404 });
  const tipo = MIME[rel.slice(rel.lastIndexOf(".") + 1).toLowerCase()];
  if (!tipo) return new Response("No encontrado", { status: 404 });
  const archivo = path.join(LOCAL_DIR, rel);
  let tam: number;
  try { tam = (await stat(archivo)).size; } catch { return new Response("No encontrado", { status: 404 }); }

  const h: Record<string, string> = { "content-type": tipo, "accept-ranges": "bytes", "cache-control": "public, max-age=31536000, immutable" };
  const descargar = new URL(req.url).searchParams.get("descargar");
  if (descargar) h["content-disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(descargar)}`;

  let ini = 0, fin = tam - 1, estado = 200;
  const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (rango && tam > 0) {
    if (rango[1]) { ini = Number(rango[1]); if (rango[2]) fin = Math.min(Number(rango[2]), tam - 1); }
    else if (rango[2]) { ini = Math.max(0, tam - Number(rango[2])); }
    if (ini > fin || ini >= tam) return new Response(null, { status: 416, headers: { "content-range": `bytes */${tam}` } });
    estado = 206;
    h["content-range"] = `bytes ${ini}-${fin}/${tam}`;
  }
  const largo = fin - ini + 1;
  h["content-length"] = String(Math.max(0, largo));
  if (largo <= 0) return new Response(null, { status: estado, headers: h });

  const fh = await open(archivo, "r");
  let pos = ini;
  const cuerpo = new ReadableStream<Uint8Array>({
    async pull(ctrl) {
      const falta = fin + 1 - pos;
      if (falta <= 0) { await fh.close(); ctrl.close(); return; }
      const buf = new Uint8Array(Math.min(256 * 1024, falta));
      const { bytesRead } = await fh.read(buf, 0, buf.length, pos);
      if (!bytesRead) { await fh.close(); ctrl.close(); return; }
      pos += bytesRead;
      ctrl.enqueue(buf.subarray(0, bytesRead));
    },
    async cancel() { await fh.close(); },
  });
  return new Response(cuerpo, { status: estado, headers: h });
}

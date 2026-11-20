import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Dónde quedan las fotos.
 * - Con Supabase (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY): en la carpeta pública "nube" de Supabase Storage.
 * - Sin Supabase (solo pruebas en el PC): en la carpeta .datos/ que comparten nube-app y nube-admin
 *   (al lado de los dos proyectos) y se muestran por /api/archivo/...
 */
export const BUCKET = "nube";
export const DATOS_DIR = process.env.NUBE_DATOS?.trim() || path.join(process.cwd(), "..", ".datos");
export const LOCAL_DIR = path.join(DATOS_DIR, "archivos");

export const TIPOS: Record<string, "jpg" | "png" | "webp"> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const TIPOS_VIDEO: Record<string, "mp4" | "mov" | "webm"> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
export const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
};
export const EXT_FOTO = ["jpg", "jpeg", "png", "webp"];
export const EXT_VIDEO = ["mp4", "mov", "webm"];
/** Supabase gratis no deja subir archivos de más de 50 MB */
export const MAX_ARCHIVO_MB = 50;

let cliente: SupabaseClient | null | undefined;
export function supa(): SupabaseClient | null {
  if (cliente !== undefined) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(), key = process.env.SUPABASE_SECRET_KEY?.trim();
  cliente = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return cliente;
}

/** En Vercel no hay disco donde guardar: sin Supabase no se puede subir nada */
export function exigirAlmacen() {
  if (!supa() && process.env.VERCEL) throw new Error("Falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY) en Vercel.");
}

const codificar = (p: string) => p.split("/").map(encodeURIComponent).join("/");

/** Dirección pública de un archivo. Con `descarga`, el navegador lo descarga con ese nombre. */
export function urlPublica(p: string, descarga?: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (supa() && base) {
    const u = `${base}/storage/v1/object/public/${BUCKET}/${codificar(p)}`;
    return descarga ? `${u}?download=${encodeURIComponent(descarga)}` : u;
  }
  const u = `/api/archivo/${codificar(p)}`;
  return descarga ? `${u}?descargar=${encodeURIComponent(descarga)}` : u;
}

export const nombreNuevo = (carpeta: string, ext: string) =>
  `${carpeta}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;

/**
 * Fotos y videos de la galería: el archivo original (en HD) en empresas/<id>/fotos/<archivo>
 * y su miniatura JPG (para la cuadrícula) en empresas/<id>/mini/<mismo nombre>.jpg
 */
export const RE_FOTO = /^empresas\/([0-9a-f-]{36})\/fotos\/(\d+-[a-f0-9]{8}\.(jpg|jpeg|png|webp|mp4|mov|webm))$/;
export const miniDe = (p: string) => p.replace("/fotos/", "/mini/").replace(/\.[a-z0-9]+$/, ".jpg");
export const esVideo = (p: string) => /\.(mp4|mov|webm)$/i.test(p);

export async function guardarArchivo(p: string, bytes: Buffer, tipo: string) {
  exigirAlmacen();
  const sb = supa();
  if (sb) {
    const { error } = await sb.storage.from(BUCKET).upload(p, bytes, { contentType: tipo, cacheControl: "31536000", upsert: false });
    if (error) throw new Error("No se pudo guardar el archivo: " + error.message);
    return;
  }
  const f = path.join(LOCAL_DIR, p);
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, bytes);
}

export async function existeArchivo(p: string): Promise<boolean> {
  const sb = supa();
  if (sb) {
    const { data } = await sb.storage.from(BUCKET).exists(p);
    return !!data;
  }
  try { return (await stat(path.join(LOCAL_DIR, p))).isFile(); } catch { return false; }
}

export async function borrarArchivos(paths: (string | null | undefined)[]) {
  const lista = [...new Set(paths.filter((p): p is string => !!p))];
  if (!lista.length) return;
  const sb = supa();
  if (sb) {
    for (let i = 0; i < lista.length; i += 500) await sb.storage.from(BUCKET).remove(lista.slice(i, i + 500));
    return;
  }
  await Promise.all(lista.map(p => unlink(path.join(LOCAL_DIR, p)).catch(() => {})));
}

/**
 * Permiso para que el navegador suba la foto directo a Supabase (sin pasar por el servidor,
 * porque Vercel no deja más de 4,5 MB por envío). Sin Supabase devuelve null y la foto
 * se manda a /api/panel/subir (solo en el PC).
 */
export async function permisoSubida(p: string): Promise<string | null> {
  exigirAlmacen();
  const sb = supa();
  if (!sb) return null;
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(p);
  if (error || !data) throw new Error("No se pudo preparar la subida: " + (error?.message ?? ""));
  return data.signedUrl;
}

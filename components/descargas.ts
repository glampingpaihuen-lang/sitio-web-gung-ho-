"use client";
import { useCallback, useState } from "react";
import type { Foto } from "@/lib/tipos";

/**
 * Descargar fotos y videos en su calidad original (HD).
 * - iPhone / iPad: se preparan los archivos y luego se abre el menú de compartir, donde sale
 *   «Guardar imagen / Guardar N elementos», que los deja en la app Fotos (la galería).
 *   Son dos toques porque el iPhone solo deja abrir ese menú justo después de tocar un botón.
 * - Android y computador: se descargan directo (en Android quedan en Descargas, que sale en la galería).
 */

export const esIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Descarga directa (Android y computador): el servidor manda el original como archivo para guardar */
async function descargarDirecto(items: Foto[]) {
  for (const f of items) {
    const a = document.createElement("a");
    a.href = f.descarga;
    a.download = f.archivo;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (items.length > 1) await esperar(450);
  }
}

async function traer(f: Foto): Promise<File> {
  const r = await fetch(f.url);
  if (!r.ok) throw new Error(`No se pudo traer «${f.archivo}».`);
  const blob = await r.blob();
  return new File([blob], f.archivo, { type: blob.type || (f.tipo === "video" ? "video/mp4" : "image/jpeg") });
}

export type EstadoDescarga =
  | { fase: "nada" }
  | { fase: "preparando"; hechos: number; total: number }
  | { fase: "listo"; archivos: File[] }      // iPhone: falta tocar «Guardar en la galería»
  | { fase: "aviso"; msg: string; error?: boolean };

export function useDescarga() {
  const [estado, setEstado] = useState<EstadoDescarga>({ fase: "nada" });

  const descargar = useCallback(async (items: Foto[]) => {
    if (!items.length) return;
    const compartir = esIOS() && typeof navigator.canShare === "function";
    if (!compartir) {
      await descargarDirecto(items);
      setEstado({ fase: "aviso", msg: items.length === 1 ? "Descargando…" : `Descargando ${items.length} archivos…` });
      return;
    }
    try {
      const archivos: File[] = [];
      setEstado({ fase: "preparando", hechos: 0, total: items.length });
      for (const f of items) {
        archivos.push(await traer(f));
        setEstado({ fase: "preparando", hechos: archivos.length, total: items.length });
      }
      if (!navigator.canShare({ files: archivos })) throw new Error("no-share");
      setEstado({ fase: "listo", archivos });
    } catch {
      // Si el iPhone no deja compartirlos (por ejemplo, demasiado pesados), se descargan normal
      await descargarDirecto(items);
      setEstado({ fase: "aviso", msg: "Descargando… Los encuentras en la app Archivos › Descargas." });
    }
  }, []);

  /** iPhone: segundo toque, abre el menú para guardarlos en Fotos */
  const guardar = useCallback(async () => {
    if (estado.fase !== "listo") return;
    try {
      await navigator.share({ files: estado.archivos });
      setEstado({ fase: "aviso", msg: "Listo. Revisa tu galería." });
    } catch (x) {
      if ((x as Error)?.name === "AbortError") setEstado({ fase: "nada" });
      else setEstado({ fase: "aviso", msg: "No se pudo abrir el menú para guardar. Inténtalo otra vez.", error: true });
    }
  }, [estado]);

  const limpiar = useCallback(() => setEstado({ fase: "nada" }), []);
  return { estado, descargar, guardar, limpiar };
}

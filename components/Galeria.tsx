"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Foto } from "@/lib/tipos";
import { useDescarga, type EstadoDescarga } from "./descargas";

const IPlay = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" /></svg>;
const ICheck = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5.5 12.5 4 4 9-9" /></svg>;
const IBajar = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" /></svg>;

/** Texto del botón de descargar según lo que haya elegido */
function textoDescargar(items: Foto[]) {
  if (items.length === 1) return items[0].tipo === "video" ? "Descargar video" : "Descargar imagen";
  return items.some(f => f.tipo === "video") ? "Descargar fotos y videos" : "Descargar imágenes";
}

/** Mensaje y botón de la descarga (preparando, guardar en la galería, listo) */
function Progreso({ estado, guardar, limpiar }: { estado: EstadoDescarga; guardar: () => void; limpiar: () => void }) {
  if (estado.fase === "preparando") return <span className="descarga__texto">Preparando {estado.hechos} de {estado.total}…</span>;
  if (estado.fase === "listo") {
    return (
      <button type="button" className="boton-oro" onClick={guardar}>
        <IBajar />Guardar en la galería
      </button>
    );
  }
  if (estado.fase === "aviso") {
    return (
      <button type="button" className={`descarga__texto${estado.error ? " is-error" : ""}`} onClick={limpiar}>{estado.msg}</button>
    );
  }
  return null;
}

/**
 * Fotos y videos en tarjetas redondeadas (dos columnas en el celular).
 * Tocar: se abre en grande. Mantener presionada: empieza a elegir varias para descargarlas.
 */
export function Galeria({ fotos }: { fotos: Foto[] }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const { estado, descargar, guardar, limpiar } = useDescarga();
  const presion = useRef<{ t: number; x: number; y: number } | null>(null);
  const fueLarga = useRef(false);

  const alternar = (id: string) => setElegidas(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const salir = () => { setEligiendo(false); setElegidas(new Set()); limpiar(); };
  const soltar = () => { if (presion.current) clearTimeout(presion.current.t); presion.current = null; };

  // Al terminar de guardar, sale del modo elegir; el aviso se quita solo
  useEffect(() => {
    if (estado.fase !== "aviso") return;
    if (!estado.error) { setEligiendo(false); setElegidas(new Set()); }
    const t = setTimeout(limpiar, 4500);
    return () => clearTimeout(t);
  }, [estado, limpiar]);

  const items = fotos.filter(f => elegidas.has(f.id));
  const ocupado = estado.fase === "preparando";

  return (
    <>
      <div className="galeria__acciones">
        {eligiendo ? null : (
          <button type="button" className="pildora" onClick={() => setEligiendo(true)}>
            <ICheck />Seleccionar
          </button>
        )}
      </div>

      <ul className={`fotos${eligiendo ? " is-eligiendo" : ""}`}>
        {fotos.map((f, i) => {
          const elegida = elegidas.has(f.id);
          return (
            <li key={f.id} className={`foto${elegida ? " is-elegida" : ""}`}>
              <button
                type="button"
                aria-pressed={eligiendo ? elegida : undefined}
                aria-label={eligiendo
                  ? `${elegida ? "Quitar" : "Elegir"} ${f.tipo === "video" ? "video" : "foto"} ${i + 1}`
                  : `Ver ${f.tipo === "video" ? "video" : "foto"} ${i + 1} de ${fotos.length} en grande`}
                onPointerDown={e => {
                  fueLarga.current = false;
                  const id = f.id;
                  presion.current = {
                    x: e.clientX, y: e.clientY,
                    t: window.setTimeout(() => {
                      fueLarga.current = true;
                      presion.current = null;
                      navigator.vibrate?.(15);
                      setEligiendo(true);
                      setElegidas(s => new Set(s).add(id));
                    }, 450),
                  };
                }}
                onPointerMove={e => {
                  const p = presion.current;
                  if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) soltar();
                }}
                onPointerUp={soltar}
                onPointerCancel={soltar}
                onPointerLeave={soltar}
                onContextMenu={e => e.preventDefault()}
                onClick={() => {
                  if (fueLarga.current) { fueLarga.current = false; return; }
                  if (eligiendo) alternar(f.id); else setAbierta(i);
                }}
              >
                {f.mini
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={f.mini} alt="" loading={i < 6 ? "eager" : "lazy"} decoding="async" draggable={false} />
                  : <video src={`${f.url}#t=0.5`} muted playsInline preload="metadata" />}
                {f.tipo === "video" ? <span className="foto__play"><IPlay /></span> : null}
                {eligiendo ? <span className="foto__marca">{elegida ? <ICheck /> : null}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>

      {eligiendo ? (
        <>
          <div className="seleccion__espacio" aria-hidden="true" />
          <div className="seleccion" role="region" aria-label="Fotos elegidas">
            <div className="seleccion__fila">
              <button type="button" className="seleccion__link" onClick={salir}>Cancelar</button>
              <b className="seleccion__cuenta">
                {elegidas.size ? `${elegidas.size} ${elegidas.size === 1 ? "elegida" : "elegidas"}` : "Toca las que quieras"}
              </b>
              <button type="button" className="seleccion__link" disabled={ocupado}
                onClick={() => setElegidas(elegidas.size === fotos.length ? new Set() : new Set(fotos.map(f => f.id)))}>
                {elegidas.size === fotos.length ? "Ninguna" : "Todas"}
              </button>
            </div>
            {estado.fase === "nada" ? (
              <button type="button" className="boton-oro" disabled={!items.length} onClick={() => void descargar(items)}>
                <IBajar />{items.length ? textoDescargar(items) : "Descargar imágenes"}
              </button>
            ) : (
              <div className="seleccion__estado"><Progreso estado={estado} guardar={guardar} limpiar={limpiar} /></div>
            )}
          </div>
        </>
      ) : estado.fase === "aviso" ? (
        <div className="aviso" role="status"><Progreso estado={estado} guardar={guardar} limpiar={limpiar} /></div>
      ) : null}

      {abierta != null ? createPortal(<Visor fotos={fotos} inicio={abierta} onClose={() => setAbierta(null)} />, document.body) : null}
    </>
  );
}

function Visor({ fotos, inicio, onClose }: { fotos: Foto[]; inicio: number; onClose: () => void }) {
  const [i, setI] = useState(inicio);
  const [cargada, setCargada] = useState(false);
  const { estado, descargar, guardar, limpiar } = useDescarga();
  const n = fotos.length;
  const ir = useCallback((d: number) => { setCargada(false); limpiar(); setI(x => (x + d + n) % n); }, [n, limpiar]);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const cerrarBtn = useRef<HTMLButtonElement>(null);
  const alCerrar = useRef(onClose);
  alCerrar.current = onClose;

  // El botón «atrás» del celular cierra el visor en vez de salir de la página
  useEffect(() => {
    if (!history.state?.visor) history.pushState({ ...history.state, visor: true }, "");
    const onPop = () => alCerrar.current();
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  const cerrar = useCallback(() => { if (history.state?.visor) history.back(); else alCerrar.current(); }, []);

  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    cerrarBtn.current?.focus();
    return () => { html.style.overflow = overflow; antes?.focus?.(); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") ir(1);
      else if (e.key === "ArrowLeft") ir(-1);
      else if (e.key === "Escape") cerrar();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [ir, cerrar]);

  // Deja listas la foto anterior y la siguiente para que pasen sin espera
  useEffect(() => {
    for (const d of [1, -1]) {
      const f = fotos[(i + d + n) % n];
      if (f.tipo === "foto") { const img = new Image(); img.src = f.url; }
    }
  }, [i, n, fotos]);

  useEffect(() => {
    if (estado.fase !== "aviso") return;
    const t = setTimeout(limpiar, 3500);
    return () => clearTimeout(t);
  }, [estado, limpiar]);

  const f = fotos[i];
  const video = f.tipo === "video";
  return (
    <div className="visor" role="dialog" aria-modal="true" aria-label={`${video ? "Video" : "Foto"} ${i + 1} de ${n}`}
      onTouchStart={e => { toque.current = video ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={e => {
        const t = toque.current; toque.current = null;
        if (!t) return;
        const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) ir(dx < 0 ? 1 : -1);
        else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) cerrar();
      }}>
      <div className="visor__barra">
        <span className="visor__cuenta">{i + 1} de {n}</span>
        {estado.fase === "nada" ? (
          <button type="button" className="visor__btn" onClick={() => void descargar([f])}>
            <IBajar />{video ? "Descargar video" : "Descargar imagen"}
          </button>
        ) : estado.fase === "listo" ? (
          <button type="button" className="visor__btn visor__btn--oro" onClick={() => void guardar()}>
            <IBajar />Guardar en la galería
          </button>
        ) : (
          <button type="button" className="visor__btn" onClick={limpiar} disabled={estado.fase === "preparando"}>
            {estado.fase === "preparando" ? "Preparando…" : estado.msg}
          </button>
        )}
        <button ref={cerrarBtn} type="button" className="visor__btn visor__btn--solo" onClick={cerrar} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className="visor__marco" onClick={e => { if (e.target === e.currentTarget) cerrar(); }}>
        {video ? (
          <video key={`v${i}`} className="visor__video" src={f.url} poster={f.mini ?? undefined} controls playsInline autoPlay />
        ) : (
          <>
            {f.mini ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`m${i}`} className="visor__mini" src={f.mini} alt="" aria-hidden="true" />
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={`g${i}`} className={`visor__img${cargada ? " is-lista" : ""}`} src={f.url} alt={f.nombre} onLoad={() => setCargada(true)} />
          </>
        )}
      </div>
      {n > 1 ? (
        <>
          <button type="button" className="visor__flecha visor__flecha--ant" onClick={() => ir(-1)} aria-label="Anterior">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
          </button>
          <button type="button" className="visor__flecha visor__flecha--sig" onClick={() => ir(1)} aria-label="Siguiente">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>
          </button>
        </>
      ) : null}
    </div>
  );
}

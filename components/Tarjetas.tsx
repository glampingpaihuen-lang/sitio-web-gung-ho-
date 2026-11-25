"use client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { EmpresaResumen } from "@/lib/tipos";
import { cuentaArchivos, iniciales } from "./Logo";

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * El logo llena todo el recuadro. Si es muy ancho o muy alto (por ejemplo un
 * logo con letras a lo largo), se muestra completo para no cortarle el texto.
 */
function LogoTarjeta({ src }: { src: string }) {
  const [entero, setEntero] = useState(false);
  const revisar = useCallback((img: HTMLImageElement | null) => {
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return;
    const r = img.naturalWidth / img.naturalHeight;
    setEntero(r > 1.35 || r < 0.74);
  }, []);
  return (
    <span className={entero ? "tarjeta__logo tarjeta__logo--entero" : "tarjeta__logo"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={revisar} src={src} alt="" loading="lazy" onLoad={ev => revisar(ev.currentTarget)} />
    </span>
  );
}

/** Tarjeta de una empresa: su logo grande y el nombre. Al tocarla se ven sus fotos. */
function Tarjeta({ e }: { e: EmpresaResumen }) {
  return (
    <Link href={`/${e.slug}`} className="tarjeta">
      {e.logo ? <LogoTarjeta src={e.logo} /> : <span className="tarjeta__logo"><b>{iniciales(e.nombre)}</b></span>}
      <span className="tarjeta__pie">
        <span className="tarjeta__nombre">{e.nombre}</span>
        {e.total ? <span className="tarjeta__total">{cuentaArchivos(e.total, e.videos)}</span> : null}
      </span>
    </Link>
  );
}

export function Tarjetas({ empresas }: { empresas: EmpresaResumen[] }) {
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const t = sinTildes(q.trim());
    return t ? empresas.filter(e => sinTildes(e.nombre).includes(t)) : empresas;
  }, [q, empresas]);

  if (!empresas.length) {
    return <p className="portada__vacia">Muy pronto vas a encontrar aquí las fotos de cada empresa e institución.</p>;
  }

  return (
    <section aria-label="Empresas e instituciones">
      {empresas.length > 6 ? (
        <label className="buscar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          <span className="sr">Buscar empresa o institución</span>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar empresa o institución" autoComplete="off" />
        </label>
      ) : null}
      {lista.length ? (
        <ul className="tarjetas">
          {lista.map(e => <li key={e.id}><Tarjeta e={e} /></li>)}
        </ul>
      ) : (
        <p className="portada__nada">No hay ninguna que se llame «{q.trim()}». Revisa cómo está escrito.</p>
      )}
    </section>
  );
}

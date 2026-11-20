import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { DATOS_DIR, supa, urlPublica } from "./archivos";
import { aSlug, esReservado, slugLibre } from "./slug";
import type { Ajustes, Empresa, EmpresaResumen, FondoModo, Foto } from "./tipos";

/**
 * Datos de la nube: empresas, fotos y ajustes.
 * Con Supabase se guardan en sus tablas (ver supabase/nube.sql).
 * Sin Supabase (pruebas en el PC) se guardan en .datos/nube.json (carpeta compartida por la página y el panel).
 */

type EmpresaFila = { id: string; nombre: string; slug: string; logo_path: string | null; visible: boolean; orden: number; creado: string };
type FotoFila = { id: string; empresa_id: string; tipo?: "foto" | "video"; path: string; mini_path: string | null; ancho: number; alto: number; bytes: number; nombre: string; orden: number; creado: string };
type AjustesFila = { logo_path: string | null; titulo: string; subtitulo: string; fondo_path: string | null; fondo_modo: FondoModo; fondo_oscuro: number };
export type NuevaFoto = Omit<FotoFila, "id" | "creado">;

const AJUSTES_BASE: AjustesFila = {
  logo_path: null,
  titulo: "Nube de fotos",
  subtitulo: "Busca tu empresa o institución y abre sus fotos.",
  fondo_path: null,
  fondo_modo: "cubrir",
  fondo_oscuro: 75,
};

/* ------------------------------------------------------------------ */
/* Pruebas en el PC: un archivo JSON (con turnos para no pisar cambios) */
/* ------------------------------------------------------------------ */
type Local = { empresas: EmpresaFila[]; fotos: FotoFila[]; ajustes: AjustesFila };
const JSON_FILE = path.join(DATOS_DIR, "nube.json");
let fila: Promise<unknown> = Promise.resolve();

async function leerLocal(): Promise<Local> {
  try {
    const d = JSON.parse(await readFile(JSON_FILE, "utf8")) as Partial<Local>;
    return { empresas: d.empresas ?? [], fotos: d.fotos ?? [], ajustes: { ...AJUSTES_BASE, ...d.ajustes } };
  } catch {
    return { empresas: [], fotos: [], ajustes: { ...AJUSTES_BASE } };
  }
}

/** Lee, cambia y guarda el JSON, uno a la vez */
function conLocal<T>(fn: (d: Local) => T | Promise<T>, guardar = false): Promise<T> {
  const turno = fila.then(async () => {
    const d = await leerLocal();
    const r = await fn(d);
    if (guardar) {
      await mkdir(DATOS_DIR, { recursive: true });
      const tmp = JSON_FILE + ".tmp";
      await writeFile(tmp, JSON.stringify(d, null, 1));
      await rename(tmp, JSON_FILE);
    }
    return r;
  });
  fila = turno.catch(() => {});
  return turno;
}

function revisar<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error("Error de la base de datos: " + r.error.message);
  return r.data as T;
}

const porOrdenEmpresa = (a: EmpresaFila, b: EmpresaFila) => a.orden - b.orden || b.creado.localeCompare(a.creado);
const porOrdenFoto = (a: FotoFila, b: FotoFila) => a.orden - b.orden || a.creado.localeCompare(b.creado);

const aEmpresa = (e: EmpresaFila): Empresa => ({
  id: e.id, nombre: e.nombre, slug: e.slug, visible: e.visible, orden: e.orden,
  logo: e.logo_path ? urlPublica(e.logo_path) : null,
});

/* ---------------------------- Empresas ---------------------------- */

export async function listarEmpresas(soloVisibles: boolean): Promise<EmpresaResumen[]> {
  const sb = supa();
  if (sb) {
    let q = sb.from("nube_resumen").select("*").order("orden").order("creado", { ascending: false });
    if (soloVisibles) q = q.eq("visible", true);
    const filas = revisar(await q) as (EmpresaFila & { total: number; videos: number | null; muestras: string[] | null })[];
    return filas.map(e => ({ ...aEmpresa(e), total: e.total, videos: e.videos ?? 0, muestras: (e.muestras ?? []).map(p => urlPublica(p)) }));
  }
  return conLocal(d => d.empresas
    .filter(e => !soloVisibles || e.visible)
    .sort(porOrdenEmpresa)
    .map(e => {
      const fotos = d.fotos.filter(f => f.empresa_id === e.id).sort(porOrdenFoto);
      return {
        ...aEmpresa(e), total: fotos.length, videos: fotos.filter(f => f.tipo === "video").length,
        muestras: fotos.filter(f => f.mini_path).slice(0, 3).map(f => urlPublica(f.mini_path!)),
      };
    }));
}

async function filaEmpresa(campo: "id" | "slug", valor: string): Promise<EmpresaFila | null> {
  if (campo === "id" && !/^[0-9a-f-]{36}$/.test(valor)) return null;
  const sb = supa();
  if (sb) return revisar(await sb.from("nube_empresas").select("*").eq(campo, valor).maybeSingle()) as EmpresaFila | null;
  return conLocal(d => d.empresas.find(e => e[campo] === valor) ?? null);
}

export async function empresaPorSlug(slug: string) {
  const e = await filaEmpresa("slug", slug);
  return e ? aEmpresa(e) : null;
}

export async function empresaPorId(id: string) {
  const e = await filaEmpresa("id", id);
  return e ? { ...aEmpresa(e), logoPath: e.logo_path } : null;
}

async function slugsUsados(exceptoId?: string): Promise<Set<string>> {
  const sb = supa();
  const filas: { id: string; slug: string }[] = sb
    ? revisar(await sb.from("nube_empresas").select("id, slug"))
    : await conLocal(d => d.empresas.map(e => ({ id: e.id, slug: e.slug })));
  return new Set(filas.filter(f => f.id !== exceptoId).map(f => f.slug));
}

export async function crearEmpresa(nombre: string, logoPath: string | null): Promise<Empresa> {
  const slug = slugLibre(aSlug(nombre), await slugsUsados());
  const sb = supa();
  if (sb) {
    const [primera] = revisar(await sb.from("nube_empresas").select("orden").order("orden").limit(1)) as { orden: number }[];
    const fila = revisar(await sb.from("nube_empresas")
      .insert({ nombre, slug, logo_path: logoPath, visible: true, orden: (primera?.orden ?? 1) - 1 })
      .select("*").single()) as EmpresaFila;
    return aEmpresa(fila);
  }
  return conLocal(d => {
    const orden = Math.min(1, ...d.empresas.map(e => e.orden)) - 1;
    const fila: EmpresaFila = { id: randomUUID(), nombre, slug, logo_path: logoPath, visible: true, orden, creado: new Date().toISOString() };
    d.empresas.push(fila);
    return aEmpresa(fila);
  }, true);
}

export async function actualizarEmpresa(id: string, cambios: Partial<Pick<EmpresaFila, "nombre" | "slug" | "logo_path" | "visible">>) {
  if (cambios.slug !== undefined) {
    const s = aSlug(cambios.slug);
    if (esReservado(s)) throw new Error(`«${s}» no se puede usar como enlace. Prueba con otro.`);
    if ((await slugsUsados(id)).has(s)) throw new Error(`Ya hay otra empresa con el enlace «${s}».`);
    cambios.slug = s;
  }
  const sb = supa();
  if (sb) { revisar(await sb.from("nube_empresas").update(cambios).eq("id", id)); return; }
  await conLocal(d => {
    const e = d.empresas.find(x => x.id === id);
    if (e) Object.assign(e, cambios);
  }, true);
}

/** Borra la empresa con todas sus fotos. Devuelve los archivos que hay que borrar. */
export async function borrarEmpresa(id: string): Promise<string[]> {
  const sb = supa();
  if (sb) {
    const e = revisar(await sb.from("nube_empresas").select("logo_path").eq("id", id).maybeSingle()) as { logo_path: string | null } | null;
    const fotos = revisar(await sb.from("nube_fotos").select("path, mini_path").eq("empresa_id", id)) as { path: string; mini_path: string | null }[];
    revisar(await sb.from("nube_empresas").delete().eq("id", id));
    return [e?.logo_path, ...fotos.flatMap(f => [f.path, f.mini_path])].filter((p): p is string => !!p);
  }
  return conLocal(d => {
    const e = d.empresas.find(x => x.id === id);
    const fotos = d.fotos.filter(f => f.empresa_id === id);
    d.empresas = d.empresas.filter(x => x.id !== id);
    d.fotos = d.fotos.filter(f => f.empresa_id !== id);
    return [e?.logo_path, ...fotos.flatMap(f => [f.path, f.mini_path])].filter((p): p is string => !!p);
  }, true);
}

/** Intercambia el lugar con la de al lado (dir = -1 antes, 1 después) */
async function mover(tabla: "nube_empresas" | "nube_fotos", lista: { id: string; orden: number }[], id: string, dir: number) {
  const i = lista.findIndex(x => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= lista.length) return;
  const a = lista[i], b = lista[j];
  const nuevos = a.orden === b.orden
    ? lista.map((x, k) => ({ id: x.id, orden: k === i ? j : k === j ? i : k }))   // empatados: se numeran todos
    : [{ id: a.id, orden: b.orden }, { id: b.id, orden: a.orden }];
  const sb = supa();
  if (sb) {
    for (const n of nuevos) revisar(await sb.from(tabla).update({ orden: n.orden }).eq("id", n.id));
    return;
  }
  await conLocal(d => {
    const filas: { id: string; orden: number }[] = tabla === "nube_empresas" ? d.empresas : d.fotos;
    for (const n of nuevos) { const f = filas.find(x => x.id === n.id); if (f) f.orden = n.orden; }
  }, true);
}

export async function moverEmpresa(id: string, dir: number) {
  const sb = supa();
  const lista = sb
    ? revisar(await sb.from("nube_empresas").select("id, orden").order("orden").order("creado", { ascending: false })) as { id: string; orden: number }[]
    : await conLocal(d => [...d.empresas].sort(porOrdenEmpresa).map(e => ({ id: e.id, orden: e.orden })));
  await mover("nube_empresas", lista, id, dir);
}

/* ------------------------------ Fotos ------------------------------ */

const extDe = (p: string) => p.slice(p.lastIndexOf(".") + 1);

export async function fotosDe(empresaId: string): Promise<Foto[]> {
  const sb = supa();
  const filas: FotoFila[] = sb
    ? revisar(await sb.from("nube_fotos").select("*").eq("empresa_id", empresaId).order("orden").order("creado"))
    : await conLocal(d => d.fotos.filter(f => f.empresa_id === empresaId).sort(porOrdenFoto));
  return filas.map((f, i) => {
    const tipo = f.tipo === "video" ? "video" : "foto";
    const nombre = f.nombre || `${tipo}-${i + 1}`;
    const archivo = `${nombre}.${extDe(f.path)}`;
    return {
      id: f.id, tipo, ancho: f.ancho, alto: f.alto, nombre, archivo,
      url: urlPublica(f.path),
      mini: f.mini_path ? urlPublica(f.mini_path) : tipo === "foto" ? urlPublica(f.path) : null,
      descarga: urlPublica(f.path, archivo),
    };
  });
}

/** Número de orden para la siguiente foto (las nuevas quedan al final) */
export async function siguienteOrden(empresaId: string): Promise<number> {
  const sb = supa();
  if (sb) {
    const [u] = revisar(await sb.from("nube_fotos").select("orden").eq("empresa_id", empresaId).order("orden", { ascending: false }).limit(1)) as { orden: number }[];
    return (u?.orden ?? -1) + 1;
  }
  return conLocal(d => Math.max(-1, ...d.fotos.filter(f => f.empresa_id === empresaId).map(f => f.orden)) + 1);
}

export async function agregarFoto(f: NuevaFoto) {
  const sb = supa();
  if (sb) { revisar(await sb.from("nube_fotos").insert(f)); return; }
  await conLocal(d => { d.fotos.push({ ...f, id: randomUUID(), creado: new Date().toISOString() }); }, true);
}

/** Quita fotos de una empresa. Devuelve los archivos que hay que borrar. */
export async function borrarFotos(empresaId: string, ids: string[]): Promise<string[]> {
  const validos = ids.filter(id => /^[0-9a-f-]{36}$/.test(id));
  if (!validos.length) return [];
  const sb = supa();
  if (sb) {
    const filas = revisar(await sb.from("nube_fotos").delete().eq("empresa_id", empresaId).in("id", validos).select("path, mini_path")) as { path: string; mini_path: string | null }[];
    return filas.flatMap(f => [f.path, f.mini_path]).filter((p): p is string => !!p);
  }
  return conLocal(d => {
    const quitar = d.fotos.filter(f => f.empresa_id === empresaId && validos.includes(f.id));
    d.fotos = d.fotos.filter(f => !quitar.includes(f));
    return quitar.flatMap(f => [f.path, f.mini_path]).filter((p): p is string => !!p);
  }, true);
}

export async function moverFoto(empresaId: string, id: string, dir: number) {
  const sb = supa();
  const lista = sb
    ? revisar(await sb.from("nube_fotos").select("id, orden").eq("empresa_id", empresaId).order("orden").order("creado")) as { id: string; orden: number }[]
    : await conLocal(d => d.fotos.filter(f => f.empresa_id === empresaId).sort(porOrdenFoto).map(f => ({ id: f.id, orden: f.orden })));
  await mover("nube_fotos", lista, id, dir);
}

/* ----------------------------- Ajustes ----------------------------- */

export async function leerAjustes(): Promise<Ajustes & { fondoPath: string | null; logoPath: string | null }> {
  const sb = supa();
  let a: AjustesFila;
  if (sb) {
    const fila = revisar(await sb.from("nube_ajustes").select("*").eq("id", 1).maybeSingle()) as AjustesFila | null;
    a = { ...AJUSTES_BASE, ...fila };
  } else {
    a = await conLocal(d => d.ajustes);
  }
  return {
    logo: a.logo_path ? urlPublica(a.logo_path) : null, logoPath: a.logo_path,
    titulo: a.titulo, subtitulo: a.subtitulo,
    fondo: a.fondo_path ? urlPublica(a.fondo_path) : null, fondoPath: a.fondo_path,
    fondoModo: a.fondo_modo === "centrado" ? "centrado" : "cubrir",
    fondoOscuro: Math.max(0, Math.min(95, Number(a.fondo_oscuro) || 0)),
  };
}

export async function guardarAjustes(cambios: Partial<AjustesFila>) {
  const sb = supa();
  if (sb) { revisar(await sb.from("nube_ajustes").upsert({ id: 1, ...cambios })); return; }
  await conLocal(d => { Object.assign(d.ajustes, cambios); }, true);
}

import type { Metadata } from "next";
import { Cabecera } from "@/components/Cabecera";
import { Fondo } from "@/components/Fondo";
import { Tarjetas } from "@/components/Tarjetas";
import { leerAjustes, listarEmpresas } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const a = await leerAjustes();
  return { title: { absolute: a.titulo || "Gung Ho" }, description: a.subtitulo };
}

export default async function Portada() {
  const [ajustes, empresas] = await Promise.all([leerAjustes(), listarEmpresas(true)]);
  return (
    <>
      <Fondo ajustes={ajustes} />
      <main className="portada">
        <Cabecera logo={ajustes.logo} grande />
        {ajustes.titulo || ajustes.subtitulo ? (
          <header className="portada__head">
            {ajustes.titulo ? <h1 className="titulo">{ajustes.titulo}</h1> : null}
            {ajustes.subtitulo ? <p className="portada__sub">{ajustes.subtitulo}</p> : null}
          </header>
        ) : null}
        <Tarjetas empresas={empresas} />
      </main>
    </>
  );
}

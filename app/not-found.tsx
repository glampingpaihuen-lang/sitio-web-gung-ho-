import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { Fondo } from "@/components/Fondo";
import { leerAjustes } from "@/lib/store";

export default async function NoEncontrada() {
  const ajustes = await leerAjustes().catch(() => null);
  return (
    <>
      {ajustes ? <Fondo ajustes={ajustes} extra={15} /> : null}
      <main className="album">
        <Cabecera logo={ajustes?.logo ?? null} volver />
        <header className="album__head">
          <h1 className="titulo">Esta página no existe</h1>
          <p className="album__sub">Puede que el enlace esté mal escrito o que la hayan quitado.</p>
          <Link href="/" className="enlace-oro">Ver todas las empresas</Link>
        </header>
      </main>
    </>
  );
}

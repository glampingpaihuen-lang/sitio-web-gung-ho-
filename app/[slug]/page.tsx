import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { Fondo } from "@/components/Fondo";
import { Galeria } from "@/components/Galeria";
import { cuentaArchivos, Logo } from "@/components/Logo";
import { empresaPorSlug, fotosDe, leerAjustes } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = await empresaPorSlug(decodeURIComponent(slug));
  return { title: e?.nombre ?? "No encontrada" };
}

export default async function Album({ params }: Props) {
  const { slug } = await params;
  const empresa = await empresaPorSlug(decodeURIComponent(slug));
  if (!empresa) notFound();
  const [ajustes, fotos] = await Promise.all([leerAjustes(), fotosDe(empresa.id)]);

  return (
    <>
      <Fondo ajustes={ajustes} extra={15} />
      <main className="album">
        <Cabecera logo={ajustes.logo} volver />
        <header className="album__head">
          {empresa.logo ? <Logo src={empresa.logo} nombre={empresa.nombre} className="album__logo" /> : null}
          <h1 className="titulo">{empresa.nombre}</h1>
          <p className="album__sub">
            {fotos.length
              ? `${cuentaArchivos(fotos.length, fotos.filter(f => f.tipo === "video").length)} · Toca una para verla en grande`
              : "Muy pronto vas a encontrar aquí las fotos."}
          </p>
        </header>
        {fotos.length ? <Galeria fotos={fotos} /> : null}
      </main>
    </>
  );
}

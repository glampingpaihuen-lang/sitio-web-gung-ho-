import Link from "next/link";

/** Logo de Gung Ho que viene con la página (public/gung ho logo.jpeg) */
export const LOGO_GUNG_HO = "/gung%20ho%20logo.jpeg";

/**
 * Logo de arriba, en el centro (como el de Moonlight).
 * `grande`: en la portada, que es lo primero que se ve. `volver`: botón para regresar a las tarjetas.
 * `logo`: el que suban en el panel; si no hay, el de Gung Ho.
 */
export function Cabecera({ logo, grande = false, volver = false }: { logo: string | null; grande?: boolean; volver?: boolean }) {
  const propio = !!logo;
  return (
    <header className={`cabecera${grande ? " cabecera--grande" : ""}`}>
      {volver ? (
        <Link href="/" className="volver" aria-label="Volver a todas las empresas">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
        </Link>
      ) : <span />}
      <Link href="/" className="cabecera__logo" aria-label="Inicio">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo ?? LOGO_GUNG_HO} alt="Gung Ho" className={propio ? undefined : "is-gungho"} />
      </Link>
      <span />
    </header>
  );
}

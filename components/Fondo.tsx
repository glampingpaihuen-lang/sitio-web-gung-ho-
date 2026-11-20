import type { CSSProperties } from "react";
import type { Ajustes } from "@/lib/tipos";

/**
 * Fondo de toda la página, oscurecido para que se lea lo de encima. `extra` lo oscurece un poco más.
 * Si en el panel no han subido otra imagen, van los afiches de Gung Ho (public/):
 * el vertical en el celular y el horizontal en el computador.
 */
export function Fondo({ ajustes, extra = 0 }: { ajustes: Pick<Ajustes, "fondo" | "fondoModo" | "fondoOscuro">; extra?: number }) {
  const oscuro = Math.min(97, ajustes.fondoOscuro + extra) / 100;
  const style = { "--oscuro": oscuro } as Record<string, string | number>;
  if (ajustes.fondo) style["--fondo-img"] = `url("${ajustes.fondo.replace(/"/g, "%22")}")`;
  return (
    <div
      className={ajustes.fondo ? `fondo fondo--${ajustes.fondoModo}` : "fondo fondo--gungho"}
      style={style as CSSProperties}
      aria-hidden="true"
    />
  );
}

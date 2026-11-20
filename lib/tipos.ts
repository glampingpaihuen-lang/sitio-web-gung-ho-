/** Empresa o institución: cada una es una carpeta de la nube */
export type Empresa = {
  id: string;
  nombre: string;
  slug: string;
  logo: string | null;
  visible: boolean;
  orden: number;
};

/** Para la portada y el panel: cuántos archivos tiene (de esos, cuántos videos) y las 3 primeras miniaturas */
export type EmpresaResumen = Empresa & { total: number; videos: number; muestras: string[] };

export type Foto = {
  id: string;
  tipo: "foto" | "video";
  url: string;          // el archivo original, en HD
  mini: string | null;  // miniatura JPG para la cuadrícula (null: video sin portada)
  descarga: string;     // el mismo original, pero el navegador lo descarga
  archivo: string;      // nombre con el que se guarda al descargar
  ancho: number;
  alto: number;
  nombre: string;
};

export type FondoModo = "cubrir" | "centrado";

export type Ajustes = {
  logo: string | null; // logo de arriba (sin subir: el de Gung Ho que viene con la página)
  titulo: string;
  subtitulo: string;
  fondo: string | null;
  fondoModo: FondoModo;
  fondoOscuro: number; // 0 a 95: qué tanto se oscurece el fondo para que se lea encima
};

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; msg: string };

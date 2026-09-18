/**
 * Manifiesto de firma electrónica y su verificación.
 *
 * Fundamento:
 * · Ley 527 de 1999, art. 6 — el requisito de escrito se satisface con un
 *   mensaje de datos accesible para consulta posterior.
 * · Ley 527 de 1999, art. 7 — la firma se entiende satisfecha cuando se use un
 *   método que permita identificar al iniciador y que sea confiable y
 *   apropiado al propósito del mensaje.
 * · Ley 527 de 1999, art. 8 — el original se conserva cuando existe garantía
 *   confiable de que la información se ha mantenido íntegra.
 * · Ley 527 de 1999, art. 11 — criterios de valoración probatoria.
 * · Decreto 2364 de 2012 — firma electrónica: confiabilidad y apropiación.
 * · Código General del Proceso, art. 244 — presunción de autenticidad.
 *
 * Lo que este manifiesto acredita y lo que no está en `CRITERIOS`, y la
 * aplicación lo muestra siempre: vender una firma electrónica como si fuera
 * una firma digital certificada es precisamente lo que no se hace aquí.
 */
import { z } from 'zod';

import { identificarClave, verificar } from '../lib/cripto';

export const VERSION_MANIFIESTO = 1;

/* ══ Esquema ═════════════════════════════════════════════════════ */

const EsquemaJWK = z.object({
  kty: z.literal('EC'),
  crv: z.literal('P-256'),
  x: z.string().min(1),
  y: z.string().min(1),
  ext: z.boolean().optional(),
  key_ops: z.array(z.string()).optional(),
});

export const EsquemaManifiesto = z.object({
  version: z.number().int().positive(),
  documento: z.object({
    nombre: z.string().min(1),
    bytes: z.number().int().nonnegative(),
    huellaSha256: z.string().regex(/^[0-9a-f]{64}$/),
  }),
  firmante: z.object({
    nombre: z.string().min(1),
    identificacion: z.string(),
    rol: z.string(),
  }),
  proposito: z.string(),
  selloTiempo: z.string().min(10),
  clavePublica: EsquemaJWK,
  identificadorClave: z.string().regex(/^[0-9a-f]{64}$/),
  algoritmo: z.literal('ECDSA-P256-SHA256'),
  firma: z.string().min(16),
});

export type Manifiesto = z.infer<typeof EsquemaManifiesto>;

/**
 * Carga útil que se firma. Es el manifiesto sin el campo `firma`, serializado
 * de forma canónica: las claves en orden fijo y sin espacios, para que dos
 * implementaciones produzcan byte a byte lo mismo.
 */
export function cargaFirmable(m: Omit<Manifiesto, 'firma'>): string {
  return JSON.stringify({
    version: m.version,
    documento: {
      nombre: m.documento.nombre,
      bytes: m.documento.bytes,
      huellaSha256: m.documento.huellaSha256,
    },
    firmante: {
      nombre: m.firmante.nombre,
      identificacion: m.firmante.identificacion,
      rol: m.firmante.rol,
    },
    proposito: m.proposito,
    selloTiempo: m.selloTiempo,
    clavePublica: {
      crv: m.clavePublica.crv,
      kty: m.clavePublica.kty,
      x: m.clavePublica.x,
      y: m.clavePublica.y,
    },
    identificadorClave: m.identificadorClave,
    algoritmo: m.algoritmo,
  });
}

/* ══ Verificación ════════════════════════════════════════════════ */

export type ResultadoPrueba = 'cumple' | 'falla' | 'noVerificable';

export interface Comprobacion {
  readonly id: string;
  readonly rotulo: string;
  readonly resultado: ResultadoPrueba;
  readonly detalle: string;
  readonly norma: string;
}

export interface Veredicto {
  readonly valido: boolean;
  readonly comprobaciones: readonly Comprobacion[];
  readonly manifiesto: Manifiesto | null;
  readonly errorEstructura: string | null;
}

/**
 * Verifica un manifiesto.
 *
 * `huellaDocumento` es la huella recalculada sobre el archivo que el
 * verificador tiene a la mano. Si no se aporta, la integridad del documento
 * queda como «no verificable»: el manifiesto por sí solo nunca puede
 * demostrar que el archivo que usted tiene es el que se firmó.
 */
export async function verificarManifiesto(
  crudo: unknown,
  huellaDocumento?: string,
): Promise<Veredicto> {
  const analisis = EsquemaManifiesto.safeParse(crudo);
  if (!analisis.success) {
    return {
      valido: false,
      comprobaciones: [],
      manifiesto: null,
      errorEstructura: analisis.error.issues
        .map((i) => `${i.path.join('.') || 'raíz'}: ${i.message}`)
        .join(' · '),
    };
  }

  const m = analisis.data;
  const comprobaciones: Comprobacion[] = [];

  // 1. Versión reconocida.
  comprobaciones.push({
    id: 'version',
    rotulo: 'Versión del manifiesto reconocida',
    resultado: m.version === VERSION_MANIFIESTO ? 'cumple' : 'falla',
    detalle:
      m.version === VERSION_MANIFIESTO
        ? `Versión ${m.version}.`
        : `Versión ${m.version}; esta aplicación verifica la ${VERSION_MANIFIESTO}.`,
    norma: '—',
  });

  // 2. El identificador declarado corresponde a la clave pública incluida.
  const identificadorReal = await identificarClave(m.clavePublica);
  comprobaciones.push({
    id: 'clave',
    rotulo: 'El identificador corresponde a la clave pública',
    resultado: identificadorReal === m.identificadorClave ? 'cumple' : 'falla',
    detalle:
      identificadorReal === m.identificadorClave
        ? 'La huella de la clave pública coincide con la declarada.'
        : 'La huella declarada no corresponde a la clave incluida: el manifiesto fue manipulado.',
    norma: 'Ley 527 de 1999, art. 7',
  });

  // 3. Firma criptográfica sobre la carga canónica.
  const { firma: _firma, ...sinFirma } = m;
  const firmaValida = await verificar(m.clavePublica, cargaFirmable(sinFirma), m.firma);
  comprobaciones.push({
    id: 'firma',
    rotulo: 'La firma corresponde al contenido del manifiesto',
    resultado: firmaValida ? 'cumple' : 'falla',
    detalle: firmaValida
      ? 'La firma ECDSA P-256 verifica contra la clave pública del manifiesto.'
      : 'La firma no verifica: el manifiesto cambió después de firmarse, o la clave no es la que firmó.',
    norma: 'Ley 527 de 1999, arts. 7 y 8',
  });

  // 4. Integridad del documento, solo si hay documento para comparar.
  comprobaciones.push({
    id: 'documento',
    rotulo: 'El documento aportado es el que se firmó',
    resultado:
      huellaDocumento === undefined
        ? 'noVerificable'
        : huellaDocumento === m.documento.huellaSha256
          ? 'cumple'
          : 'falla',
    detalle:
      huellaDocumento === undefined
        ? 'No se aportó el documento. El manifiesto por sí solo no puede demostrar qué archivo se firmó.'
        : huellaDocumento === m.documento.huellaSha256
          ? 'La huella SHA-256 del archivo coincide con la registrada en el manifiesto.'
          : 'La huella del archivo no coincide: el documento no es el que se firmó, o fue modificado.',
    norma: 'Ley 527 de 1999, art. 8',
  });

  // 5. Sello de tiempo coherente.
  const sello = new Date(m.selloTiempo);
  const selloValido = !Number.isNaN(sello.getTime());
  comprobaciones.push({
    id: 'sello',
    rotulo: 'El sello de tiempo es legible y está dentro del manifiesto firmado',
    resultado: selloValido ? 'cumple' : 'falla',
    detalle: selloValido
      ? `Declarado: ${sello.toISOString()}. Lo fija el equipo que firmó y va dentro de lo firmado, de modo que no se puede alterar sin romper la firma. No proviene de una autoridad de sellado de tiempo.`
      : 'El sello de tiempo no es una fecha válida.',
    norma: 'Ley 527 de 1999, art. 11',
  });

  const valido = comprobaciones.every((c) => c.resultado !== 'falla');

  return { valido, comprobaciones, manifiesto: m, errorEstructura: null };
}

/* ══ Criterios de la Ley 527 ═════════════════════════════════════ */

export interface Criterio {
  readonly id: string;
  readonly rotulo: string;
  readonly norma: string;
  /** `true` si el método de esta herramienta lo satisface. */
  readonly satisfecho: boolean;
  readonly explicacion: string;
}

/**
 * Qué acredita este método y qué no. Es el corazón honesto de la herramienta:
 * una firma electrónica bien construida prueba integridad y vínculo con una
 * clave, pero **no** identidad civil ni fecha cierta oponible a terceros.
 */
export const CRITERIOS: readonly Criterio[] = [
  {
    id: 'integridad',
    rotulo: 'Integridad del mensaje de datos',
    norma: 'Ley 527 de 1999, art. 8',
    satisfecho: true,
    explicacion:
      'La huella SHA-256 del documento va dentro de lo firmado. Cambiar un solo byte del archivo hace que la verificación falle. Esto es exactamente lo que el artículo 8 exige para tener por conservado el original.',
  },
  {
    id: 'vinculo-clave',
    rotulo: 'Vínculo entre la firma y una clave determinada',
    norma: 'Ley 527 de 1999, art. 7 · Decreto 2364 de 2012',
    satisfecho: true,
    explicacion:
      'La firma solo puede generarse con la clave privada correspondiente a la pública del manifiesto. Cualquiera puede comprobarlo sin intervención de esta aplicación.',
  },
  {
    id: 'consulta-posterior',
    rotulo: 'Accesibilidad para consulta posterior',
    norma: 'Ley 527 de 1999, art. 6',
    satisfecho: true,
    explicacion:
      'El manifiesto es un archivo JSON legible, con formato documentado y verificable con cualquier biblioteca criptográfica estándar. No depende de este programa.',
  },
  {
    id: 'identidad',
    rotulo: 'Identidad civil del firmante',
    norma: 'Decreto 2364 de 2012 · Ley 527 de 1999, art. 28',
    satisfecho: false,
    explicacion:
      'Esta herramienta NO acredita quién es la persona detrás de la clave. El nombre del manifiesto lo escribe quien firma. Para vincular una clave a una identidad civil se requiere un certificado emitido por una entidad de certificación digital acreditada ante la ONAC.',
  },
  {
    id: 'fecha-cierta',
    rotulo: 'Fecha cierta oponible a terceros',
    norma: 'Ley 527 de 1999, art. 11',
    satisfecho: false,
    explicacion:
      'El sello de tiempo lo pone el reloj del equipo que firma. Está protegido contra alteración posterior —va dentro de lo firmado—, pero no proviene de una autoridad de sellado de tiempo y no es oponible a un tercero que discuta la fecha.',
  },
  {
    id: 'no-repudio',
    rotulo: 'No repudio pleno',
    norma: 'Ley 527 de 1999, art. 7 · Decreto 2364 de 2012, art. 3',
    satisfecho: false,
    explicacion:
      'El no repudio exige que la clave esté bajo control exclusivo del firmante y que ese control sea demostrable. Una clave guardada en el navegador no satisface ese estándar por sí sola: requiere política de custodia, doble factor o un dispositivo seguro.',
  },
] as const;

export function resumenCriterios(): { satisfechos: number; total: number } {
  return {
    satisfechos: CRITERIOS.filter((c) => c.satisfecho).length,
    total: CRITERIOS.length,
  };
}

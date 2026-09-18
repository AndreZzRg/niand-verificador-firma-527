/**
 * Primitivas criptográficas sobre la WebCrypto del navegador.
 *
 * Se usa ECDSA sobre la curva P-256 con SHA-256: es lo que toda WebCrypto
 * implementa, produce firmas cortas y no requiere ninguna dependencia externa.
 *
 * Qué prueba y qué no. Una firma generada aquí prueba dos cosas: que el
 * documento no cambió desde que se firmó (integridad) y que quien firmó tenía
 * la clave privada correspondiente a la pública del manifiesto (atribución a
 * esa clave). **No prueba la identidad civil del firmante**: para eso hace
 * falta un certificado emitido por una entidad de certificación acreditada
 * ante la ONAC, en los términos del Decreto 2364 de 2012. La distinción está
 * documentada en la propia aplicación y no se disimula.
 */

const ALGORITMO = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const FIRMA = { name: 'ECDSA', hash: { name: 'SHA-256' } } as const;

/* ── Codificación ─────────────────────────────────────────────────── */

export function aHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function desdeHex(hex: string): Uint8Array {
  const limpio = hex.trim().toLowerCase();
  if (limpio.length % 2 !== 0 || /[^0-9a-f]/.test(limpio)) {
    throw new RangeError('La cadena no es hexadecimal válida.');
  }
  const bytes = new Uint8Array(limpio.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(limpio.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function aBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}

export function desdeBase64(texto: string): Uint8Array {
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/* ── Huella ───────────────────────────────────────────────────────── */

/** SHA-256 de un texto, en hexadecimal. */
export async function huellaTexto(texto: string): Promise<string> {
  return aHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
}

/** SHA-256 de datos binarios, en hexadecimal. */
export async function huellaBinaria(datos: ArrayBuffer | Uint8Array): Promise<string> {
  const vista = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  // Se copia a un ArrayBuffer propio para no depender del desplazamiento de la vista.
  const copia = new Uint8Array(vista.byteLength);
  copia.set(vista);
  return aHex(await crypto.subtle.digest('SHA-256', copia.buffer));
}

/** Agrupa una huella en bloques de cuatro para poder leerla en voz alta. */
export function huellaLegible(hex: string): string {
  return (hex.match(/.{1,4}/g) ?? []).join(' ');
}

/* ── Claves ───────────────────────────────────────────────────────── */

/**
 * Clave pública en formato JWK, con los campos que esta aplicación exige.
 * Se declara de forma estrecha —y no como `JsonWebKey`— porque el manifiesto
 * la valida con Zod y ambos tipos deben coincidir exactamente.
 */
export interface ClavePublicaJWK {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
  ext?: boolean;
  key_ops?: string[];
}

export interface ParDeClaves {
  readonly publica: ClavePublicaJWK;
  readonly privada: JsonWebKey;
  /** Huella de la clave pública: identifica el par sin revelar nada. */
  readonly identificador: string;
}

export async function generarPar(): Promise<ParDeClaves> {
  const par = await crypto.subtle.generateKey(ALGORITMO, true, ['sign', 'verify']);
  // `exportKey` devuelve el `JsonWebKey` amplio del DOM; para una clave EC
  // P-256 recién generada, los campos obligatorios están siempre presentes.
  const publica = (await crypto.subtle.exportKey('jwk', par.publicKey)) as ClavePublicaJWK;
  const privada = await crypto.subtle.exportKey('jwk', par.privateKey);
  return { publica, privada, identificador: await identificarClave(publica) };
}

/**
 * Identificador de una clave pública: SHA-256 de sus coordenadas, en la forma
 * canónica de la huella JWK (RFC 7638).
 */
export async function identificarClave(publica: ClavePublicaJWK): Promise<string> {
  const canonica = JSON.stringify({
    crv: publica.crv,
    kty: publica.kty,
    x: publica.x,
    y: publica.y,
  });
  return huellaTexto(canonica);
}

async function importarPrivada(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, ALGORITMO, false, ['sign']);
}

async function importarPublica(jwk: JsonWebKey): Promise<CryptoKey> {
  // La clave exportada trae `key_ops` de firma; al importar solo se verifica.
  const { d: _d, key_ops: _ops, ...publica } = jwk as JsonWebKey & { d?: string };
  return crypto.subtle.importKey('jwk', { ...publica, key_ops: ['verify'] }, ALGORITMO, true, [
    'verify',
  ]);
}

/* ── Firma y verificación ─────────────────────────────────────────── */

/** Firma un texto y devuelve la firma en base64. */
export async function firmar(privada: JsonWebKey, texto: string): Promise<string> {
  const clave = await importarPrivada(privada);
  const firma = await crypto.subtle.sign(FIRMA, clave, new TextEncoder().encode(texto));
  return aBase64(firma);
}

/** Verifica una firma en base64 sobre un texto. */
export async function verificar(
  publica: ClavePublicaJWK,
  texto: string,
  firmaBase64: string,
): Promise<boolean> {
  try {
    const clave = await importarPublica(publica);
    const firma = desdeBase64(firmaBase64);
    return await crypto.subtle.verify(
      FIRMA,
      clave,
      firma as unknown as ArrayBuffer,
      new TextEncoder().encode(texto),
    );
  } catch {
    // Una firma malformada, una clave inválida o un base64 corrupto no son un
    // error del programa: son, simplemente, una verificación fallida.
    return false;
  }
}

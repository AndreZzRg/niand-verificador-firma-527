import { describe, expect, it } from 'vitest';

import {
  aBase64,
  aHex,
  desdeBase64,
  desdeHex,
  firmar,
  generarPar,
  huellaBinaria,
  huellaLegible,
  huellaTexto,
  identificarClave,
  verificar,
} from '../lib/cripto';
import {
  CRITERIOS,
  VERSION_MANIFIESTO,
  cargaFirmable,
  resumenCriterios,
  verificarManifiesto,
  type Manifiesto,
} from './manifiesto';

const DOCUMENTO = 'Contrato de prestación de servicios — cláusula primera: objeto.';

async function manifiestoDePrueba(overrides: Partial<Manifiesto> = {}): Promise<Manifiesto> {
  const par = await generarPar();
  const sinFirma: Omit<Manifiesto, 'firma'> = {
    version: VERSION_MANIFIESTO,
    documento: {
      nombre: 'contrato.txt',
      bytes: DOCUMENTO.length,
      huellaSha256: await huellaTexto(DOCUMENTO),
    },
    firmante: { nombre: 'Persona firmante', identificacion: 'CC 1.000.000', rol: 'Representante' },
    proposito: 'Aceptación del contrato',
    selloTiempo: '2026-09-17T14:30:00.000Z',
    clavePublica: par.publica,
    identificadorClave: par.identificador,
    algoritmo: 'ECDSA-P256-SHA256',
    ...overrides,
  };
  return { ...sinFirma, firma: await firmar(par.privada, cargaFirmable(sinFirma)) };
}

/* ══ Codificación ══ */

describe('codificación', () => {
  it('convierte a hexadecimal y de vuelta', () => {
    const bytes = new Uint8Array([0, 1, 15, 16, 127, 128, 255]);
    expect(aHex(bytes)).toBe('00010f107f80ff');
    expect([...desdeHex('00010f107f80ff')]).toEqual([...bytes]);
  });

  it('rechaza hexadecimal malformado', () => {
    expect(() => desdeHex('abc')).toThrow(RangeError);
    expect(() => desdeHex('zz')).toThrow(RangeError);
  });

  it('convierte a base64 y de vuelta', () => {
    const bytes = new Uint8Array([72, 111, 108, 97]);
    expect(aBase64(bytes)).toBe('SG9sYQ==');
    expect([...desdeBase64('SG9sYQ==')]).toEqual([...bytes]);
  });
});

/* ══ Huellas ══ */

describe('huella SHA-256', () => {
  it('reproduce el vector conocido de la cadena vacía', async () => {
    expect(await huellaTexto('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('reproduce el vector conocido de "abc"', async () => {
    expect(await huellaTexto('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('coincide entre la versión de texto y la binaria', async () => {
    const bytes = new TextEncoder().encode('mensaje de datos');
    expect(await huellaBinaria(bytes)).toBe(await huellaTexto('mensaje de datos'));
  });

  it('cambia por completo ante un byte distinto', async () => {
    expect(await huellaTexto('contrato')).not.toBe(await huellaTexto('contrato '));
  });

  it('agrupa la huella en bloques legibles', () => {
    expect(huellaLegible('abcd1234')).toBe('abcd 1234');
  });
});

/* ══ Claves y firma ══ */

describe('claves ECDSA P-256', () => {
  it('genera pares distintos en cada llamada', async () => {
    const a = await generarPar();
    const b = await generarPar();
    expect(a.identificador).not.toBe(b.identificador);
  });

  it('deriva el identificador de las coordenadas de la clave pública', async () => {
    const par = await generarPar();
    expect(par.identificador).toMatch(/^[0-9a-f]{64}$/);
    expect(await identificarClave(par.publica)).toBe(par.identificador);
  });

  it('no incluye la componente privada en la clave pública', async () => {
    const par = await generarPar();
    expect(par.publica).not.toHaveProperty('d');
    expect(par.privada).toHaveProperty('d');
  });
});

describe('firma y verificación', () => {
  it('verifica una firma legítima', async () => {
    const par = await generarPar();
    const firma = await firmar(par.privada, DOCUMENTO);
    expect(await verificar(par.publica, DOCUMENTO, firma)).toBe(true);
  });

  it('rechaza la firma cuando el texto cambió', async () => {
    const par = await generarPar();
    const firma = await firmar(par.privada, DOCUMENTO);
    expect(await verificar(par.publica, `${DOCUMENTO} `, firma)).toBe(false);
  });

  it('rechaza la firma verificada con otra clave', async () => {
    const a = await generarPar();
    const b = await generarPar();
    const firma = await firmar(a.privada, DOCUMENTO);
    expect(await verificar(b.publica, DOCUMENTO, firma)).toBe(false);
  });

  it('devuelve falso ante una firma malformada en vez de lanzar', async () => {
    const par = await generarPar();
    expect(await verificar(par.publica, DOCUMENTO, 'no-es-base64-válido!!')).toBe(false);
    expect(await verificar(par.publica, DOCUMENTO, '')).toBe(false);
  });
});

/* ══ Carga canónica ══ */

describe('carga firmable', () => {
  it('es estable frente al orden de las propiedades', async () => {
    const m = await manifiestoDePrueba();
    const { firma: _f, ...sinFirma } = m;
    const reordenado = {
      algoritmo: sinFirma.algoritmo,
      identificadorClave: sinFirma.identificadorClave,
      clavePublica: sinFirma.clavePublica,
      selloTiempo: sinFirma.selloTiempo,
      proposito: sinFirma.proposito,
      firmante: sinFirma.firmante,
      documento: sinFirma.documento,
      version: sinFirma.version,
    };
    expect(cargaFirmable(reordenado)).toBe(cargaFirmable(sinFirma));
  });

  it('cambia si cambia cualquier dato firmado', async () => {
    const m = await manifiestoDePrueba();
    const { firma: _f, ...sinFirma } = m;
    const alterado = { ...sinFirma, proposito: 'otro propósito' };
    expect(cargaFirmable(alterado)).not.toBe(cargaFirmable(sinFirma));
  });
});

/* ══ Verificación del manifiesto ══ */

describe('verificación del manifiesto', () => {
  it('acepta un manifiesto íntegro con su documento', async () => {
    const m = await manifiestoDePrueba();
    const v = await verificarManifiesto(m, await huellaTexto(DOCUMENTO));
    expect(v.valido).toBe(true);
    expect(v.errorEstructura).toBeNull();
    expect(v.comprobaciones.every((c) => c.resultado === 'cumple')).toBe(true);
  });

  it('marca la integridad del documento como no verificable si no se aporta', async () => {
    const m = await manifiestoDePrueba();
    const v = await verificarManifiesto(m);
    const doc = v.comprobaciones.find((c) => c.id === 'documento')!;
    expect(doc.resultado).toBe('noVerificable');
    expect(doc.detalle).toMatch(/no puede demostrar qué archivo se firmó/);
    // No verificable no es fallo: el manifiesto sigue siendo válido en sí mismo.
    expect(v.valido).toBe(true);
  });

  it('detecta que el documento aportado no es el firmado', async () => {
    const m = await manifiestoDePrueba();
    const v = await verificarManifiesto(m, await huellaTexto('otro documento'));
    expect(v.valido).toBe(false);
    expect(v.comprobaciones.find((c) => c.id === 'documento')!.resultado).toBe('falla');
  });

  it('detecta la alteración del propósito', async () => {
    const m = await manifiestoDePrueba();
    const v = await verificarManifiesto({ ...m, proposito: 'Propósito cambiado' });
    expect(v.valido).toBe(false);
    expect(v.comprobaciones.find((c) => c.id === 'firma')!.resultado).toBe('falla');
  });

  it('detecta la alteración del nombre del firmante', async () => {
    const m = await manifiestoDePrueba();
    const v = await verificarManifiesto({
      ...m,
      firmante: { ...m.firmante, nombre: 'Otra persona' },
    });
    expect(v.comprobaciones.find((c) => c.id === 'firma')!.resultado).toBe('falla');
  });

  it('detecta la alteración del sello de tiempo', async () => {
    const m = await manifiestoDePrueba();
    const v = await verificarManifiesto({ ...m, selloTiempo: '2020-01-01T00:00:00.000Z' });
    expect(v.comprobaciones.find((c) => c.id === 'firma')!.resultado).toBe('falla');
  });

  it('detecta un identificador de clave que no corresponde', async () => {
    const m = await manifiestoDePrueba();
    const v = await verificarManifiesto({ ...m, identificadorClave: 'f'.repeat(64) });
    expect(v.comprobaciones.find((c) => c.id === 'clave')!.resultado).toBe('falla');
  });

  it('rechaza un manifiesto con estructura inválida', async () => {
    const v = await verificarManifiesto({ version: 1, documento: { nombre: 'x' } });
    expect(v.valido).toBe(false);
    expect(v.manifiesto).toBeNull();
    expect(v.errorEstructura).toBeTruthy();
  });

  it('rechaza cualquier cosa que no sea un objeto', async () => {
    expect((await verificarManifiesto(null)).valido).toBe(false);
    expect((await verificarManifiesto('texto')).valido).toBe(false);
    expect((await verificarManifiesto(42)).valido).toBe(false);
  });

  it('rechaza una huella de documento con formato inválido', async () => {
    const m = await manifiestoDePrueba();
    const v = await verificarManifiesto({
      ...m,
      documento: { ...m.documento, huellaSha256: 'no-es-una-huella' },
    });
    expect(v.errorEstructura).toMatch(/huellaSha256/);
  });

  it('señala una versión de manifiesto desconocida', async () => {
    const m = await manifiestoDePrueba();
    const v = await verificarManifiesto({ ...m, version: 99 });
    expect(v.comprobaciones.find((c) => c.id === 'version')!.resultado).toBe('falla');
  });
});

/* ══ Criterios de la Ley 527 ══ */

describe('criterios de la Ley 527 de 1999', () => {
  it('declara norma y explicación en cada criterio', () => {
    for (const c of CRITERIOS) {
      expect(c.norma, c.id).toMatch(/Ley 527|Decreto 2364/);
      expect(c.explicacion.length, c.id).toBeGreaterThan(60);
    }
  });

  it('reconoce que integridad y vínculo con la clave sí se satisfacen', () => {
    expect(CRITERIOS.find((c) => c.id === 'integridad')!.satisfecho).toBe(true);
    expect(CRITERIOS.find((c) => c.id === 'vinculo-clave')!.satisfecho).toBe(true);
  });

  it('reconoce con franqueza lo que el método NO acredita', () => {
    // Es la regla de veracidad de la firma: no vender una firma electrónica
    // como si fuera una firma digital certificada.
    for (const id of ['identidad', 'fecha-cierta', 'no-repudio']) {
      const c = CRITERIOS.find((x) => x.id === id)!;
      expect(c.satisfecho, id).toBe(false);
    }
    expect(CRITERIOS.find((c) => c.id === 'identidad')!.explicacion).toMatch(/ONAC/);
  });

  it('resume cuántos criterios se satisfacen', () => {
    const r = resumenCriterios();
    expect(r.total).toBe(CRITERIOS.length);
    expect(r.satisfechos).toBe(3);
    expect(r.satisfechos).toBeLessThan(r.total);
  });
});

/**
 * Módulo «Criterios Ley 527»: qué acredita este método y qué no.
 *
 * Es el módulo que justifica la existencia de la herramienta. Una firma
 * electrónica vendida como firma digital certificada es el error que este
 * repositorio existe para no cometer.
 */
import { CircleCheck, CircleX } from 'lucide-react';

import { Dato, Insignia, Llamado, Tabla, Tarjeta, Td, Th } from '../brand/ui';
import { CRITERIOS, resumenCriterios } from '../domain/manifiesto';

export function PanelCriterios() {
  const { satisfechos, total } = resumenCriterios();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Dato rotulo="Criterios evaluados" valor={total} />
        <Dato rotulo="Satisfechos por este método" valor={satisfechos} tono="ok" />
        <Dato
          rotulo="No satisfechos"
          valor={total - satisfechos}
          tono="alerta"
          detalle="Se declaran de forma expresa"
        />
      </div>

      <Llamado tono="marca" titulo="Firma electrónica y firma digital no son lo mismo">
        La <strong>firma electrónica</strong> del Decreto 2364 de 2012 es cualquier método confiable
        y apropiado que permita identificar al iniciador. La{' '}
        <strong>firma digital certificada</strong> del artículo 28 de la Ley 527 requiere, además,
        un certificado emitido por una entidad de certificación acreditada ante la ONAC. Esta
        herramienta produce lo primero, no lo segundo, y lo dice en cada pantalla.
      </Llamado>

      <Tarjeta titulo="Criterio por criterio">
        <ul className="space-y-3">
          {CRITERIOS.map((c) => (
            <li
              key={c.id}
              className={
                c.satisfecho
                  ? 'flex gap-3 rounded-xl border border-senal/35 bg-senal/6 p-4'
                  : 'flex gap-3 rounded-xl border border-alerta/35 bg-alerta/6 p-4'
              }
            >
              {c.satisfecho ? (
                <CircleCheck
                  size={19}
                  className="mt-0.5 shrink-0 text-senal-hondo dark:text-senal-suave"
                />
              ) : (
                <CircleX size={19} className="mt-0.5 shrink-0 text-alerta" />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-sm font-semibold">{c.rotulo}</h3>
                  <Insignia tono={c.satisfecho ? 'ok' : 'riesgo'}>
                    {c.satisfecho ? 'sí acredita' : 'no acredita'}
                  </Insignia>
                </div>
                <p className="mt-1.5 text-sm text-texto-2">{c.explicacion}</p>
                <p className="eyebrow mt-1.5">{c.norma}</p>
              </div>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta
        titulo="Cómo se verifica sin esta aplicación"
        descripcion="La independencia del verificador es parte del valor probatorio."
      >
        <ol className="space-y-2 text-sm text-texto-2">
          {[
            'Calcule el SHA-256 del documento y compárelo con documento.huellaSha256 del manifiesto.',
            'Reconstruya la carga canónica: el manifiesto sin el campo firma, serializado en el orden documentado.',
            'Importe clavePublica como JWK EC P-256.',
            'Verifique el campo firma (base64) sobre esa carga, con ECDSA y SHA-256.',
            'Compruebe que identificadorClave sea el SHA-256 de {crv, kty, x, y} en ese orden.',
          ].map((paso, i) => (
            <li key={paso} className="flex gap-3">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-marca font-mono text-[0.65rem] font-semibold text-marca-contraste">
                {i + 1}
              </span>
              {paso}
            </li>
          ))}
        </ol>

        <div className="mt-5">
          <Tabla>
            <thead>
              <tr>
                <Th>Elemento</Th>
                <Th>Valor</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Curva', 'NIST P-256 (secp256r1)'],
                ['Algoritmo de firma', 'ECDSA'],
                ['Función de resumen', 'SHA-256'],
                ['Formato de la clave', 'JWK (RFC 7517)'],
                ['Codificación de la firma', 'base64 sobre el par (r, s) crudo, 64 bytes'],
                ['Formato del manifiesto', 'JSON UTF-8, versión 1'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <Td className="font-medium">{k}</Td>
                  <Td className="font-mono text-xs">{v}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </div>
      </Tarjeta>
    </div>
  );
}

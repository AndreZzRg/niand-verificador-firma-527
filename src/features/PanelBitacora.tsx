/**
 * Módulo «Bitácora»: historial local de firmas producidas en este navegador.
 */
import { Download, Eraser } from 'lucide-react';

import { Boton, Dato, Llamado, Tabla, Tarjeta, Td, Th, Vacio } from '../brand/ui';
import { huellaLegible } from '../lib/cripto';
import { exportarCSV } from '../lib/exportar';
import { useEstado } from '../store';

export function PanelBitacora() {
  const { bitacora, limpiarBitacora } = useEstado();

  if (bitacora.length === 0) {
    return (
      <Vacio titulo="Aún no ha firmado nada en este navegador">
        Cada firma que produzca en el módulo <strong>Firmar documento</strong> queda registrada
        aquí, solo en este equipo.
      </Vacio>
    );
  }

  const claves = new Set(bitacora.map((r) => r.identificadorClave));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Dato rotulo="Firmas producidas" valor={bitacora.length} tono="marca" />
        <Dato rotulo="Claves utilizadas" valor={claves.size} />
        <Dato
          rotulo="Primera firma"
          valor={new Date(bitacora.at(-1)!.selloTiempo).toLocaleDateString('es-CO')}
        />
      </div>

      <Tarjeta
        titulo="Historial de firmas"
        descripcion="Solo registra lo firmado en este navegador."
        acciones={
          <>
            <Boton
              variante="secundario"
              tamano="sm"
              onClick={() =>
                exportarCSV(
                  [
                    [
                      'Radicado',
                      'Documento',
                      'Huella SHA-256',
                      'Firmante',
                      'Propósito',
                      'Sello de tiempo',
                      'Clave',
                    ],
                    ...bitacora.map((r) => [
                      r.radicado,
                      r.documento,
                      r.huella,
                      r.firmante,
                      r.proposito,
                      r.selloTiempo,
                      r.identificadorClave,
                    ]),
                  ],
                  'bitacora-firmas',
                )
              }
            >
              <Download size={14} /> CSV
            </Boton>
            <Boton variante="fantasma" tamano="sm" onClick={limpiarBitacora}>
              <Eraser size={14} /> Limpiar
            </Boton>
          </>
        }
      >
        <Tabla>
          <thead>
            <tr>
              <Th>Radicado</Th>
              <Th>Documento</Th>
              <Th>Firmante</Th>
              <Th>Sello de tiempo</Th>
            </tr>
          </thead>
          <tbody>
            {bitacora.map((r) => (
              <tr key={r.id}>
                <Td className="font-mono text-xs">{r.radicado}</Td>
                <Td>
                  <span className="font-medium break-all">{r.documento}</span>
                  <span
                    className="block font-mono text-[0.65rem] text-texto-3"
                    title={huellaLegible(r.huella)}
                  >
                    {r.huella.slice(0, 16)}…
                  </span>
                </Td>
                <Td>
                  <span className="text-sm">{r.firmante}</span>
                  <span className="block text-xs text-texto-3">{r.proposito}</span>
                </Td>
                <Td className="text-xs">{new Date(r.selloTiempo).toLocaleString('es-CO')}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Tarjeta>

      <Llamado tono="alerta" titulo="Esta bitácora no es la evidencia">
        La evidencia es el par documento + manifiesto. Esta lista solo le ayuda a recordar qué
        firmó: vive en el almacenamiento de este navegador y se pierde si lo borra. Conserve los
        manifiestos descargados.
      </Llamado>
    </div>
  );
}

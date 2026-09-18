/**
 * Módulo «Firmar documento»: produce el manifiesto de firma.
 */
import { useState } from 'react';
import { Download, FileSignature, Upload } from 'lucide-react';

import { Boton, Campo, Entrada, Insignia, Llamado, Tarjeta, Vacio } from '../brand/ui';
import { VERSION_MANIFIESTO, cargaFirmable, type Manifiesto } from '../domain/manifiesto';
import { firmar, huellaBinaria, huellaLegible } from '../lib/cripto';
import { exportarJSON } from '../lib/exportar';
import { useEstado } from '../store';

export function PanelFirmar() {
  const { claves, firmante, setFirmante, registrar } = useEstado();
  const [archivo, setArchivo] = useState<{ nombre: string; bytes: number; huella: string } | null>(
    null,
  );
  const [proposito, setProposito] = useState('Aceptación del contenido del documento');
  const [manifiesto, setManifiesto] = useState<Manifiesto | null>(null);
  const [firmando, setFirmando] = useState(false);

  if (!claves) {
    return (
      <Vacio titulo="Todavía no hay un par de claves">
        Vaya al módulo <strong>Gestión de claves</strong> y genere uno. Sin clave privada no se
        puede firmar.
      </Vacio>
    );
  }

  const cargar = async (f: File) => {
    const datos = new Uint8Array(await f.arrayBuffer());
    setArchivo({ nombre: f.name, bytes: f.size, huella: await huellaBinaria(datos) });
    setManifiesto(null);
  };

  const ejecutar = async () => {
    if (!archivo) return;
    setFirmando(true);
    try {
      const sinFirma: Omit<Manifiesto, 'firma'> = {
        version: VERSION_MANIFIESTO,
        documento: { nombre: archivo.nombre, bytes: archivo.bytes, huellaSha256: archivo.huella },
        firmante: { ...firmante },
        proposito,
        selloTiempo: new Date().toISOString(),
        clavePublica: claves.publica,
        identificadorClave: claves.identificador,
        algoritmo: 'ECDSA-P256-SHA256',
      };
      const m: Manifiesto = {
        ...sinFirma,
        firma: await firmar(claves.privada, cargaFirmable(sinFirma)),
      };
      setManifiesto(m);
      registrar(m);
    } finally {
      setFirmando(false);
    }
  };

  const listo = archivo !== null && firmante.nombre.trim().length > 2;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Tarjeta titulo="Documento y firmante">
        <div className="space-y-5">
          <div>
            <label
              htmlFor="archivo"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-borde-fuerte px-6 py-10 text-center transition-colors hover:border-marca"
            >
              <Upload size={24} className="text-marca" />
              <span className="text-sm font-medium">
                {archivo ? archivo.nombre : 'Elija el documento a firmar'}
              </span>
              <span className="text-xs text-texto-3">
                El archivo no se sube a ninguna parte: solo se calcula su huella en su navegador.
              </span>
            </label>
            <input
              id="archivo"
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void cargar(f);
              }}
            />
          </div>

          {archivo && (
            <div className="rounded-xl border border-borde bg-superficie-3 p-4">
              <p className="eyebrow">Huella SHA-256 del documento</p>
              <p className="mt-1 font-mono text-xs leading-relaxed break-all">
                {huellaLegible(archivo.huella)}
              </p>
              <p className="mt-2 text-xs text-texto-3">
                {archivo.bytes.toLocaleString('es-CO')} bytes
              </p>
            </div>
          )}

          <Campo etiqueta="Nombre del firmante" requerido ayuda="Lo escribe usted: no se verifica.">
            {(id) => (
              <Entrada
                id={id}
                value={firmante.nombre}
                onChange={(e) => setFirmante({ nombre: e.target.value })}
              />
            )}
          </Campo>
          <Campo etiqueta="Identificación">
            {(id) => (
              <Entrada
                id={id}
                value={firmante.identificacion}
                placeholder="CC 1.000.000"
                onChange={(e) => setFirmante({ identificacion: e.target.value })}
              />
            )}
          </Campo>
          <Campo etiqueta="Rol o calidad">
            {(id) => (
              <Entrada
                id={id}
                value={firmante.rol}
                placeholder="Representante legal"
                onChange={(e) => setFirmante({ rol: e.target.value })}
              />
            )}
          </Campo>
          <Campo
            etiqueta="Propósito de la firma"
            ayuda="Va dentro de lo firmado y no se puede alterar."
          >
            {(id) => (
              <Entrada id={id} value={proposito} onChange={(e) => setProposito(e.target.value)} />
            )}
          </Campo>

          <Boton disabled={!listo || firmando} onClick={() => void ejecutar()}>
            <FileSignature size={15} /> {firmando ? 'Firmando…' : 'Firmar documento'}
          </Boton>
        </div>
      </Tarjeta>

      <div className="space-y-6">
        <Llamado tono="alerta" titulo="Qué está firmando exactamente">
          La firma cubre la <strong>huella</strong> del documento, no el documento. Quien verifique
          necesita el archivo original para comprobar que es el mismo. Conserve siempre los dos
          juntos: el documento y su manifiesto.
        </Llamado>

        {manifiesto ? (
          <Tarjeta
            titulo="Manifiesto de firma"
            descripcion="Guárdelo junto al documento."
            acciones={
              <Boton
                variante="secundario"
                tamano="sm"
                onClick={() =>
                  exportarJSON(manifiesto, `manifiesto-${manifiesto.documento.nombre}`)
                }
              >
                <Download size={14} /> Descargar
              </Boton>
            }
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <Insignia tono="ok">Firmado</Insignia>
              <Insignia tono="info">ECDSA P-256 · SHA-256</Insignia>
              <Insignia tono="neutro">
                {new Date(manifiesto.selloTiempo).toLocaleString('es-CO')}
              </Insignia>
            </div>
            <pre className="max-h-96 overflow-auto rounded-xl border border-borde bg-superficie-3 p-4 font-mono text-xs whitespace-pre-wrap">
              {JSON.stringify(manifiesto, null, 2)}
            </pre>
          </Tarjeta>
        ) : (
          <Vacio titulo="Aún no hay manifiesto">
            Elija un documento, complete el nombre del firmante y firme. El manifiesto aparecerá
            aquí listo para descargar.
          </Vacio>
        )}
      </div>
    </div>
  );
}

/**
 * Módulo «Gestión de claves»: generación, respaldo y borrado del par.
 */
import { useRef, useState } from 'react';
import { Download, KeyRound, Trash2, Upload } from 'lucide-react';

import { Boton, Insignia, Llamado, Tarjeta, Vacio } from '../brand/ui';
import { huellaLegible, type ParDeClaves } from '../lib/cripto';
import { exportarJSON, leerArchivo } from '../lib/exportar';
import { useEstado } from '../store';

export function PanelClaves() {
  const { claves, generar, importar, olvidar } = useEstado();
  const archivo = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  const cargar = async (f: File) => {
    setError(null);
    try {
      const datos = JSON.parse(await leerArchivo(f)) as Partial<ParDeClaves>;
      if (!datos.publica || !datos.privada || !datos.identificador) {
        throw new Error('estructura');
      }
      importar(datos as ParDeClaves);
    } catch {
      setError('El archivo no contiene un par de claves con el formato de esta aplicación.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Llamado tono="riesgo" titulo="Dónde vive su clave privada">
        En el <strong>almacenamiento local de este navegador</strong>, en texto plano. Cualquiera
        con acceso a este equipo y a este perfil puede leerla y firmar en su nombre. Es suficiente
        para demostrar integridad y para un laboratorio; <strong>no lo es</strong> para el estándar
        de control exclusivo que exige el no repudio pleno del Decreto 2364 de 2012. Para eso hacen
        falta un dispositivo seguro o un certificado de entidad acreditada.
      </Llamado>

      {claves ? (
        <Tarjeta
          titulo="Par de claves activo"
          descripcion="ECDSA sobre la curva P-256"
          acciones={
            <>
              <Boton
                variante="secundario"
                tamano="sm"
                onClick={() => exportarJSON(claves, 'par-de-claves')}
              >
                <Download size={14} /> Respaldar
              </Boton>
              <Boton variante="peligro" tamano="sm" onClick={olvidar}>
                <Trash2 size={14} /> Olvidar
              </Boton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-borde bg-superficie-3 p-4">
              <p className="eyebrow">Identificador de la clave pública</p>
              <p className="mt-1 font-mono text-xs break-all">
                {huellaLegible(claves.identificador)}
              </p>
              <p className="mt-2 text-xs text-texto-3">
                Es la huella SHA-256 de las coordenadas de la clave. Identifica el par sin revelar
                nada, y va dentro de cada manifiesto que usted firme.
              </p>
            </div>

            <details>
              <summary className="cursor-pointer text-sm font-medium text-marca">
                Ver la clave pública (se puede compartir)
              </summary>
              <pre className="mt-2 overflow-auto rounded-xl border border-borde bg-superficie-3 p-4 font-mono text-xs">
                {JSON.stringify(claves.publica, null, 2)}
              </pre>
            </details>

            <div className="flex flex-wrap gap-2">
              <Insignia tono="ok">Lista para firmar</Insignia>
              <Insignia tono="info">P-256 · SHA-256</Insignia>
            </div>

            <p className="border-t border-borde pt-4 text-sm text-texto-2">
              <strong>«Olvidar»</strong> borra la clave de este navegador sin posibilidad de
              recuperación. Las firmas que ya produjo siguen siendo verificables —la clave pública
              viaja dentro de cada manifiesto—, pero no podrá firmar más con ese par. Respalde antes
              de borrar.
            </p>
          </div>
        </Tarjeta>
      ) : (
        <Vacio
          titulo="No hay par de claves en este navegador"
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <Boton
                disabled={generando}
                onClick={() => {
                  setGenerando(true);
                  void generar().finally(() => setGenerando(false));
                }}
              >
                <KeyRound size={15} /> {generando ? 'Generando…' : 'Generar par de claves'}
              </Boton>
              <Boton variante="secundario" onClick={() => archivo.current?.click()}>
                <Upload size={15} /> Restaurar respaldo
              </Boton>
            </div>
          }
        >
          El par se genera en su navegador con la WebCrypto del sistema. La clave privada no sale de
          aquí ni se envía a ninguna parte.
        </Vacio>
      )}

      <input
        ref={archivo}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void cargar(f);
          e.target.value = '';
        }}
      />

      {error && (
        <Llamado tono="riesgo" titulo="No se pudo restaurar">
          {error}
        </Llamado>
      )}
    </div>
  );
}

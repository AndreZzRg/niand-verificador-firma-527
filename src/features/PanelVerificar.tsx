/**
 * Módulo «Verificar manifiesto»: comprobación independiente de una firma.
 *
 * La verificación no consulta a nadie ni depende de esta aplicación: es
 * criptografía estándar que cualquiera puede repetir con otra herramienta.
 */
import { useState } from 'react';
import { CircleCheck, CircleX, CircleAlert, Upload } from 'lucide-react';

import { Boton, Insignia, Llamado, Tarjeta, Vacio, cx, type Tono } from '../brand/ui';
import { verificarManifiesto, type Veredicto } from '../domain/manifiesto';
import { huellaBinaria, huellaLegible } from '../lib/cripto';
import { leerArchivo } from '../lib/exportar';

const ICONO = {
  cumple: CircleCheck,
  falla: CircleX,
  noVerificable: CircleAlert,
} as const;

const TONO: Record<keyof typeof ICONO, Tono> = {
  cumple: 'ok',
  falla: 'riesgo',
  noVerificable: 'alerta',
};

export function PanelVerificar() {
  const [manifiestoCrudo, setManifiestoCrudo] = useState<unknown>(null);
  const [nombreManifiesto, setNombreManifiesto] = useState('');
  const [documento, setDocumento] = useState<{ nombre: string; huella: string } | null>(null);
  const [veredicto, setVeredicto] = useState<Veredicto | null>(null);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  const cargarManifiesto = async (f: File) => {
    setErrorLectura(null);
    setVeredicto(null);
    try {
      setManifiestoCrudo(JSON.parse(await leerArchivo(f)));
      setNombreManifiesto(f.name);
    } catch {
      setManifiestoCrudo(null);
      setErrorLectura(`«${f.name}» no es un archivo JSON legible.`);
    }
  };

  const cargarDocumento = async (f: File) => {
    const datos = new Uint8Array(await f.arrayBuffer());
    setDocumento({ nombre: f.name, huella: await huellaBinaria(datos) });
    setVeredicto(null);
  };

  const ejecutar = async () => {
    setVerificando(true);
    try {
      setVeredicto(await verificarManifiesto(manifiestoCrudo, documento?.huella));
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Caja
          id="manifiesto"
          titulo={nombreManifiesto || 'Manifiesto de firma (.json)'}
          detalle="Obligatorio"
          onArchivo={(f) => void cargarManifiesto(f)}
          accept="application/json,.json"
          cargado={manifiestoCrudo !== null}
        />
        <Caja
          id="documento"
          titulo={documento?.nombre ?? 'Documento firmado'}
          detalle="Opcional, pero sin él no se puede comprobar la integridad del archivo"
          onArchivo={(f) => void cargarDocumento(f)}
          cargado={documento !== null}
        />
      </div>

      {errorLectura && (
        <Llamado tono="riesgo" titulo="No se pudo leer el archivo">
          {errorLectura}
        </Llamado>
      )}

      {documento && (
        <Tarjeta>
          <p className="eyebrow">Huella calculada del documento aportado</p>
          <p className="mt-1 font-mono text-xs break-all">{huellaLegible(documento.huella)}</p>
        </Tarjeta>
      )}

      <Boton disabled={manifiestoCrudo === null || verificando} onClick={() => void ejecutar()}>
        {verificando ? 'Verificando…' : 'Verificar'}
      </Boton>

      {veredicto?.errorEstructura && (
        <Llamado tono="riesgo" titulo="El manifiesto no tiene la estructura esperada">
          <p>{veredicto.errorEstructura}</p>
          <p className="mt-2 text-xs">
            Un manifiesto válido incluye versión, documento con huella SHA-256, firmante, sello de
            tiempo, clave pública, identificador de clave, algoritmo y firma.
          </p>
        </Llamado>
      )}

      {veredicto && veredicto.comprobaciones.length > 0 && (
        <>
          <Llamado
            tono={veredicto.valido ? 'ok' : 'riesgo'}
            titulo={veredicto.valido ? 'Verificación superada' : 'Verificación fallida'}
          >
            {veredicto.valido
              ? 'Todas las comprobaciones que se pudieron hacer resultaron conformes. Revise abajo si alguna quedó como «no verificable».'
              : 'Al menos una comprobación falló. El manifiesto o el documento no son los originales.'}
          </Llamado>

          <Tarjeta titulo="Comprobaciones">
            <ul className="space-y-3">
              {veredicto.comprobaciones.map((c) => {
                const Icono = ICONO[c.resultado];
                return (
                  <li
                    key={c.id}
                    className={cx(
                      'flex gap-3 rounded-xl border p-4',
                      c.resultado === 'cumple'
                        ? 'border-senal/35 bg-senal/6'
                        : c.resultado === 'falla'
                          ? 'border-alerta/35 bg-alerta/6'
                          : 'border-ambar-suave/40 bg-ambar-suave/8',
                    )}
                  >
                    <Icono
                      size={18}
                      className={cx(
                        'mt-0.5 shrink-0',
                        c.resultado === 'cumple'
                          ? 'text-senal-hondo dark:text-senal-suave'
                          : c.resultado === 'falla'
                            ? 'text-alerta'
                            : 'text-ambar dark:text-ambar-suave',
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{c.rotulo}</p>
                        <Insignia tono={TONO[c.resultado]}>
                          {c.resultado === 'noVerificable' ? 'no verificable' : c.resultado}
                        </Insignia>
                      </div>
                      <p className="mt-1 text-sm text-texto-2">{c.detalle}</p>
                      {c.norma !== '—' && <p className="eyebrow mt-1">{c.norma}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>

          {veredicto.manifiesto && (
            <Tarjeta titulo="Datos declarados en el manifiesto">
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Documento', veredicto.manifiesto.documento.nombre],
                  ['Firmante declarado', veredicto.manifiesto.firmante.nombre],
                  ['Identificación declarada', veredicto.manifiesto.firmante.identificacion || '—'],
                  ['Rol declarado', veredicto.manifiesto.firmante.rol || '—'],
                  ['Propósito', veredicto.manifiesto.proposito],
                  [
                    'Sello de tiempo',
                    new Date(veredicto.manifiesto.selloTiempo).toLocaleString('es-CO'),
                  ],
                  ['Algoritmo', veredicto.manifiesto.algoritmo],
                ].map(([r, v]) => (
                  <div key={r} className="rounded-xl border border-borde bg-superficie-3 px-4 py-3">
                    <dt className="eyebrow">{r}</dt>
                    <dd className="mt-0.5 text-sm break-words">{v}</dd>
                  </div>
                ))}
              </dl>

              <Llamado tono="alerta" className="mt-4">
                <strong>Los datos del firmante los escribió quien firmó.</strong> La criptografía
                acredita que quien tenía la clave privada firmó este contenido, no que esa persona
                sea la que dice el nombre. Para vincular una clave a una identidad civil se requiere
                un certificado de una entidad acreditada ante la ONAC (Decreto 2364 de 2012).
              </Llamado>
            </Tarjeta>
          )}
        </>
      )}

      {!veredicto && manifiestoCrudo === null && (
        <Vacio titulo="Cargue un manifiesto para empezar">
          La verificación ocurre en su navegador y no consulta ningún servicio. Puede repetirla con
          cualquier biblioteca que implemente ECDSA P-256 y SHA-256.
        </Vacio>
      )}
    </div>
  );
}

function Caja({
  id,
  titulo,
  detalle,
  onArchivo,
  accept,
  cargado,
}: {
  id: string;
  titulo: string;
  detalle: string;
  onArchivo: (f: File) => void;
  accept?: string;
  cargado: boolean;
}) {
  return (
    <>
      <label
        htmlFor={id}
        className={cx(
          'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          cargado ? 'border-senal bg-senal/6' : 'border-borde-fuerte hover:border-marca',
        )}
      >
        <Upload size={22} className={cargado ? 'text-senal' : 'text-marca'} />
        <span className="text-sm font-medium break-all">{titulo}</span>
        <span className="text-xs text-texto-3">{detalle}</span>
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onArchivo(f);
          e.target.value = '';
        }}
      />
    </>
  );
}

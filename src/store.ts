/**
 * Estado del verificador de firma.
 *
 * La clave privada vive en el `localStorage` del navegador. Esa es su mayor
 * limitación y se dice sin rodeos en la interfaz: una clave así no satisface
 * el estándar de control exclusivo que exige el no repudio pleno. Sirve para
 * demostrar integridad y vínculo con una clave, que es lo que esta
 * herramienta afirma y nada más.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { almacenZustand } from './lib/almacen';
import { generarPar, type ParDeClaves } from './lib/cripto';
import type { Manifiesto } from './domain/manifiesto';

export interface RegistroFirma {
  id: string;
  radicado: string;
  documento: string;
  huella: string;
  firmante: string;
  proposito: string;
  selloTiempo: string;
  identificadorClave: string;
}

interface Estado {
  claves: ParDeClaves | null;
  firmante: { nombre: string; identificacion: string; rol: string };
  bitacora: RegistroFirma[];
  generar: () => Promise<void>;
  importar: (par: ParDeClaves) => void;
  olvidar: () => void;
  setFirmante: (p: Partial<Estado['firmante']>) => void;
  registrar: (m: Manifiesto) => void;
  limpiarBitacora: () => void;
}

export const useEstado = create<Estado>()(
  persist(
    (set) => ({
      claves: null,
      firmante: { nombre: '', identificacion: '', rol: '' },
      bitacora: [],

      generar: async () => {
        set({ claves: await generarPar() });
      },
      importar: (claves) => set({ claves }),
      olvidar: () => set({ claves: null }),
      setFirmante: (p) => set((s) => ({ firmante: { ...s.firmante, ...p } })),

      registrar: (m) =>
        set((s) => ({
          bitacora: [
            {
              id: crypto.randomUUID(),
              radicado: `FIR-${String(s.bitacora.length + 1).padStart(4, '0')}`,
              documento: m.documento.nombre,
              huella: m.documento.huellaSha256,
              firmante: m.firmante.nombre,
              proposito: m.proposito,
              selloTiempo: m.selloTiempo,
              identificadorClave: m.identificadorClave,
            },
            ...s.bitacora,
          ],
        })),

      limpiarBitacora: () => set({ bitacora: [] }),
    }),
    {
      name: 'estado',
      version: 1,
      storage: createJSONStorage(() => almacenZustand),
      partialize: (s) => ({ claves: s.claves, firmante: s.firmante, bitacora: s.bitacora }),
    },
  ),
);

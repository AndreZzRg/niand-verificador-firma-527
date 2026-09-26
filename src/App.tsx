import { useState, type JSX } from 'react';

import { Portada } from './brand/Portada';
import { APP, MODULOS, Shell, type ModuloId, type Vista } from './brand/Shell';
import { PanelBitacora } from './features/PanelBitacora';
import { PanelClaves } from './features/PanelClaves';
import { PanelCriterios } from './features/PanelCriterios';
import { PanelFirmar } from './features/PanelFirmar';
import { PanelVerificar } from './features/PanelVerificar';

const PANELES: Record<ModuloId, () => JSX.Element> = {
  'firmar-documento': PanelFirmar,
  'verificar-manifiesto': PanelVerificar,
  'gestion-de-claves': PanelClaves,
  'criterios-ley-527': PanelCriterios,
  bitacora: PanelBitacora,
};

export default function App() {
  // Se abre en la portada: quien llega ve primero de qué se compone la
  // herramienta, en vez de caer dentro del primer módulo sin contexto.
  const [vista, setVista] = useState<Vista>('portada');
  const Panel = vista === 'portada' ? null : PANELES[vista];

  return (
    <Shell vista={vista} onVista={setVista}>
      {Panel ? (
        <Panel />
      ) : (
        <Portada
          titulo={APP.nombre}
          descripcion={APP.resumen}
          modulos={MODULOS}
          onAbrir={(id) => setVista(id as ModuloId)}
        />
      )}
    </Shell>
  );
}

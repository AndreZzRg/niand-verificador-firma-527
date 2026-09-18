import { useState, type JSX } from 'react';

import { Shell, type ModuloId } from './brand/Shell';
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
  const [modulo, setModulo] = useState<ModuloId>('verificar-manifiesto');
  const Panel = PANELES[modulo];

  return (
    <Shell moduloActivo={modulo} onModulo={setModulo}>
      <Panel />
    </Shell>
  );
}

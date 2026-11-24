// Elige la piel. La animada se carga con import() dinamico: quien usa la ligera nunca descarga su codigo
// ni la libreria de animacion. Mientras llega el chunk se muestra la ligera, que ya esta en memoria.
import { lazy, Suspense } from 'react';
import type { Version } from '../preferencias';
import type { VistaMesa, VistaPrevia } from '../estado/tipos';
import MesaLigera from './ligera/MesaLigera';
import PreviasLigeras from './ligera/PreviasLigeras';

const MesaAnimada = lazy(() => import('./animada/MesaAnimada'));

export function PielMesa({ version, mesa }: { version: Version; mesa: VistaMesa }) {
  if (version === 'ligera') return <MesaLigera mesa={mesa} />;
  return (
    <Suspense fallback={<MesaLigera mesa={mesa} />}>
      <MesaAnimada mesa={mesa} />
    </Suspense>
  );
}

export function PielPrevias({ vista }: { version: Version; vista: VistaPrevia }) {
  return <PreviasLigeras vista={vista} />;
}

import { lazy, Suspense, useState } from 'react';
import { useMesa, ParametrosMesa } from './estado/useMesa';
import { useInicio, useNavegacion, useSala, useVestibulo } from './estado/usePrevias';
import type { VistaPrevia } from './estado/tipos';
import { guardarVersion, Version, versionInicial } from './preferencias';
import { PielMesa, PielPrevias } from './presentacion/Pieles';
import SelectorVersion from './presentacion/SelectorVersion';

type Navegacion = ReturnType<typeof useNavegacion>;

// Modo demostracion (solo `npm run dev` con ?demo): en produccion import.meta.env.DEV es false y Vite lo elimina.
const DemoMesa = import.meta.env.DEV ? lazy(() => import('./demo/DemoMesa')) : null;
const enDemo = DemoMesa !== null && new URLSearchParams(location.search).has('demo');

export default function App() {
  const nav = useNavegacion();
  const [version, setVersion] = useState<Version>(versionInicial);
  const cambiarVersion = (v: Version) => { guardarVersion(v); setVersion(v); };
  const { sesion, lugar } = nav;

  if (DemoMesa && enDemo) {
    return (
      <>
        <Suspense fallback={null}><DemoMesa version={version} /></Suspense>
        <SelectorVersion version={version} alCambiar={cambiarVersion} />
      </>
    );
  }
  return (
    <>
      {sesion && lugar && lugar.partidaId !== null
        ? <PantallaMesa key={lugar.partidaId} version={version} sesion={sesion} codigo={lugar.codigo}
            partidaId={lugar.partidaId} alSalir={(aviso) => nav.irA(null, aviso)} />
        : <PantallasPrevias nav={nav} version={version} />}
      <SelectorVersion version={version} alCambiar={cambiarVersion} />
    </>
  );
}

/** El estado de la mesa vive aqui, por encima de la piel que lo dibuja: cambiar de version no reconecta. */
function PantallaMesa({ version, ...p }: ParametrosMesa & { version: Version }) {
  const mesa = useMesa(p);
  return <PielMesa version={version} mesa={mesa} />;
}

function PantallasPrevias({ nav, version }: { nav: Navegacion; version: Version }) {
  const { sesion, lugar, aviso, irA, entrar, salir } = nav;
  const codigoSala = sesion && lugar && lugar.partidaId === null ? lugar.codigo : null;
  const inicio = useInicio(entrar);
  const vestibulo = useVestibulo(sesion, (codigo) => irA({ codigo, partidaId: null }), salir, aviso);
  const sala = useSala(sesion, codigoSala,
    (partidaId) => { if (codigoSala) irA({ codigo: codigoSala, partidaId }); }, () => irA(null));

  let vista: VistaPrevia = { pantalla: 'inicio', inicio };
  if (sesion && !lugar) vista = { pantalla: 'vestibulo', vestibulo };
  else if (sesion && codigoSala) vista = { pantalla: 'sala', sala };
  return <PielPrevias version={version} vista={vista} />;
}

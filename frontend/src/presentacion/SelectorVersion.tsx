// Barra fija al fondo: el jugador cambia entre la version animada y la ligera en cualquier momento.
// Cambiar de version solo cambia la piel; el estado (useMesa y compania) vive por encima y no se reconecta.
import type { Version } from '../preferencias';

interface Props { version: Version; alCambiar: (v: Version) => void }

export default function SelectorVersion({ version, alCambiar }: Props) {
  return (
    <nav className="selector-version" aria-label="Versión de la interfaz">
      <button type="button" aria-pressed={version === 'animada'} onClick={() => alCambiar('animada')}>
        Versión animada
      </button>
      <button type="button" aria-pressed={version === 'ligera'} onClick={() => alCambiar('ligera')}>
        Versión ligera
      </button>
    </nav>
  );
}

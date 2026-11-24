// Modelos vectoriales propios para las 52 cartas + comodín y el reverso.
// Separa estrictamente las columnas de esquina de la zona interior para evitar solapes en cualquier tamaño.
import { infoCarta } from '../../cartas';

/** Posiciones porcentuales (x, y, invertido) dentro de la zona central .a-lienzo-carta. */
const PIPS_POR_VALOR: Record<number, ReadonlyArray<readonly [number, number, boolean?]>> = {
  2: [[50, 17], [50, 83, true]],
  3: [[50, 16], [50, 50], [50, 84, true]],
  4: [[29, 17], [71, 17], [29, 83, true], [71, 83, true]],
  5: [[29, 17], [71, 17], [50, 50], [29, 83, true], [71, 83, true]],
  6: [[29, 16], [71, 16], [29, 50], [71, 50], [29, 84, true], [71, 84, true]],
  7: [[29, 16], [71, 16], [50, 33], [29, 50], [71, 50], [29, 84, true], [71, 84, true]],
  8: [[29, 16], [71, 16], [50, 33], [29, 50], [71, 50], [50, 67, true], [29, 84, true], [71, 84, true]],
  9: [[29, 14], [71, 14], [29, 38], [71, 38], [50, 50], [29, 62, true], [71, 62, true], [29, 86, true], [71, 86, true]],
  10: [[29, 14], [71, 14], [50, 26], [29, 38], [71, 38], [29, 62, true], [71, 62, true], [50, 74, true], [29, 86, true], [71, 86, true]],
};

export function PaloSvg({ pinta, className }: { pinta: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={['a-palo-svg', className ?? ''].join(' ')} aria-hidden="true">
      {pinta === 'C' && (
        <path
          d="M12 20.6 C12 20.6 3.5 14.8 3.5 8.8 A4.4 4.4 0 0 1 12 6.8 A4.4 4.4 0 0 1 20.5 8.8 C20.5 14.8 12 20.6 12 20.6 Z"
          fill="currentColor"
        />
      )}
      {pinta === 'D' && (
        <path d="M12 2.4 Q15.2 8.8 20.6 12 Q15.2 15.2 12 21.6 Q8.8 15.2 3.4 12 Q8.8 8.8 12 2.4 Z" fill="currentColor" />
      )}
      {pinta === 'T' && (
        <g fill="currentColor">
          <circle cx="12" cy="7.2" r="4.05" />
          <circle cx="7.4" cy="13.1" r="4.05" />
          <circle cx="16.6" cy="13.1" r="4.05" />
          <path d="M12 12.2 L9.3 20.8 H14.7 Z" />
        </g>
      )}
      {pinta === 'P' && (
        <path
          d="M12 2.4 C12 2.4 4.2 9.4 4.2 14.1 A4.1 4.1 0 0 0 11.1 17 L9.2 21.2 H14.8 L12.9 17 A4.1 4.1 0 0 0 19.8 14.1 C19.8 9.4 12 2.4 12 2.4 Z"
          fill="currentColor"
        />
      )}
      {pinta !== 'C' && pinta !== 'D' && pinta !== 'T' && pinta !== 'P' && (
        <path
          d="M12 2 L14.1 8.4 L19.1 4.9 L15.6 9.9 L22 12 L15.6 14.1 L19.1 19.1 L14.1 15.6 L12 22 L9.9 15.6 L4.9 19.1 L8.4 14.1 L2 12 L8.4 9.9 L4.9 4.9 L9.9 8.4 Z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

function InsigniaFigura({ valor }: { valor: string }) {
  return (
    <svg viewBox="0 0 36 16" className="a-insignia-figura" aria-hidden="true">
      {valor === 'K' && (
        <path d="M5 13 L7 5 L13 9.5 L18 3 L23 9.5 L29 5 L31 13 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      )}
      {valor === 'Q' && (
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M6 13 Q9 7 12 9 Q15 4 18 3 Q21 4 24 9 Q27 7 30 13 Z" />
          <circle cx="18" cy="2.8" r="1.1" fill="currentColor" />
        </g>
      )}
      {valor === 'J' && (
        <path d="M18 2.4 L25 7.5 L21.8 13 H14.2 L11 7.5 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function CaraCarta({ codigo }: { codigo: string }) {
  const c = infoCarta(codigo);
  const figura = c.valor === 'J' || c.valor === 'Q' || c.valor === 'K';
  const esAs = c.valor === 'A';
  const comodin = codigo === '*';
  const doble = c.valor.length > 1;
  const pips = PIPS_POR_VALOR[c.rango];

  return (
    <div className={['a-cara', c.roja ? 'roja' : '', figura ? 'figura' : '', comodin ? 'comodin' : ''].join(' ')}>
      <span className={['a-esquina arriba', doble ? 'doble' : ''].join(' ')}>
        <b>{c.valor}</b>
        {!comodin && <PaloSvg pinta={c.pinta} className="a-palo-esquina" />}
      </span>

      <span className="a-lienzo-carta" aria-hidden="true">
        {comodin && (
          <span className="a-comodin-centro">
            <PaloSvg pinta="*" className="a-palo-comodin" />
            <small>101</small>
          </span>
        )}

        {esAs && (
          <span className="a-as-centro">
            <svg className="a-as-marco" viewBox="0 0 60 88">
              <polygon points="30,6 54,44 30,82 6,44" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
            <PaloSvg pinta={c.pinta} className="a-palo-as" />
          </span>
        )}

        {figura && (
          <span className="a-marco-figura">
            <svg className="a-figura-linea" viewBox="0 0 60 90" preserveAspectRatio="none">
              <line x1="8" y1="82" x2="52" y2="8" stroke="currentColor" strokeWidth="0.9" />
            </svg>
            <span className="a-figura-cabeza">
              <InsigniaFigura valor={c.valor} />
            </span>
            <span className="a-figura-centro">
              <em>{c.valor}</em>
              <PaloSvg pinta={c.pinta} className="a-palo-figura" />
            </span>
            <span className="a-figura-cabeza espejo">
              <InsigniaFigura valor={c.valor} />
            </span>
          </span>
        )}

        {pips && pips.map(([x, y, inv], idx) => (
          <span
            key={idx}
            className="a-pip"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%)${inv ? ' rotate(180deg)' : ''}`,
            }}
          >
            <PaloSvg pinta={c.pinta} />
          </span>
        ))}
      </span>

      <span className={['a-esquina abajo', doble ? 'doble' : ''].join(' ')}>
        <b>{c.valor}</b>
        {!comodin && <PaloSvg pinta={c.pinta} className="a-palo-esquina" />}
      </span>
    </div>
  );
}

export function DorsoCarta() {
  return (
    <div className="a-dorso" aria-hidden="true">
      <span className="a-dorso-filete" />
      <span className="a-dorso-sello">101</span>
    </div>
  );
}

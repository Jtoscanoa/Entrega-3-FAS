// Tutorial interactivo y guiado de Mesa 101: permite inspeccionar las 14 figuras, practicar robo/agrupacion/descarte
// y recorrer en vivo las 4 zonas de la mesa. Solo presentacion (RD4).
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { infoCarta } from '../../cartas';
import { agruparManoVisual } from './agrupacionVisual';
import { Carta, DorsoCarta, nombreCarta } from './comun';
import { PaloSvg } from './CartasSvg';

export type ZonaGuia = 'rivales' | 'centro' | 'mano' | 'acciones';

const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', '*'] as const;
const PINTAS = [
  { id: 'C', nombre: 'Corazones' },
  { id: 'D', nombre: 'Diamantes' },
  { id: 'T', nombre: 'Tréboles' },
  { id: 'P', nombre: 'Picas' },
] as const;

const MANO_EJEMPLO = ['7C', '4D', '7P', '5D', 'KC', '7T', '6D', '2P'];
const MANO_CIERRE = ['4C', '4D', '4P', '7T', '8T', '9T', 'KC', 'KD', 'KP', '2P', 'QC'];

const ZONAS_GUIA: Array<{ zona: ZonaGuia; titulo: string; texto: string }> = [
  {
    zona: 'rivales',
    titulo: '1. Rivales, puntos y presencia',
    texto: 'Aquí ves el marcador de cada jugador, el anillo dorado en quien tiene el turno y el aviso «sin conexión» si alguien pierde la red.',
  },
  {
    zona: 'centro',
    titulo: '2. Mazo, reloj de turno y pozo',
    texto: 'Al empezar tu turno robas del mazo o del pozo. En los últimos 10 segundos todo el tablero titila en rojo para avisarte.',
  },
  {
    zona: 'mano',
    titulo: '3. Tu mano y agrupación visual',
    texto: 'Arrastra cartas o usa «Agrupar juegos», «Por pinta», «Por número» y «Vista 2 filas» en móvil para ver todas las cartas sin taparlas.',
  },
  {
    zona: 'acciones',
    titulo: '4. Descartar o cerrar la ronda',
    texto: 'Elige una carta para elevarla y descártala. Si tus otras 10 cartas arman tus combinaciones, usa esa carta para cerrar la ronda.',
  },
];

export function Tutorial({
  abierto,
  alCerrar,
  obtenerRect,
}: {
  abierto: boolean;
  alCerrar: () => void;
  obtenerRect?: (zona: ZonaGuia) => DOMRect | null;
}) {
  const reducido = useReducedMotion();
  const [paso, setPaso] = useState(0);
  const [valorSel, setValorSel] = useState<string>('A');
  const [pintaSel, setPintaSel] = useState<string>('C');
  const [robada, setRobada] = useState<string | null>(null);
  const [manoPaso3, setManoPaso3] = useState<string[]>(MANO_EJEMPLO);
  const [agrupadoPaso3, setAgrupadoPaso3] = useState(false);
  const [selPaso4, setSelPaso4] = useState<number | null>(null);
  const [resultadoPaso4, setResultadoPaso4] = useState('');
  const [guiaIndice, setGuiaIndice] = useState<number | null>(null);

  useEffect(() => {
    if (!abierto && guiaIndice === null) return undefined;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setGuiaIndice(null);
        alCerrar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, guiaIndice, alCerrar]);

  useEffect(() => {
    if (abierto) setGuiaIndice(null);
  }, [abierto]);

  const codigoInspeccion = valorSel === '*' ? '*' : `${valorSel}${pintaSel}`;
  const infoInspeccion = useMemo(() => infoCarta(codigoInspeccion), [codigoInspeccion]);
  const gruposPaso3 = useMemo(
    () => (agrupadoPaso3 ? agruparManoVisual(manoPaso3).grupos : manoPaso3.map(() => -1)),
    [agrupadoPaso3, manoPaso3],
  );

  const zonaActual = guiaIndice !== null ? ZONAS_GUIA[guiaIndice] : null;
  const rectGuia = zonaActual && obtenerRect ? obtenerRect(zonaActual.zona) : null;

  const iniciarGuiaEnMesa = () => {
    alCerrar();
    setGuiaIndice(0);
  };

  return (
    <>
      <AnimatePresence>
        {abierto && (
          <motion.div className="a-velo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(ev) => { if (ev.target === ev.currentTarget) alCerrar(); }}>
            <motion.section className="a-panel a-panel-tutorial" role="dialog" aria-modal="true" aria-labelledby="titulo-tutorial"
              initial={reducido ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducido ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25 }}>
              <div className="a-tut-cabecera">
                <div>
                  <p className="a-sobretitulo">Guía interactiva</p>
                  <h2 id="titulo-tutorial">Cómo jugar Mesa 101</h2>
                </div>
                <button type="button" className="a-boton suave" onClick={alCerrar}>Cerrar</button>
              </div>

              <div className="a-tut-pasos" role="tablist" aria-label="Pasos del tutorial">
                {['1. Cartas', '2. Robar', '3. Agrupar', '4. Cerrar'].map((etiqueta, idx) => (
                  <button key={etiqueta} type="button" role="tab" aria-selected={paso === idx}
                    className={['a-boton suave a-conmutador', paso === idx ? 'activo' : ''].join(' ')}
                    onClick={() => setPaso(idx)}>
                    {etiqueta}
                  </button>
                ))}
              </div>

              {paso === 0 && (
                <div className="a-tut-bloque">
                  <p className="a-tenue">
                    Recibes <b>10 cartas</b> (11 quien abre). Toca cualquier valor y pinta para ver su diseño y cuántos puntos suma si queda suelta:
                  </p>
                  <div className="a-tut-inspector">
                    <div className="a-tut-carta-grande">
                      <Carta codigo={codigoInspeccion} />
                    </div>
                    <div className="a-tut-detalle">
                      <strong>{nombreCarta(codigoInspeccion)}</strong>
                      <p className="a-tenue a-pequeno">
                        <b>Apuntado a 101:</b> cierra con 3 ternas y menos de 5 puntos sueltos. Quien llega a 101 queda eliminado.<br />
                        <b>Clásica 4-3-3:</b> una sola ronda; 1 cuarta + 2 ternas + 1 descarte.
                      </p>
                      <div className="a-tut-chips" aria-label="Elegir palo">
                        {PINTAS.map((p) => (
                          <button key={p.id} type="button"
                            className={['a-boton suave a-conmutador', pintaSel === p.id ? 'activo' : ''].join(' ')}
                            disabled={valorSel === '*'}
                            aria-label={p.nombre}
                            onClick={() => setPintaSel(p.id)}>
                            <span className={['a-tut-palo', p.id === 'C' || p.id === 'D' ? 'rojo' : ''].join(' ')}>
                              <PaloSvg pinta={p.id} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="a-tut-valores" aria-label="Elegir valor de carta">
                    {VALORES.map((v) => (
                      <button key={v} type="button"
                        className={['a-boton suave a-conmutador', valorSel === v ? 'activo' : ''].join(' ')}
                        onClick={() => setValorSel(v)}>
                        {v === '*' ? '★' : v}
                      </button>
                    ))}
                  </div>
                  <p className="a-pequeno a-tenue">
                    Valor actual: <b>{infoInspeccion.puntos} puntos</b> (A, J, Q, K valen 10; 2 al 10 valen su número; ★ vale 0).
                  </p>
                </div>
              )}

              {paso === 1 && (
                <div className="a-tut-bloque">
                  <p className="a-tenue">
                    Al iniciar tu turno tienes <b>10 cartas</b> y debes robar <b>1 carta</b> del mazo (oculta) o del pozo (visible):
                  </p>
                  <div className="a-tut-montones">
                    <button type="button" className="a-monton a-mazo activo" onClick={() => setRobada('9T')}>
                      <span className="a-pila" aria-hidden="true"><span><DorsoCarta /></span></span>
                      <span className="a-rotulo">Robar del mazo</span>
                    </button>
                    <button type="button" className="a-monton a-pozo activo" onClick={() => setRobada('6C')}>
                      <span className="a-pila-pozo" aria-hidden="true">
                        <span className="a-cima"><Carta codigo="6C" /></span>
                      </span>
                      <span className="a-rotulo">Robar del pozo</span>
                    </button>
                  </div>
                  <div className="a-tut-resultado">
                    {robada ? (
                      <>
                        <div className="a-tut-mini"><Carta codigo={robada} /></div>
                        <span>Robaste <b>{nombreCarta(robada)}</b>. Ahora tienes 11 cartas y debes descartar 1.</span>
                        <button type="button" className="a-boton suave" onClick={() => setRobada(null)}>Reiniciar</button>
                      </>
                    ) : (
                      <span className="a-tenue">Toca el mazo o el pozo arriba para probar el robo.</span>
                    )}
                  </div>
                </div>
              )}

              {paso === 2 && (
                <div className="a-tut-bloque">
                  <p className="a-tenue">
                    Arma <b>ternas/cuartas</b> (mismo número) o <b>escaleras</b> (seguidas de la misma pinta, As como 1 o 14 sin dar la vuelta).
                  </p>
                  <div className="a-tut-cartas">
                    {manoPaso3.map((c, idx) => (
                      <span key={`${c}-${idx}`} className={['a-tut-item', gruposPaso3[idx] >= 0 ? 'agrupada' : ''].join(' ')}>
                        <Carta codigo={c} />
                      </span>
                    ))}
                  </div>
                  <div className="a-tut-acciones">
                    <button type="button" className="a-boton principal"
                      onClick={() => {
                        if (agrupadoPaso3) {
                          setManoPaso3(MANO_EJEMPLO);
                          setAgrupadoPaso3(false);
                        } else {
                          setManoPaso3(agruparManoVisual(MANO_EJEMPLO).orden);
                          setAgrupadoPaso3(true);
                        }
                      }}>
                      {agrupadoPaso3 ? 'Desordenar de nuevo' : 'Probar agrupar juegos'}
                    </button>
                  </div>
                  <p className="a-tenue a-pequeno">
                    {agrupadoPaso3
                      ? 'Listo: separó la terna [7♥ 7♠ 7♣] y la escalera [4♦ 5♦ 6♦], dejando las sueltas [2♠ K♥] al final.'
                      : 'Pulsa «Probar agrupar juegos» para ver cómo separa automáticamente las combinaciones de las cartas sueltas.'}
                  </p>
                </div>
              )}

              {paso === 3 && (
                <div className="a-tut-bloque">
                  <p className="a-tenue">
                    Con 11 cartas en tu turno, elige una para elevarla y decide si solo <b>descartas</b> o si <b>cierras</b> la ronda con ella (aquí hay 3 ternas + 2 pts):
                  </p>
                  <div className="a-tut-cartas chicas">
                    {MANO_CIERRE.map((c, idx) => (
                      <button key={`${c}-${idx}`} type="button"
                        className={['a-tut-btn-carta', selPaso4 === idx ? 'elegida' : ''].join(' ')}
                        aria-pressed={selPaso4 === idx} aria-label={nombreCarta(c)}
                        onClick={() => { setSelPaso4(selPaso4 === idx ? null : idx); setResultadoPaso4(''); }}>
                        <Carta codigo={c} />
                      </button>
                    ))}
                  </div>
                  <div className="a-tut-acciones">
                    <button type="button" className="a-boton principal" disabled={selPaso4 === null}
                      onClick={() => {
                        if (selPaso4 !== null) {
                          setResultadoPaso4(`Descartaste ${nombreCarta(MANO_CIERRE[selPaso4])}. Sigue el siguiente jugador.`);
                        }
                      }}>
                      Simular descarte
                    </button>
                    <button type="button" className="a-boton cerrar" disabled={selPaso4 === null}
                      onClick={() => {
                        if (selPaso4 === null) return;
                        const carta = MANO_CIERRE[selPaso4];
                        setResultadoPaso4(
                          carta === 'QC'
                            ? '¡Cierre válido de ejemplo! Descartas Reina de corazones y tus otras 10 cartas suman 2 puntos (< 5 pts).'
                            : 'El servidor verifica las reglas: si descartas esa carta te queda la Reina (10 pts) o se rompe una combinación.',
                        );
                      }}>
                      Probar cierre
                    </button>
                  </div>
                  {resultadoPaso4 && <p className="a-pequeno a-tut-nota">{resultadoPaso4}</p>}
                </div>
              )}

              <div className="a-tut-pie">
                <div className="a-fila">
                  <button type="button" className="a-boton suave" disabled={paso === 0} onClick={() => setPaso((p) => p - 1)}>
                    ← Anterior
                  </button>
                  <button type="button" className="a-boton suave" disabled={paso === 3} onClick={() => setPaso((p) => p + 1)}>
                    Siguiente →
                  </button>
                </div>
                {obtenerRect && (
                  <button type="button" className="a-boton cerrar" onClick={iniciarGuiaEnMesa}>
                    Recorrer la mesa (4 zonas)
                  </button>
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {zonaActual && (
          <div className="a-guia-capa" role="region" aria-label="Recorrido guiado por la mesa">
            {rectGuia && (
              <motion.div key={`marco-${zonaActual.zona}`} className="a-guia-marco" aria-hidden="true"
                style={{ left: rectGuia.left - 6, top: rectGuia.top - 6, width: rectGuia.width + 12, height: rectGuia.height + 12 }}
                initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }} />
            )}
            <motion.div key={`tarjeta-${zonaActual.zona}`} className="a-guia-tarjeta"
              initial={reducido ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}>
              <p className="a-sobretitulo">Recorrido guiado ({guiaIndice! + 1}/4)</p>
              <h3>{zonaActual.titulo}</h3>
              <p className="a-tenue a-pequeno">{zonaActual.texto}</p>
              <div className="a-tut-pie">
                <button type="button" className="a-boton suave" disabled={guiaIndice === 0}
                  onClick={() => setGuiaIndice((i) => (i !== null ? i - 1 : 0))}>
                  ← Anterior
                </button>
                {guiaIndice! < ZONAS_GUIA.length - 1 ? (
                  <button type="button" className="a-boton principal"
                    onClick={() => setGuiaIndice((i) => (i !== null ? i + 1 : 0))}>
                    Siguiente →
                  </button>
                ) : (
                  <button type="button" className="a-boton principal" onClick={() => setGuiaIndice(null)}>
                    Finalizar guía
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

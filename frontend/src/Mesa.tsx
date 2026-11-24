import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ConexionMesa, conectarMesa, Mensaje, Sesion } from './api';
import { infoCarta, ordenarPorPinta, ordenarPorValor, reconciliar } from './cartas';
import { ayudaCierre, mensajeDe, MOTIVO_FIN, NOMBRE_MODALIDAD, TIPO_CIERRE } from './mensajes';

interface Props { sesion: Sesion; codigo: string; partidaId: number; alSalir: () => void }

interface Estado {
  ronda: number; orden: string[]; cima: string | null; marcador: Record<string, number>;
  turnoDe: string | null; numeroTurno: number; fase: string; modalidad: string; umbral: number;
  robarDelDescarte: boolean; eliminados: string[]; finalizada: boolean; venceEn: string | null; nueva: string | null;
}

interface Liquidacion {
  ronda: number; cerrador: string; tipoCierre: string; puntosRonda: Record<string, number>;
  marcador: Record<string, number>; eliminados: string[];
}

const INICIAL: Estado = {
  ronda: 0, orden: [], cima: null, marcador: {}, turnoDe: null, numeroTurno: 0, fase: '', modalidad: '',
  umbral: 101, robarDelDescarte: false, eliminados: [], finalizada: false, venceEn: null, nueva: null,
};

function quitarUna(cartas: string[], carta: string): string[] {
  const i = cartas.indexOf(carta);
  return i < 0 ? cartas : [...cartas.slice(0, i), ...cartas.slice(i + 1)];
}

export default function Mesa({ sesion, codigo, partidaId, alSalir }: Props) {
  const [e, setE] = useState<Estado>(INICIAL);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [conectado, setConectado] = useState(false);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'error' | 'info' } | null>(null);
  const [bitacora, setBitacora] = useState<string[]>([]);
  const [liquidacion, setLiquidacion] = useState<Liquidacion | null>(null);
  const [historial, setHistorial] = useState<Liquidacion[]>([]);
  const [fin, setFin] = useState<{ ganador: string; motivo: string } | null>(null);
  const [ahora, setAhora] = useState(Date.now());
  const conexion = useRef<ConexionMesa | null>(null);
  const arrastrada = useRef<number | null>(null);
  const nombresRef = useRef(nombres);
  nombresRef.current = nombres;

  const nombre = useCallback((sub: string | null) =>
    !sub ? '—' : sub === sesion.sub ? 'Tú' : nombresRef.current[sub] ?? 'Jugador', [sesion.sub]);
  const anotar = useCallback((t: string) => setBitacora((b) => [t, ...b].slice(0, 8)), []);
  /** Conjuga en segunda persona cuando la accion es del propio jugador ("Tú descartaste" y no "Tú descartó"). */
  const quien = useCallback((sub: string, tercera: string, segunda: string) =>
    sub === sesion.sub ? `Tú ${segunda}` : `${nombre(sub)} ${tercera}`, [nombre, sesion.sub]);

  const alMensaje = useCallback((m: Mensaje) => {
    const d = m.datos;
    switch (m.tipo) {
      case 'VistaPartida':
        setE((s) => ({
          ...s, ronda: d.numeroRonda, orden: reconciliar(s.orden, d.mano), cima: d.cimaDescarte, marcador: d.marcador,
          turnoDe: d.turnoDe, numeroTurno: d.numeroTurno, fase: d.fase, modalidad: d.modalidad, umbral: d.umbral,
          robarDelDescarte: d.robarDelDescarte, eliminados: d.eliminados, finalizada: d.finalizada,
        }));
        break;
      case 'RondaIniciada':
        setE((s) => ({ ...s, ronda: d.numeroRonda, cima: d.cimaDescarte, nueva: null }));
        setSeleccion(null);
        anotar(`Empieza la ronda ${d.numeroRonda}. ${quien(d.abridor, 'abre', 'abres')}.`);
        conexion.current?.reanudar();
        break;
      case 'ManoEntregada':
        setE((s) => ({ ...s, orden: ordenarPorPinta(d.cartas) }));
        break;
      case 'TurnoAsignado':
        setE((s) => ({ ...s, turnoDe: d.jugadorId, numeroTurno: d.numeroTurno, venceEn: d.venceEn }));
        conexion.current?.reanudar();
        break;
      case 'CartaRobada':
        anotar(`${quien(d.jugadorId, 'robó', 'robaste')} del ${d.origen === 'DESCARTE' ? 'pozo' : 'mazo'}.`);
        conexion.current?.reanudar();
        break;
      case 'CartaRecibida':
        setE((s) => ({ ...s, orden: [...s.orden, d.carta], nueva: d.carta, fase: 'ESPERANDO_DESCARTE' }));
        break;
      case 'CartaDescartada':
        setE((s) => ({ ...s, cima: d.carta, nueva: null,
          orden: d.jugadorId === sesion.sub ? quitarUna(s.orden, d.carta) : s.orden }));
        if (d.jugadorId === sesion.sub) setSeleccion(null);
        anotar(`${quien(d.jugadorId, 'descartó', 'descartaste')} ${infoCarta(d.carta).valor}${infoCarta(d.carta).simbolo}.`);
        break;
      case 'MazoRepuesto':
        anotar('Se acabó el mazo: el pozo se rebarajó.');
        break;
      case 'CierreRechazado':
        setAviso({ texto: `Cierre rechazado: ${d.motivo}`, tipo: 'error' });
        break;
      case 'RondaLiquidada': {
        const l: Liquidacion = { ronda: d.numeroRonda, cerrador: d.cerradorId, tipoCierre: d.tipoCierre,
          puntosRonda: d.puntosRonda, marcador: d.marcador, eliminados: d.eliminados ?? [] };
        setLiquidacion(l);
        setHistorial((h) => [...h, l]);
        setE((s) => ({ ...s, marcador: { ...s.marcador, ...d.marcador },
          eliminados: Array.from(new Set([...s.eliminados, ...(d.eliminados ?? [])])) }));
        anotar(`${quien(d.cerradorId, 'cerró', 'cerraste')} la ronda ${d.numeroRonda}.`);
        break;
      }
      case 'PartidaFinalizada':
        setFin({ ganador: d.ganadorId, motivo: d.motivo });
        setE((s) => ({ ...s, finalizada: true, turnoDe: null }));
        break;
      default:
        break;
    }
  }, [anotar, nombre, quien, sesion.sub]);

  useEffect(() => {
    api.estadoSala(sesion.token, codigo)
      .then((s) => setNombres(Object.fromEntries(s.jugadores.map((j) => [j.sub, j.alias]))))
      .catch(() => undefined);
    const c = conectarMesa(sesion.token, partidaId, {
      alMensaje,
      alError: (motivo) => setAviso({ texto: mensajeDe(motivo), tipo: 'error' }),
      alConectar: () => { setConectado(true); c.reanudar(); },
      alDesconectar: () => setConectado(false),
    });
    conexion.current = c;
    return () => c.cerrarConexion();
  }, [sesion.token, codigo, partidaId, alMensaje]);

  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 500); return () => clearInterval(t); }, []);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 6000); return () => clearTimeout(t); }, [aviso]);

  const miTurno = e.turnoDe === sesion.sub && !e.finalizada;
  const debeRobar = miTurno && e.fase === 'ESPERANDO_ROBO';
  const debeDescartar = miTurno && e.fase === 'ESPERANDO_DESCARTE';
  const cartaSel = seleccion !== null ? e.orden[seleccion] : null;
  const segundos = e.venceEn ? Math.max(0, Math.ceil((new Date(e.venceEn).getTime() - ahora) / 1000)) : null;
  const jugadores = Object.keys(e.marcador).length ? Object.keys(e.marcador) : Object.keys(nombres);

  const mover = (desde: number, hasta: number) => {
    setE((s) => { const o = [...s.orden]; const [c] = o.splice(desde, 1); o.splice(hasta, 0, c); return { ...s, orden: o }; });
    setSeleccion(null);
  };
  const descartar = () => { if (cartaSel) conexion.current?.descartar(cartaSel, e.numeroTurno); };
  const cerrar = () => { if (cartaSel) conexion.current?.cerrar(cartaSel, e.numeroTurno); };

  let instruccion = `Turno de ${nombre(e.turnoDe)}. Espera tu turno.`;
  if (e.finalizada) instruccion = 'La partida terminó.';
  else if (debeRobar) instruccion = e.robarDelDescarte ? 'Tu turno: roba una carta del mazo o del pozo.' : 'Tu turno: roba una carta del mazo.';
  else if (debeDescartar) instruccion = 'Elige una carta y descártala, o úsala como descarte para cerrar la ronda.';

  return (
    <main className="mesa">
      <header className="barra">
        <div><strong>{NOMBRE_MODALIDAD[e.modalidad] ?? 'Partida'}</strong> · Ronda {e.ronda} · Sala {codigo}</div>
        <div className={conectado ? 'estado ok' : 'estado caido'}>{conectado ? 'Conectado' : 'Reconectando…'}</div>
        <button className="enlace" onClick={() => { conexion.current?.cerrarConexion(); alSalir(); }}>Salir</button>
      </header>

      <section className="marcador">
        {jugadores.map((sub) => (
          <div key={sub} className={['jugador', sub === e.turnoDe ? 'en-turno' : '', e.eliminados.includes(sub) ? 'eliminado' : ''].join(' ')}>
            <span className="nombre">{nombre(sub)}</span>
            <span className="puntos">{e.marcador[sub] ?? 0}{e.modalidad === 'APUNTADO_101' && <small> / {e.umbral}</small>}</span>
            {e.eliminados.includes(sub) && <span className="etiqueta">eliminado</span>}
          </div>
        ))}
      </section>

      <section className="centro-mesa">
        <div className="montones">
          <button className="monton mazo" disabled={!debeRobar} onClick={() => conexion.current?.robar(false, e.numeroTurno)}>
            <span>Mazo</span><small>Robar</small>
          </button>
          <button className="monton pozo" disabled={!debeRobar || !e.robarDelDescarte || !e.cima}
            onClick={() => conexion.current?.robar(true, e.numeroTurno)}>
            {e.cima ? <Carta codigo={e.cima} /> : <span>Pozo vacío</span>}
            <small>{e.robarDelDescarte ? 'Robar del pozo' : 'Pozo'}</small>
          </button>
        </div>
        <div className={miTurno ? 'instruccion mia' : 'instruccion'}>
          {instruccion}{miTurno && segundos !== null && <span className="reloj"> {segundos} s</span>}
        </div>
      </section>

      {aviso && <div className={`aviso ${aviso.tipo}`}>{aviso.texto}{aviso.tipo === 'error' && e.modalidad && aviso.texto.startsWith('Cierre') && <div className="ayuda">{ayudaCierre(e.modalidad)}</div>}</div>}

      <section className="mano">
        <div className="mano-cabecera">
          <h2>Tu mano ({e.orden.length})</h2>
          <div className="fila">
            <button onClick={() => setE((s) => ({ ...s, orden: ordenarPorPinta(s.orden) }))}>Ordenar por pinta</button>
            <button onClick={() => setE((s) => ({ ...s, orden: ordenarPorValor(s.orden) }))}>Ordenar por número</button>
          </div>
        </div>
        <div className="cartas">
          {e.orden.map((c, i) => (
            <Carta key={`${c}-${i}`} codigo={c} seleccionada={seleccion === i} nueva={c === e.nueva}
              onClick={() => setSeleccion(seleccion === i ? null : i)}
              onDragStart={() => { arrastrada.current = i; }}
              onDrop={() => { if (arrastrada.current !== null && arrastrada.current !== i) mover(arrastrada.current, i); arrastrada.current = null; }} />
          ))}
        </div>
        <p className="tenue pequeno">Arrastra las cartas para agrupar tus ternas y cuartas. Toca una carta para seleccionarla.</p>
        <div className="acciones">
          <button className="principal" disabled={!debeDescartar || !cartaSel} onClick={descartar}>Descartar carta</button>
          <button className="cerrar" disabled={!debeDescartar || !cartaSel} onClick={cerrar}>Cerrar ronda descartando esta carta</button>
        </div>
        {e.modalidad && <p className="tenue pequeno">{ayudaCierre(e.modalidad)}</p>}
      </section>

      <aside className="bitacora">
        <h2>Lo último</h2>
        <ul>{bitacora.map((t, i) => <li key={i}>{t}</li>)}</ul>
        {historial.length > 0 && (
          <>
            <h2>Historial de rondas</h2>
            <table>
              <thead><tr><th>Ronda</th>{jugadores.map((s) => <th key={s}>{nombre(s)}</th>)}</tr></thead>
              <tbody>{historial.map((h) => (
                <tr key={h.ronda}><td>{h.ronda}</td>{jugadores.map((s) => <td key={s}>{s === h.cerrador ? `${h.puntosRonda[s] ?? 0} ✓` : h.puntosRonda[s] ?? '—'}</td>)}</tr>
              ))}</tbody>
            </table>
          </>
        )}
      </aside>

      {liquidacion && !fin && (
        <div className="velo"><div className="panel">
          <h2>Ronda {liquidacion.ronda}: {liquidacion.cerrador === sesion.sub ? 'cerraste tú' : `cerró ${nombre(liquidacion.cerrador)}`}</h2>
          <p className="tenue">{TIPO_CIERRE[liquidacion.tipoCierre] ?? liquidacion.tipoCierre}</p>
          <table className="liquidacion">
            <thead><tr><th>Jugador</th><th>Esta ronda</th><th>Total</th></tr></thead>
            <tbody>{Object.keys(liquidacion.marcador).map((s) => (
              <tr key={s} className={liquidacion.eliminados.includes(s) ? 'eliminado' : ''}>
                <td>{nombre(s)}{liquidacion.eliminados.includes(s) && <span className="etiqueta">eliminado</span>}</td>
                <td>{liquidacion.puntosRonda[s] ?? 0}</td><td>{liquidacion.marcador[s]}</td>
              </tr>))}</tbody>
          </table>
          <p className="tenue pequeno">Cada perdedor suma sus cartas sueltas con la agrupación que menos puntos le deja.</p>
          <button className="principal" onClick={() => setLiquidacion(null)}>Seguir jugando</button>
        </div></div>
      )}

      {fin && (
        <div className="velo"><div className="panel">
          <h2>{fin.ganador === sesion.sub ? '¡Ganaste!' : `Ganó ${nombre(fin.ganador)}`}</h2>
          <p className="tenue">La partida terminó porque {MOTIVO_FIN[fin.motivo] ?? fin.motivo}.</p>
          <table className="liquidacion">
            <thead><tr><th>Jugador</th><th>Total</th></tr></thead>
            <tbody>{Object.entries(e.marcador).map(([s, p]) => <tr key={s}><td>{nombre(s)}</td><td>{p}</td></tr>)}</tbody>
          </table>
          <button className="principal" onClick={() => { conexion.current?.cerrarConexion(); alSalir(); }}>Volver al inicio</button>
        </div></div>
      )}
    </main>
  );
}

interface PropsCarta {
  codigo: string; seleccionada?: boolean; nueva?: boolean; onClick?: () => void;
  onDragStart?: () => void; onDrop?: () => void;
}

function Carta({ codigo, seleccionada, nueva, onClick, onDragStart, onDrop }: PropsCarta) {
  const c = infoCarta(codigo);
  return (
    <div className={['carta', c.roja ? 'roja' : '', seleccionada ? 'sel' : '', nueva ? 'nueva' : ''].join(' ')}
      onClick={onClick} draggable={!!onDragStart} onDragStart={onDragStart}
      onDragOver={(ev) => ev.preventDefault()} onDrop={onDrop} title={`${c.puntos} puntos`}>
      <span className="valor">{c.valor}</span><span className="pinta">{c.simbolo}</span>
    </div>
  );
}

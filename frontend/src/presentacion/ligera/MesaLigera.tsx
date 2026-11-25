// Version ligera de la mesa: la interfaz original, sin animaciones, pensada para telefonos de bajos recursos.
// Solo recibe lo que entrega useMesa(); no conoce la conexion ni las reglas (RD4, FF-19).
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { gruposEnOrden, infoCarta, ordenarPorGrupos } from '../../cartas';
import {
  ayudaCierre, CIERRE_CORTO, LARGO_CHAT, MOTIVO_FIN, NOMBRE_MODALIDAD, pistaCierre, textoAvance, TIPO_CIERRE,
  VERIFICACION_REPARTO,
} from '../../mensajes';
import { huellaCorta } from '../../estado/verificarReparto';
import type { Liquidacion, VistaMesa } from '../../estado/tipos';

export default function MesaLigera({ mesa }: { mesa: VistaMesa }) {
  const { e, nombre, jugadores, seleccion, cartaSel, miTurno, debeRobar, debeDescartar, segundos, aviso, fin,
    liquidacion, historial, bitacora, avance } = mesa;
  const arrastrada = useRef<number | null>(null);
  // Grupos y avance calculados por el servidor (RF16, RD4): aqui solo se muestran.
  const grupos = useMemo(() => gruposEnOrden(e.orden, avance?.grupos ?? []), [e.orden, avance]);
  const puedeCerrar = debeDescartar && !!avance?.puedeCerrar;
  const sugerida = avance?.descarteSugerido ?? null;
  const chat = useChatLigero(mesa);

  return (
    <main className="mesa">
      <header className="barra">
        <div><strong>{NOMBRE_MODALIDAD[e.modalidad] ?? 'Partida'}</strong> · Ronda {e.ronda} · Sala {mesa.codigo}</div>
        <div className={mesa.conectado ? 'estado ok' : 'estado caido'}>{mesa.conectado ? 'Conectado' : 'Reconectando…'}</div>
        <button className="chat-boton" aria-expanded={chat.abierto} aria-controls="chat-mesa" onClick={chat.alternar}>
          Chat{chat.sinLeer > 0 && <span className="insignia" aria-label={`${chat.sinLeer} sin leer`}>{chat.sinLeer}</span>}
        </button>
        <button className="enlace" onClick={mesa.salir}>Salir</button>
      </header>

      <section className="marcador">
        {jugadores.map((sub) => (
          <div key={sub} className={['jugador', sub === e.turnoDe ? 'en-turno' : '', e.eliminados.includes(sub) ? 'eliminado' : '',
            e.ausentes.includes(sub) ? 'sin-conexion' : ''].join(' ')}>
            <span className="nombre">{e.ausentes.includes(sub) && <IconoSinConexion />}{nombre(sub)}</span>
            <span className="puntos">{e.marcador[sub] ?? 0}{e.modalidad === 'APUNTADO_101' && <small> / {e.umbral}</small>}</span>
            {e.eliminados.includes(sub) && <span className="etiqueta">eliminado</span>}
            {e.ausentes.includes(sub) && <span className="etiqueta">sin conexión</span>}
          </div>
        ))}
      </section>

      <section className="centro-mesa">
        <div className="montones">
          <button className="monton mazo" disabled={!debeRobar} onClick={() => mesa.robar(false)}>
            <span>Mazo</span><small>Robar</small>
          </button>
          <button className="monton pozo" disabled={!debeRobar || !e.robarDelDescarte || !e.cima}
            onClick={() => mesa.robar(true)}>
            {e.cima ? <Carta codigo={e.cima} /> : <span>Pozo vacío</span>}
            <small>{e.robarDelDescarte ? 'Robar del pozo' : 'Pozo'}</small>
          </button>
        </div>
        {e.huella && (
          <p className="huella" title={e.huella}>Huella del reparto: <code>{huellaCorta(e.huella)}</code>
            <span className="tenue"> · se comprueba al liquidar</span></p>
        )}
        <div className={miTurno ? 'instruccion mia' : 'instruccion'}>
          {mesa.instruccion}{miTurno && segundos !== null && <span className="reloj"> {segundos} s</span>}
        </div>
      </section>

      {aviso && <div className={`aviso ${aviso.tipo}`}>{aviso.texto}{aviso.cierre && e.modalidad && <div className="ayuda">{ayudaCierre(e.modalidad)}</div>}</div>}

      <section className="mano">
        <div className="mano-cabecera">
          <h2>Tu mano ({e.orden.length})</h2>
          {avance && textoAvance(avance) && <span className={puedeCerrar ? 'avance listo' : 'avance'}>{textoAvance(avance)}</span>}
          <div className="fila">
            <button onClick={() => mesa.reordenar(ordenarPorGrupos(e.orden, avance?.grupos ?? []))}
              disabled={!avance?.grupos.length}>Agrupar juegos</button>
            <button onClick={mesa.ordenarPorPinta}>Ordenar por pinta</button>
            <button onClick={mesa.ordenarPorValor}>Ordenar por número</button>
          </div>
        </div>
        <div className="cartas">
          {e.orden.map((c, i) => (
            <Carta key={`${c}-${i}`} codigo={c} seleccionada={seleccion === i} nueva={c === e.nueva} grupo={grupos[i]}
              onClick={() => mesa.seleccionar(seleccion === i ? null : i)}
              onDragStart={() => { arrastrada.current = i; }}
              onDrop={() => { if (arrastrada.current !== null && arrastrada.current !== i) mesa.mover(arrastrada.current, i); arrastrada.current = null; }} />
          ))}
        </div>
        <p className="tenue pequeno">Arrastra las cartas para agrupar tus ternas y cuartas. Toca una carta para seleccionarla.</p>
        {puedeCerrar && sugerida && (
          <p className="pista-cierre" role="status">
            {pistaCierre(`${infoCarta(sugerida).valor}${infoCarta(sugerida).simbolo}`)}
            {cartaSel !== sugerida && <button onClick={() => mesa.seleccionar(e.orden.indexOf(sugerida))}>Elegirla</button>}
          </p>
        )}
        <div className="acciones">
          <button className="principal" disabled={!debeDescartar || !cartaSel} onClick={mesa.descartar}>Descartar carta</button>
          <button className={puedeCerrar ? 'cerrar listo' : 'cerrar'} disabled={!debeDescartar || !cartaSel} onClick={mesa.cerrar}>Cerrar ronda descartando esta carta</button>
        </div>
        {e.modalidad && <p className="tenue pequeno">{ayudaCierre(e.modalidad)}</p>}
      </section>

      <aside className="bitacora">
        <h2>Lo último</h2>
        <ul>{bitacora.map((t, i) => <li key={i}>{t}</li>)}</ul>
        <ChatLigero mesa={mesa} estado={chat} />
        {historial.length > 0 && (
          <>
            <h2>Historial de rondas</h2>
            <table>
              <thead><tr><th>Ronda</th><th>Cierre</th>{jugadores.map((s) => <th key={s}>{nombre(s)}</th>)}</tr></thead>
              <tbody>{historial.map((h) => (
                <tr key={h.ronda}><td>{h.ronda}</td><td>{CIERRE_CORTO[h.tipoCierre] ?? h.tipoCierre}</td>
                  {jugadores.map((s) => <td key={s}><CeldaRonda h={h} sub={s} /></td>)}</tr>
              ))}</tbody>
            </table>
            <p className="tenue pequeno">Puntos de la ronda y, entre paréntesis, el total. ✓ = cerró.</p>
          </>
        )}
      </aside>

      {liquidacion && !fin && (
        <div className="velo"><div className="panel">
          <h2>Ronda {liquidacion.ronda}: {liquidacion.cerrador === mesa.yo ? 'cerraste tú' : `cerró ${nombre(liquidacion.cerrador)}`}</h2>
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
          <Verificacion l={liquidacion} />
          <button className="principal" onClick={mesa.cerrarLiquidacion}>Seguir jugando</button>
        </div></div>
      )}

      {fin && (
        <div className="velo"><div className="panel">
          <h2>{fin.ganador === mesa.yo ? '¡Ganaste!' : `Ganó ${nombre(fin.ganador)}`}</h2>
          <p className="tenue">La partida terminó porque {MOTIVO_FIN[fin.motivo] ?? fin.motivo}.</p>
          <table className="liquidacion">
            <thead><tr><th>Jugador</th><th>Total</th></tr></thead>
            <tbody>{Object.entries(e.marcador).map(([s, p]) => <tr key={s}><td>{nombre(s)}</td><td>{p}</td></tr>)}</tbody>
          </table>
          {historial.length > 0 && <Verificacion l={historial[historial.length - 1]} />}
          <button className="principal" onClick={mesa.salir}>Volver al inicio</button>
        </div></div>
      )}
    </main>
  );
}

/** RF18: SHA-256(orden + sal) recalculado en este navegador frente a la huella anunciada al iniciar la ronda. */
function Verificacion({ l }: { l: Liquidacion }) {
  if (!l.reparto) return null;
  return (
    <div className={`verificacion ${l.reparto.estado}`} role="status">
      {VERIFICACION_REPARTO[l.reparto.estado]}
      {l.reparto.huella && <code className="pequeno">{l.reparto.huella}</code>}
    </div>
  );
}

/** Puntos de la ronda y total acumulado del jugador (RF13). */
function CeldaRonda({ h, sub }: { h: Liquidacion; sub: string }) {
  if (h.puntosRonda[sub] === undefined) return <>—</>;
  return <>{h.puntosRonda[sub]}{sub === h.cerrador && ' ✓'} <small className="tenue">({h.marcador[sub] ?? '—'})</small></>;
}

/** Senal tachada: el jugador no tiene ninguna sesion abierta (RF17). */
function IconoSinConexion() {
  return (
    <svg className="icono-red" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M2 6.5a9 9 0 0 1 12 0M4.5 9a5.5 5.5 0 0 1 7 0M7 11.5a2 2 0 0 1 2 0M2.5 2.5l11 11" fill="none"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

interface PropsCarta {
  codigo: string; seleccionada?: boolean; nueva?: boolean; grupo?: number; onClick?: () => void;
  onDragStart?: () => void; onDrop?: () => void;
}

function Carta({ codigo, seleccionada, nueva, grupo = -1, onClick, onDragStart, onDrop }: PropsCarta) {
  const c = infoCarta(codigo);
  return (
    <div className={['carta', c.roja ? 'roja' : '', seleccionada ? 'sel' : '', nueva ? 'nueva' : '',
      grupo >= 0 ? `en-grupo g${grupo % 4}` : ''].join(' ')}
      onClick={onClick} draggable={!!onDragStart} onDragStart={onDragStart}
      onDragOver={(ev) => ev.preventDefault()} onDrop={onDrop} title={`${c.puntos} puntos`}>
      {/* U03 (sesion S1): indice de esquina (valor + pinta) aparte del recuadro central con el simbolo */}
      <span className="indice"><b>{c.valor}</b>{c.simbolo && <span>{c.simbolo}</span>}</span>
      <span className="recuadro" aria-hidden="true">{c.simbolo || c.valor}</span>
    </div>
  );
}

interface EstadoChat { abierto: boolean; sinLeer: number; alternar: () => void; cerrar: () => void }

/**
 * Estado del chat ligero. En el telefono el chat es una hoja que se abre con el boton de la barra (con los mensajes
 * sin leer de los demas); en escritorio va siempre a la vista en el lateral. Sin dependencias de la piel animada.
 */
function useChatLigero(mesa: VistaMesa): EstadoChat {
  const [abierto, setAbierto] = useState(false);
  const [leidoHasta, setLeidoHasta] = useState(0);
  const ultimo = mesa.chat[mesa.chat.length - 1];
  useEffect(() => { if (abierto && ultimo) setLeidoHasta(ultimo.id); }, [abierto, ultimo]);
  const sinLeer = abierto ? 0 : mesa.chat.filter((m) => m.id > leidoHasta && m.jugadorId !== mesa.yo).length;
  return { abierto, sinLeer, alternar: () => setAbierto((v) => !v), cerrar: () => setAbierto(false) };
}

/** Chat en vivo de la mesa, sin animaciones: lista con desplazamiento y un campo para escribir. */
function ChatLigero({ mesa, estado }: { mesa: VistaMesa; estado: EstadoChat }) {
  const [texto, setTexto] = useState('');
  const lista = useRef<HTMLUListElement>(null);
  useEffect(() => { lista.current?.scrollTo({ top: lista.current.scrollHeight }); }, [mesa.chat.length, estado.abierto]);
  const enviar = (ev: FormEvent) => { ev.preventDefault(); mesa.enviarChat(texto); setTexto(''); };
  return (
    <section id="chat-mesa" className={estado.abierto ? 'chat abierto' : 'chat'} aria-label="Chat de la mesa">
      <div className="chat-cabecera">
        <h2>Chat</h2>
        <button className="enlace chat-cerrar" onClick={estado.cerrar}>Cerrar</button>
      </div>
      <ul ref={lista} className="chat-lista" aria-live="polite">
        {mesa.chat.length === 0 && <li className="tenue">Nadie ha escrito todavía.</li>}
        {mesa.chat.map((m) => (
          <li key={m.id} className={m.jugadorId === mesa.yo ? 'mio' : ''}>
            <b>{m.jugadorId === mesa.yo ? 'Tú' : mesa.nombre(m.jugadorId)}</b> {m.texto}
          </li>
        ))}
      </ul>
      <form className="fila" onSubmit={enviar}>
        <input aria-label="Mensaje para la mesa" placeholder="Escribe a la mesa" maxLength={LARGO_CHAT} value={texto}
          onChange={(e) => setTexto(e.target.value)} />
        <button type="submit" disabled={!texto.trim()}>Enviar</button>
      </form>
    </section>
  );
}

// Version ligera de la mesa: la interfaz original, sin animaciones, pensada para telefonos de bajos recursos.
// Solo recibe lo que entrega useMesa(); no conoce la conexion ni las reglas (RD4, FF-19).
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { gruposEnOrden, infoCarta, ordenarPorGrupos } from '../../cartas';
import {
  ayudaCierre, LARGO_CHAT, MOTIVO_FIN, NOMBRE_MODALIDAD, pistaCierre, textoAvance, TIPO_CIERRE,
} from '../../mensajes';
import type { VistaMesa } from '../../estado/tipos';

export default function MesaLigera({ mesa }: { mesa: VistaMesa }) {
  const { e, nombre, jugadores, seleccion, cartaSel, miTurno, debeRobar, debeDescartar, segundos, aviso, fin,
    liquidacion, historial, bitacora, avance } = mesa;
  const arrastrada = useRef<number | null>(null);
  // Grupos y avance calculados por el servidor (RF16, RD4): aqui solo se muestran.
  const grupos = useMemo(() => gruposEnOrden(e.orden, avance?.grupos ?? []), [e.orden, avance]);
  const puedeCerrar = debeDescartar && !!avance?.puedeCerrar;
  const sugerida = avance?.descarteSugerido ?? null;

  return (
    <main className="mesa">
      <header className="barra">
        <div><strong>{NOMBRE_MODALIDAD[e.modalidad] ?? 'Partida'}</strong> · Ronda {e.ronda} · Sala {mesa.codigo}</div>
        <div className={mesa.conectado ? 'estado ok' : 'estado caido'}>{mesa.conectado ? 'Conectado' : 'Reconectando…'}</div>
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
        <ChatLigero mesa={mesa} />
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
          <button className="principal" onClick={mesa.salir}>Volver al inicio</button>
        </div></div>
      )}
    </main>
  );
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
      <span className="valor">{c.valor}</span><span className="pinta">{c.simbolo}</span>
    </div>
  );
}

/** Chat en vivo de la mesa, sin animaciones: lista con desplazamiento y un campo para escribir. */
function ChatLigero({ mesa }: { mesa: VistaMesa }) {
  const [texto, setTexto] = useState('');
  const lista = useRef<HTMLUListElement>(null);
  useEffect(() => { lista.current?.scrollTo({ top: lista.current.scrollHeight }); }, [mesa.chat.length]);
  const enviar = (ev: FormEvent) => { ev.preventDefault(); mesa.enviarChat(texto); setTexto(''); };
  return (
    <section className="chat" aria-label="Chat de la mesa">
      <h2>Chat</h2>
      <ul ref={lista} className="chat-lista" aria-live="polite">
        {mesa.chat.length === 0 && <li className="tenue">Nadie ha escrito todavía.</li>}
        {mesa.chat.map((m) => <li key={m.id}><b>{m.jugadorId === mesa.yo ? 'Tú' : mesa.nombre(m.jugadorId)}:</b> {m.texto}</li>)}
      </ul>
      <form className="fila" onSubmit={enviar}>
        <input aria-label="Mensaje para la mesa" placeholder="Escribe a la mesa" maxLength={LARGO_CHAT} value={texto}
          onChange={(e) => setTexto(e.target.value)} />
        <button type="submit" disabled={!texto.trim()}>Enviar</button>
      </form>
    </section>
  );
}

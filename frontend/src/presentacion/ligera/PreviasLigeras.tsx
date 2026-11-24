// Version ligera de las pantallas previas: inicio, vestibulo y sala de espera, tal como eran.
import type { VistaInicio, VistaPrevia, VistaSala, VistaVestibulo } from '../../estado/tipos';

export default function PreviasLigeras({ vista }: { vista: VistaPrevia }) {
  if (vista.pantalla === 'inicio') return <Inicio v={vista.inicio} />;
  if (vista.pantalla === 'vestibulo') return <Vestibulo v={vista.vestibulo} />;
  return <Sala v={vista.sala} />;
}

function Inicio({ v }: { v: VistaInicio }) {
  return (
    <main className="centro">
      <div className="panel">
        <h1>Mesa 101</h1>
        <p className="tenue">Apuntado a 101 y Clásica 4-3-3, en línea.</p>
        <label>Tu apodo
          <input value={v.apodo} maxLength={20} autoFocus onChange={(e) => v.setApodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && v.entrar()} />
        </label>
        <button className="principal" onClick={v.entrar} disabled={!v.puedeEntrar}>Entrar</button>
        {v.error && <p className="error">{v.error}</p>}
      </div>
    </main>
  );
}

function Vestibulo({ v }: { v: VistaVestibulo }) {
  return (
    <main className="centro">
      <div className="panel">
        <h1>Hola, {v.apodo}</h1>
        <button className="principal" onClick={v.crear}>Crear una sala</button>
        <div className="separador">o únete con un código</div>
        <div className="fila">
          <input placeholder="Código de sala" value={v.codigo} maxLength={6}
            onChange={(e) => v.setCodigo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && v.unirse()} />
          <button onClick={v.unirse} disabled={!v.puedeUnirse}>Unirme</button>
        </div>
        {v.error && <p className="error">{v.error}</p>}
        <button className="enlace" onClick={v.cambiarApodo}>Cambiar de apodo</button>
      </div>
    </main>
  );
}

/** Sala de espera: muestra quien llego y deja al anfitrion elegir la modalidad e iniciar. */
function Sala({ v }: { v: VistaSala }) {
  const { estado, opciones, cambiar } = v;
  return (
    <main className="centro">
      <div className="panel ancho">
        <p className="tenue">Comparte este código con los demás jugadores</p>
        <div className="codigo">{v.codigo}</div>
        <h2>Jugadores ({estado?.jugadores.length ?? 0}/6)</h2>
        <ul className="lista-jugadores">
          {estado?.jugadores.map((j) => (
            <li key={j.sub}>{j.alias}{j.sub === estado.anfitrion && <span className="etiqueta">anfitrión</span>}
              {j.sub === v.yo && <span className="etiqueta">tú</span>}</li>
          ))}
        </ul>
        {v.soyAnfitrion ? (
          <section className="opciones">
            <h2>Modalidad</h2>
            <div className="modalidades">
              {(['APUNTADO_101', 'CLASICA_433'] as const).map((m) => (
                <button key={m} className={opciones.modalidad === m ? 'modalidad activa' : 'modalidad'} onClick={() => cambiar({ modalidad: m })}>
                  <strong>{m === 'APUNTADO_101' ? 'Apuntado a 101' : 'Clásica 4-3-3'}</strong>
                  <span>{m === 'APUNTADO_101'
                    ? 'Cierra con 3 ternas y sobrante < 5 puntos. Se juegan rondas hasta que los demás llegan a 101.'
                    : 'Cierra con 1 cuarta + 2 ternas + 1 descarte. Una sola ronda.'}</span>
                </button>
              ))}
            </div>
            <label className="casilla"><input type="checkbox" checked={opciones.robarDelDescarte}
              onChange={(e) => cambiar({ robarDelDescarte: e.target.checked })} /> Permitir robar del pozo</label>
            <label>Segundos por turno
              <input type="number" min={15} max={300} value={opciones.segundosPorTurno}
                onChange={(e) => cambiar({ segundosPorTurno: Number(e.target.value) })} /></label>
            {opciones.modalidad === 'APUNTADO_101' && (
              <label>Puntos de eliminación
                <input type="number" min={10} max={500} value={opciones.umbral ?? 101}
                  onChange={(e) => cambiar({ umbral: Number(e.target.value) })} /></label>
            )}
            <button className="principal" onClick={v.iniciar} disabled={!v.puedeIniciar}>Iniciar partida</button>
          </section>
        ) : (
          <p className="tenue">Esperando a que el anfitrión elija la modalidad e inicie…</p>
        )}
        {v.error && <p className="error">{v.error}</p>}
        <button className="enlace" onClick={v.salir}>Salir de la sala</button>
      </div>
    </main>
  );
}

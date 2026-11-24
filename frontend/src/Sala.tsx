import { useEffect, useState } from 'react';
import { api, ErrorApi, EstadoSala, OpcionesPartida, Sesion } from './api';
import { mensajeDe } from './mensajes';

interface Props { sesion: Sesion; codigo: string; alIniciar: (partidaId: number) => void; alSalir: () => void }

/** Sala de espera: muestra quien llego y deja al anfitrion elegir la modalidad e iniciar. */
export default function Sala({ sesion, codigo, alIniciar, alSalir }: Props) {
  const [estado, setEstado] = useState<EstadoSala | null>(null);
  const [error, setError] = useState('');
  const [opciones, setOpciones] = useState<OpcionesPartida>({
    modalidad: 'APUNTADO_101', robarDelDescarte: true, umbral: 101, segundosPorTurno: 60,
    comodines: false, cierreAPintas: false, segundoMazo: false,
  });

  useEffect(() => {
    let vivo = true;
    const consultar = async () => {
      try {
        const e = await api.estadoSala(sesion.token, codigo);
        if (!vivo) return;
        setEstado(e);
        if (e.partidaId !== null) alIniciar(e.partidaId);
      } catch (e) {
        if (vivo) setError(mensajeDe(e instanceof ErrorApi ? e.motivo : 'Sin conexión'));
      }
    };
    void consultar();
    const t = setInterval(consultar, 1500);
    return () => { vivo = false; clearInterval(t); };
  }, [sesion.token, codigo, alIniciar]);

  const soyAnfitrion = estado?.anfitrion === sesion.sub;
  const iniciar = async () => {
    try {
      const cuerpo = { ...opciones, umbral: opciones.modalidad === 'APUNTADO_101' ? opciones.umbral : null };
      alIniciar((await api.iniciar(sesion.token, codigo, cuerpo)).partidaId);
    } catch (e) { setError(mensajeDe(e instanceof ErrorApi ? e.motivo : 'Sin conexión')); }
  };
  const cambiar = (o: Partial<OpcionesPartida>) => setOpciones({ ...opciones, ...o });

  return (
    <main className="centro">
      <div className="panel ancho">
        <p className="tenue">Comparte este código con los demás jugadores</p>
        <div className="codigo">{codigo}</div>
        <h2>Jugadores ({estado?.jugadores.length ?? 0}/6)</h2>
        <ul className="lista-jugadores">
          {estado?.jugadores.map((j) => (
            <li key={j.sub}>{j.alias}{j.sub === estado.anfitrion && <span className="etiqueta">anfitrión</span>}
              {j.sub === sesion.sub && <span className="etiqueta">tú</span>}</li>
          ))}
        </ul>
        {soyAnfitrion ? (
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
            <button className="principal" onClick={iniciar} disabled={(estado?.jugadores.length ?? 0) < 2}>Iniciar partida</button>
          </section>
        ) : (
          <p className="tenue">Esperando a que el anfitrión elija la modalidad e inicie…</p>
        )}
        {error && <p className="error">{error}</p>}
        <button className="enlace" onClick={alSalir}>Salir de la sala</button>
      </div>
    </main>
  );
}

import { useState } from 'react';
import { api, ErrorApi, guardado, Sesion } from './api';
import { mensajeDe } from './mensajes';
import Sala from './Sala';
import Mesa from './Mesa';

interface Lugar { codigo: string; partidaId: number | null }

export default function App() {
  const [sesion, setSesion] = useState<Sesion | null>(() => {
    const s = guardado.leer<Sesion>('sesion');
    return s && new Date(s.venceEn) > new Date() ? s : null;
  });
  const [lugar, setLugar] = useState<Lugar | null>(() => guardado.leer<Lugar>('lugar'));

  const irA = (l: Lugar | null) => {
    setLugar(l);
    if (l) guardado.escribir('lugar', l); else guardado.borrar('lugar');
  };
  const salir = () => { guardado.borrar('sesion'); irA(null); setSesion(null); };

  if (!sesion) return <Inicio alEntrar={(s) => { guardado.escribir('sesion', s); setSesion(s); }} />;
  if (!lugar) return <Vestibulo sesion={sesion} alEntrarSala={(codigo) => irA({ codigo, partidaId: null })} alSalir={salir} />;
  if (lugar.partidaId === null) {
    return <Sala sesion={sesion} codigo={lugar.codigo}
      alIniciar={(partidaId) => irA({ codigo: lugar.codigo, partidaId })} alSalir={() => irA(null)} />;
  }
  return <Mesa sesion={sesion} codigo={lugar.codigo} partidaId={lugar.partidaId} alSalir={() => irA(null)} />;
}

function Inicio({ alEntrar }: { alEntrar: (s: Sesion) => void }) {
  const [apodo, setApodo] = useState('');
  const [error, setError] = useState('');
  const entrar = async () => {
    try { alEntrar(await api.abrirSesion(apodo)); } catch (e) { setError(mensajeDe(e instanceof ErrorApi ? e.motivo : 'Sin conexión')); }
  };
  return (
    <main className="centro">
      <div className="panel">
        <h1>Mesa 101</h1>
        <p className="tenue">Apuntado a 101 y Clásica 4-3-3, en línea.</p>
        <label>Tu apodo
          <input value={apodo} maxLength={20} autoFocus onChange={(e) => setApodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && entrar()} />
        </label>
        <button className="principal" onClick={entrar} disabled={!apodo.trim()}>Entrar</button>
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}

function Vestibulo({ sesion, alEntrarSala, alSalir }: { sesion: Sesion; alEntrarSala: (c: string) => void; alSalir: () => void }) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const intentar = async (accion: () => Promise<string>) => {
    try { alEntrarSala(await accion()); } catch (e) { setError(mensajeDe(e instanceof ErrorApi ? e.motivo : 'Sin conexión')); }
  };
  const crear = () => intentar(async () => (await api.crearSala(sesion.token)).codigo);
  const unirse = () => intentar(async () => {
    const c = codigo.trim().toUpperCase();
    await api.unirse(sesion.token, c);
    return c;
  });
  return (
    <main className="centro">
      <div className="panel">
        <h1>Hola, {sesion.apodo}</h1>
        <button className="principal" onClick={crear}>Crear una sala</button>
        <div className="separador">o únete con un código</div>
        <div className="fila">
          <input placeholder="Código de sala" value={codigo} maxLength={6}
            onChange={(e) => setCodigo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unirse()} />
          <button onClick={unirse} disabled={codigo.trim().length !== 6}>Unirme</button>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="enlace" onClick={alSalir}>Cambiar de apodo</button>
      </div>
    </main>
  );
}

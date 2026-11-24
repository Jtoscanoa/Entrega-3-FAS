// Estado de las pantallas previas a la mesa (inicio, vestibulo y sala de espera).
// Igual que useMesa(), vive por encima de las pieles: cambiar de version no pierde lo escrito ni la sala.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ErrorApi, guardado } from '../api';
import { mensajeDe } from '../mensajes';
import type { EstadoSala, OpcionesPartida, Sesion, VistaInicio, VistaSala, VistaVestibulo } from './tipos';

const motivo = (e: unknown) => mensajeDe(e instanceof ErrorApi ? e.motivo : 'Sin conexión');

export interface Lugar { codigo: string; partidaId: number | null }

/** Sesion de invitado y lugar actual, guardados por pestana (cada pestana es un jugador). */
export function useNavegacion() {
  const [sesion, setSesion] = useState<Sesion | null>(() => {
    const s = guardado.leer<Sesion>('sesion');
    return s && new Date(s.venceEn) > new Date() ? s : null;
  });
  const [lugar, setLugar] = useState<Lugar | null>(() => guardado.leer<Lugar>('lugar'));
  const [aviso, setAviso] = useState('');

  /** {@code avisoAlLlegar} se muestra en la pantalla de destino hasta la siguiente navegacion. */
  const irA = useCallback((l: Lugar | null, avisoAlLlegar = '') => {
    setLugar(l);
    setAviso(avisoAlLlegar);
    if (l) guardado.escribir('lugar', l); else guardado.borrar('lugar');
  }, []);
  const entrar = useCallback((s: Sesion) => { guardado.escribir('sesion', s); setSesion(s); }, []);
  const salir = useCallback(() => { guardado.borrar('sesion'); irA(null); setSesion(null); }, [irA]);
  return { sesion, lugar, aviso, irA, entrar, salir };
}

export function useInicio(alEntrar: (s: Sesion) => void): VistaInicio {
  const [apodo, setApodo] = useState('');
  const [error, setError] = useState('');
  const entrar = async () => {
    try { alEntrar(await api.abrirSesion(apodo)); } catch (e) { setError(motivo(e)); }
  };
  return { apodo, setApodo, error, puedeEntrar: apodo.trim().length > 0, entrar: () => void entrar() };
}

export function useVestibulo(sesion: Sesion | null, alEntrarSala: (codigo: string) => void,
                             alCambiarApodo: () => void, aviso = ''): VistaVestibulo {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const intentar = async (accion: () => Promise<string>) => {
    try { alEntrarSala(await accion()); } catch (e) { setError(motivo(e)); }
  };
  const token = sesion?.token ?? '';
  return {
    apodo: sesion?.apodo ?? '', codigo, setCodigo, error,
    puedeUnirse: codigo.trim().length === 6,
    crear: () => void intentar(async () => (await api.crearSala(token)).codigo),
    unirse: () => void intentar(async () => {
      const c = codigo.trim().toUpperCase();
      await api.unirse(token, c);
      return c;
    }),
    cambiarApodo: alCambiarApodo,
    aviso,
  };
}

const OPCIONES_INICIALES: OpcionesPartida = {
  modalidad: 'APUNTADO_101', robarDelDescarte: true, umbral: 101, segundosPorTurno: 60,
  comodines: false, cierreAPintas: false, segundoMazo: false,
};

/** Sala de espera: consulta el estado cada 1,5 s mientras {@code codigo} no sea null. */
export function useSala(sesion: Sesion | null, codigo: string | null, alIniciar: (partidaId: number) => void,
                        alSalir: () => void): VistaSala {
  const [estado, setEstado] = useState<EstadoSala | null>(null);
  const [error, setError] = useState('');
  const [opciones, setOpciones] = useState<OpcionesPartida>(OPCIONES_INICIALES);
  const alIniciarRef = useRef(alIniciar);
  alIniciarRef.current = alIniciar;
  const token = sesion?.token ?? null;

  useEffect(() => {
    setEstado(null);
    setError('');
    if (!token || !codigo) return undefined;
    let vivo = true;
    const consultar = async () => {
      try {
        const e = await api.estadoSala(token, codigo);
        if (!vivo) return;
        setEstado(e);
        if (e.partidaId !== null) alIniciarRef.current(e.partidaId);
      } catch (e) {
        if (vivo) setError(motivo(e));
      }
    };
    void consultar();
    const t = setInterval(consultar, 1500);
    return () => { vivo = false; clearInterval(t); };
  }, [token, codigo]);

  const iniciar = async () => {
    if (!token || !codigo) return;
    try {
      const cuerpo = { ...opciones, umbral: opciones.modalidad === 'APUNTADO_101' ? opciones.umbral : null };
      alIniciarRef.current((await api.iniciar(token, codigo, cuerpo)).partidaId);
    } catch (e) { setError(motivo(e)); }
  };

  return {
    codigo: codigo ?? '', yo: sesion?.sub ?? '', estado, opciones, error,
    soyAnfitrion: !!estado && estado.anfitrion === sesion?.sub,
    cambiar: (o) => setOpciones((actual) => ({ ...actual, ...o })),
    puedeIniciar: (estado?.jugadores.length ?? 0) >= 2,
    iniciar: () => void iniciar(),
    salir: alSalir,
  };
}

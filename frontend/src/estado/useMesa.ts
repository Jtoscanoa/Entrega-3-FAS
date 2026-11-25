// Unica fuente de estado de la mesa. Vive por encima de las dos pieles: cambiar de version no reconecta.
// La SPA no valida reglas (RD4): solo refleja lo que el servidor comunica y le envia las intenciones del jugador.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, conectarMesa, ConexionMesa, ManejadoresMesa } from '../api';
import { infoCarta, ordenarPorPinta, ordenarPorValor, reconciliar } from '../cartas';
import { mensajeDe, PARTIDA_INTERRUMPIDA, rondaPendiente } from '../mensajes';
import type {
  AvanceMano, Aviso, EstadoMesa, EventoMesa, FinPartida, Liquidacion, Mensaje, MensajeChat, OrigenRobo, Sesion, VistaMesa,
} from './tipos';

/** Puertos hacia el servidor. Se inyectan para poder ejercitar el hook sin red (modo demostracion). */
export interface ConectorMesa {
  conectar: (token: string, partidaId: number, h: ManejadoresMesa) => ConexionMesa;
  nombres: (token: string, codigo: string) => Promise<Record<string, string>>;
}

export const conectorServidor: ConectorMesa = {
  conectar: conectarMesa,
  nombres: async (token, codigo) => {
    const s = await api.estadoSala(token, codigo);
    return Object.fromEntries(s.jugadores.map((j) => [j.sub, j.alias]));
  },
};

/** {@code alSalir} recibe un aviso opcional para mostrar en el vestibulo. */
export interface ParametrosMesa { sesion: Sesion; codigo: string; partidaId: number; alSalir: (aviso?: string) => void }

/** Espera antes de pedir de nuevo la ronda que el servidor no pudo abrir (D9). */
const REINTENTO_RONDA_MS = 3000;

const INICIAL: EstadoMesa = {
  ronda: 0, orden: [], cima: null, marcador: {}, turnoDe: null, numeroTurno: 0, fase: '', modalidad: '',
  umbral: 101, robarDelDescarte: false, eliminados: [], finalizada: false, venceEn: null, nueva: null, turnoDesde: null,
  ausentes: [], avance: null,
};

/** La evaluacion del servidor trae indices de su mano; aqui se pasan a codigos de carta. */
function avanceDe(ev: any, mano: string[]): AvanceMano | null {
  if (!ev) return null;
  const carta = (i: number) => mano[i];
  return {
    grupos: (ev.grupos as number[][]).map((g) => g.map(carta)), cuartasFormadas: ev.cuartasFormadas,
    cuartasRequeridas: ev.cuartasRequeridas, ternasFormadas: ev.ternasFormadas, ternasRequeridas: ev.ternasRequeridas,
    puntosSobrantes: ev.puntosSobrantes, puedeCerrar: ev.puedeCerrar,
    descarteSugerido: ev.descarteSugerido == null ? null : carta(ev.descarteSugerido), cartas: mano.length,
  };
}
const MAX_EVENTOS = 40;

/**
 * U01 (sesion S1): el orden elegido con "por pinta" o "por numero" se conserva cuando llega una carta. Mover o agrupar
 * a mano lo desactiva hasta que el jugador vuelva a pulsar uno de los dos botones.
 */
type ModoOrden = 'pinta' | 'numero' | null;
function aplicarModo(modo: ModoOrden, cartas: string[]): string[] {
  if (modo === 'pinta') return ordenarPorPinta(cartas);
  if (modo === 'numero') return ordenarPorValor(cartas);
  return cartas;
}
const MAX_CHAT = 60;

function quitarUna(cartas: string[], carta: string): string[] {
  const i = cartas.indexOf(carta);
  return i < 0 ? cartas : [...cartas.slice(0, i), ...cartas.slice(i + 1)];
}

export function useMesa({ sesion, codigo, partidaId, alSalir }: ParametrosMesa,
                        conector: ConectorMesa = conectorServidor): VistaMesa {
  const [e, setE] = useState<EstadoMesa>(INICIAL);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [conectado, setConectado] = useState(false);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [bitacora, setBitacora] = useState<string[]>([]);
  const [liquidacion, setLiquidacion] = useState<Liquidacion | null>(null);
  const [historial, setHistorial] = useState<Liquidacion[]>([]);
  const [fin, setFin] = useState<FinPartida | null>(null);
  const [eventos, setEventos] = useState<EventoMesa[]>([]);
  const [chat, setChat] = useState<MensajeChat[]>([]);
  const siguienteChat = useRef(1);
  const [ahora, setAhora] = useState(Date.now());
  const conexion = useRef<ConexionMesa | null>(null);
  const nombresRef = useRef(nombres);
  nombresRef.current = nombres;
  const siguienteEvento = useRef(1);
  const ultimoRoboPropio = useRef<OrigenRobo | null>(null);
  const ausentesRef = useRef<string[]>([]);
  ausentesRef.current = e.ausentes;
  const finalizadaRef = useRef(false);
  finalizadaRef.current = e.finalizada;
  const alSalirRef = useRef(alSalir);
  alSalirRef.current = alSalir;
  const reintento = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modoOrden = useRef<ModoOrden>('pinta');

  const nombre = useCallback((sub: string | null) =>
    !sub ? '—' : sub === sesion.sub ? 'Tú' : nombresRef.current[sub] ?? 'Jugador', [sesion.sub]);
  const anotar = useCallback((t: string) => setBitacora((b) => [t, ...b].slice(0, 8)), []);
  /** Conjuga en segunda persona cuando la accion es del propio jugador ("Tú descartaste" y no "Tú descartó"). */
  const quien = useCallback((sub: string, tercera: string, segunda: string) =>
    sub === sesion.sub ? `Tú ${segunda}` : `${nombre(sub)} ${tercera}`, [nombre, sesion.sub]);
  const registrar = useCallback((ev: DistributiveOmit<EventoMesa, 'id'>) => {
    const conId = { ...ev, id: siguienteEvento.current++ } as EventoMesa;
    setEventos((l) => [...l, conId].slice(-MAX_EVENTOS));
  }, []);

  const alMensaje = useCallback((m: Mensaje) => {
    const d = m.datos;
    switch (m.tipo) {
      case 'VistaPartida':
        setE((s) => ({
          ...s, ronda: d.numeroRonda, orden: aplicarModo(modoOrden.current, reconciliar(s.orden, d.mano)), cima: d.cimaDescarte, marcador: d.marcador,
          turnoDe: d.turnoDe, numeroTurno: d.numeroTurno, fase: d.fase, modalidad: d.modalidad, umbral: d.umbral,
          robarDelDescarte: d.robarDelDescarte, eliminados: d.eliminados, finalizada: d.finalizada,
          ausentes: Array.isArray(d.conectados)
            ? Object.keys(d.marcador).filter((sub) => !d.conectados.includes(sub)) : s.ausentes,
          avance: avanceDe(d.evaluacion, d.mano),
        }));
        break;
      case 'Presencia': {
        // Solo se anotan cambios reales: la primera llegada de un jugador no es un "volvió".
        if (d.jugadorId === sesion.sub || ausentesRef.current.includes(d.jugadorId) !== d.conectado) break;
        setE((s) => ({ ...s, ausentes: d.conectado
          ? s.ausentes.filter((x) => x !== d.jugadorId)
          : Array.from(new Set([...s.ausentes, d.jugadorId])) }));
        anotar(`${nombre(d.jugadorId)} ${d.conectado ? 'volvió' : 'se desconectó'}.`);
        break;
      }
      case 'RondaIniciada':
        setE((s) => ({ ...s, ronda: d.numeroRonda, cima: d.cimaDescarte, nueva: null }));
        setSeleccion(null);
        anotar(`Empieza la ronda ${d.numeroRonda}. ${quien(d.abridor, 'abre', 'abres')}.`);
        conexion.current?.reanudar();
        break;
      case 'ManoEntregada':
        modoOrden.current = 'pinta';
        setE((s) => ({ ...s, orden: ordenarPorPinta(d.cartas) }));
        registrar({ tipo: 'reparto', cartas: d.cartas.length });
        break;
      case 'TurnoAsignado':
        setE((s) => ({ ...s, turnoDe: d.jugadorId, numeroTurno: d.numeroTurno, venceEn: d.venceEn, turnoDesde: Date.now() }));
        conexion.current?.reanudar();
        break;
      case 'CartaRobada':
        anotar(`${quien(d.jugadorId, 'robó', 'robaste')} del ${d.origen === 'DESCARTE' ? 'pozo' : 'mazo'}.`);
        if (d.jugadorId === sesion.sub) ultimoRoboPropio.current = d.origen;
        registrar({ tipo: 'robo', jugadorId: d.jugadorId, origen: d.origen });
        conexion.current?.reanudar();
        break;
      case 'CartaRecibida':
        setE((s) => ({ ...s, orden: aplicarModo(modoOrden.current, [...s.orden, d.carta]), nueva: d.carta,
          fase: 'ESPERANDO_DESCARTE' }));
        registrar({ tipo: 'recibida', carta: d.carta, origen: ultimoRoboPropio.current });
        ultimoRoboPropio.current = null;
        break;
      case 'CartaDescartada':
        setE((s) => ({ ...s, cima: d.carta, nueva: null,
          orden: d.jugadorId === sesion.sub ? quitarUna(s.orden, d.carta) : s.orden }));
        if (d.jugadorId === sesion.sub) setSeleccion(null);
        anotar(`${quien(d.jugadorId, 'descartó', 'descartaste')} ${infoCarta(d.carta).valor}${infoCarta(d.carta).simbolo}.`);
        registrar({ tipo: 'descarte', jugadorId: d.jugadorId, carta: d.carta });
        break;
      case 'MazoRepuesto':
        anotar('Se acabó el mazo: el pozo se rebarajó.');
        break;
      case 'CierreRechazado':
        setAviso({ texto: `Cierre rechazado: ${d.motivo}`, tipo: 'error', cierre: true });
        registrar({ tipo: 'rechazo', motivo: d.motivo });
        break;
      case 'RondaLiquidada': {
        const l: Liquidacion = { ronda: d.numeroRonda, cerrador: d.cerradorId, tipoCierre: d.tipoCierre,
          puntosRonda: d.puntosRonda, marcador: d.marcador, eliminados: d.eliminados ?? [] };
        setLiquidacion(l);
        setHistorial((h) => [...h, l]);
        setE((s) => ({ ...s, marcador: { ...s.marcador, ...d.marcador },
          eliminados: Array.from(new Set([...s.eliminados, ...(d.eliminados ?? [])])) }));
        anotar(`${quien(d.cerradorId, 'cerró', 'cerraste')} la ronda ${d.numeroRonda}.`);
        registrar({ tipo: 'liquidacion', ronda: d.numeroRonda });
        break;
      }
      case 'RondaPendiente':
        // D9: la liquidacion ya quedo guardada; reanudar es idempotente y un solo reintento por cliente basta.
        setAviso({ texto: rondaPendiente(d.numeroRonda), tipo: 'info', cierre: false });
        if (!reintento.current) {
          reintento.current = setTimeout(() => { reintento.current = null; conexion.current?.reanudar(); },
            REINTENTO_RONDA_MS);
        }
        break;
      case 'Chat':
        setChat((l) => [...l, { id: siguienteChat.current++, jugadorId: d.jugadorId, texto: d.texto, hora: d.hora }]
          .slice(-MAX_CHAT));
        break;
      case 'PartidaFinalizada':
        setFin({ ganador: d.ganadorId, motivo: d.motivo });
        setE((s) => ({ ...s, finalizada: true, turnoDe: null }));
        registrar({ tipo: 'fin' });
        break;
      default:
        break;
    }
  }, [anotar, nombre, quien, registrar, sesion.sub]);

  useEffect(() => {
    conector.nombres(sesion.token, codigo).then(setNombres).catch(() => undefined);
    const c = conector.conectar(sesion.token, partidaId, {
      alMensaje,
      alError: (motivo) => {
        // Retro E2 2.3: tras un reinicio la partida ya no esta en memoria; se vuelve al vestibulo explicando que paso.
        if (motivo === 'PARTIDA_INEXISTENTE' && !finalizadaRef.current) {
          c.cerrarConexion();
          alSalirRef.current(PARTIDA_INTERRUMPIDA);
          return;
        }
        setAviso({ texto: mensajeDe(motivo), tipo: 'error', cierre: false });
      },
      alConectar: () => { setConectado(true); c.reanudar(); },
      alDesconectar: () => setConectado(false),
    });
    conexion.current = c;
    return () => {
      c.cerrarConexion();
      if (reintento.current) clearTimeout(reintento.current);
      reintento.current = null;
    };
  }, [sesion.token, codigo, partidaId, alMensaje, conector]);

  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 500); return () => clearInterval(t); }, []);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 6000); return () => clearTimeout(t); }, [aviso]);

  const miTurno = e.turnoDe === sesion.sub && !e.finalizada;
  const debeRobar = miTurno && e.fase === 'ESPERANDO_ROBO';
  const debeDescartar = miTurno && e.fase === 'ESPERANDO_DESCARTE';
  const cartaSel = seleccion !== null ? e.orden[seleccion] ?? null : null;
  const segundos = e.venceEn ? Math.max(0, Math.ceil((new Date(e.venceEn).getTime() - ahora) / 1000)) : null;
  const jugadores = useMemo(() => (Object.keys(e.marcador).length ? Object.keys(e.marcador) : Object.keys(nombres)),
    [e.marcador, nombres]);

  const turnoAusente = !!e.turnoDe && e.turnoDe !== sesion.sub && e.ausentes.includes(e.turnoDe);
  let instruccion = `Turno de ${nombre(e.turnoDe)}. Espera tu turno.`;
  if (turnoAusente) {
    instruccion = segundos !== null
      ? `Turno de ${nombre(e.turnoDe)} (sin conexión): se juega solo en ${segundos} s.`
      : `Turno de ${nombre(e.turnoDe)} (sin conexión): se jugará solo.`;
  }
  if (e.finalizada) instruccion = 'La partida terminó.';
  else if (debeRobar) instruccion = e.robarDelDescarte ? 'Tu turno: roba una carta del mazo o del pozo.' : 'Tu turno: roba una carta del mazo.';
  else if (debeDescartar) instruccion = 'Elige una carta y descártala, o úsala como descarte para cerrar la ronda.';

  const avance = e.avance && e.avance.cartas === e.orden.length && !e.finalizada ? e.avance : null;

  const mover = useCallback((desde: number, hasta: number) => {
    modoOrden.current = null;
    setE((s) => { const o = [...s.orden]; const [c] = o.splice(desde, 1); o.splice(hasta, 0, c); return { ...s, orden: o }; });
    setSeleccion(null);
  }, []);
  const reordenar = useCallback((orden: string[]) => {
    modoOrden.current = null;
    setE((s) => ({ ...s, orden }));
  }, []);
  const salir = useCallback(() => { conexion.current?.cerrarConexion(); alSalir(); }, [alSalir]);

  return {
    yo: sesion.sub, codigo, e, conectado, nombre, jugadores, seleccion, cartaSel, miTurno, debeRobar, debeDescartar,
    segundos, instruccion, avance, aviso, bitacora, liquidacion, historial, fin, eventos, chat,
    enviarChat: (texto) => { if (texto.trim()) conexion.current?.chatear(texto); },
    alias: (sub) => nombresRef.current[sub] ?? (sub === sesion.sub ? 'Tú' : 'Jugador'),
    seleccionar: setSeleccion,
    robar: (delDescarte) => conexion.current?.robar(delDescarte, e.numeroTurno),
    descartar: () => { if (cartaSel) conexion.current?.descartar(cartaSel, e.numeroTurno); },
    cerrar: () => { if (cartaSel) conexion.current?.cerrar(cartaSel, e.numeroTurno); },
    mover,
    reordenar,
    ordenarPorPinta: () => { modoOrden.current = 'pinta'; setE((s) => ({ ...s, orden: ordenarPorPinta(s.orden) })); },
    ordenarPorValor: () => { modoOrden.current = 'numero'; setE((s) => ({ ...s, orden: ordenarPorValor(s.orden) })); },
    cerrarLiquidacion: () => setLiquidacion(null),
    salir,
  };
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

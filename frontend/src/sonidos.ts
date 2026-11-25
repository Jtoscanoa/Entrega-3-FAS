// Reproductor de efectos cortos CC0 (frontend/public/sonidos). Perezoso: cuando esta silenciado no descarga audio.
import { useEffect, useRef } from 'react';
import type { EventoMesa } from './estado/tipos';

export type SonidoMesa = 'robar' | 'descartar' | 'rechazo' | 'turno' | 'reaccion' | 'liquidacion'
  | 'seleccionar' | 'repartir' | 'tema';

/** Los efectos de interaccion suenan mas bajo que los de la partida. */
const VOLUMEN: Partial<Record<SonidoMesa, number>> = { seleccionar: 0.38, tema: 0.45 };

const cache = new Map<SonidoMesa, HTMLAudioElement>();

export function reproducirSonido(nombre: SonidoMesa, silenciado: boolean): void {
  if (silenciado || typeof Audio === 'undefined') return;
  let audio = cache.get(nombre);
  if (!audio) {
    audio = new Audio(`/sonidos/${nombre}.wav`);
    audio.volume = VOLUMEN[nombre] ?? 0.55;
    cache.set(nombre, audio);
  }
  // Si el mismo efecto aun suena (pulsaciones seguidas), se reproduce una copia: el anterior no se corta.
  const sonando = !audio.paused && !audio.ended;
  const instancia = sonando ? (audio.cloneNode(true) as HTMLAudioElement) : audio;
  instancia.volume = audio.volume;
  instancia.currentTime = 0;
  void instancia.play().catch(() => { /* el navegador exige interaccion previa antes del primer audio */ });
}

const SONIDO_EVENTO: Partial<Record<EventoMesa['tipo'], SonidoMesa>> = {
  reparto: 'repartir',
  robo: 'robar',
  descarte: 'descartar',
  rechazo: 'rechazo',
  reaccion: 'reaccion',
  liquidacion: 'liquidacion',
};

/** Dispara efectos de sonido segun los hechos nuevos de la mesa, respetando el interruptor de silencio. */
export function useSonidosMesa(
  eventos: ReadonlyArray<EventoMesa>,
  miTurno: boolean,
  numeroTurno: number,
  finalizada: boolean,
  silenciado: boolean,
): void {
  const ultimoId = useRef(eventos.length ? eventos[eventos.length - 1].id : 0);
  const ultimoTurno = useRef(0);

  useEffect(() => {
    const nuevos = eventos.filter((ev) => ev.id > ultimoId.current);
    if (!nuevos.length) return;
    ultimoId.current = nuevos[nuevos.length - 1].id;
    if (silenciado) return;
    for (const ev of nuevos) {
      const sonido = SONIDO_EVENTO[ev.tipo];
      if (sonido) reproducirSonido(sonido, false);
    }
  }, [eventos, silenciado]);

  useEffect(() => {
    if (!miTurno || finalizada || numeroTurno <= 0) return;
    if (ultimoTurno.current === numeroTurno) return;
    ultimoTurno.current = numeroTurno;
    reproducirSonido('turno', silenciado);
  }, [miTurno, numeroTurno, finalizada, silenciado]);
}

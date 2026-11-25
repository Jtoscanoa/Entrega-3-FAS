// Reproductor de efectos cortos CC0 (frontend/public/sonidos). Perezoso: cuando esta silenciado no descarga audio.
import { useEffect, useRef } from 'react';
import type { EventoMesa } from './estado/tipos';

export type SonidoMesa = 'robar' | 'descartar' | 'rechazo' | 'turno' | 'reaccion' | 'liquidacion';

const cache = new Map<SonidoMesa, HTMLAudioElement>();

export function reproducirSonido(nombre: SonidoMesa, silenciado: boolean): void {
  if (silenciado || typeof Audio === 'undefined') return;
  let audio = cache.get(nombre);
  if (!audio) {
    audio = new Audio(`/sonidos/${nombre}.wav`);
    audio.volume = 0.55;
    cache.set(nombre, audio);
  }
  audio.currentTime = 0;
  void audio.play().catch(() => { /* el navegador exige interaccion previa antes del primer audio */ });
}

const SONIDO_EVENTO: Partial<Record<EventoMesa['tipo'], SonidoMesa>> = {
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

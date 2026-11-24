// Version animada de las pantallas previas: inicio, vestibulo y sala de espera con eleccion de modalidad.
// Las transiciones entre pantallas van con AnimatePresence; solo transform y opacity.
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import type { VistaInicio, VistaPrevia, VistaSala, VistaVestibulo } from '../../estado/tipos';
import { Avatar, Carta, ContadorVivo, usePanoMesa } from './comun';
import { PartidaTutorial } from './MesaAnimada';
import './tema';

const PANTALLA = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
} as const;

export default function PreviasAnimadas({ vista }: { vista: VistaPrevia }) {
  const [pano] = usePanoMesa();
  const [tutorial, setTutorial] = useState(false);
  return (
    <MotionConfig reducedMotion="user">
      <div className="a-raiz a-previas" data-pano={pano}>
        <AnimatePresence mode="wait">
          {vista.pantalla === 'inicio' && <Inicio key="inicio" v={vista.inicio} abrirTutorial={() => setTutorial(true)} />}
          {vista.pantalla === 'vestibulo' && <Vestibulo key="vestibulo" v={vista.vestibulo} abrirTutorial={() => setTutorial(true)} />}
          {vista.pantalla === 'sala' && <Sala key={`sala-${vista.sala.codigo}`} v={vista.sala} abrirTutorial={() => setTutorial(true)} />}
        </AnimatePresence>
        {tutorial && <PartidaTutorial alCerrar={() => setTutorial(false)} />}
      </div>
    </MotionConfig>
  );
}

const ABANICO = ['AP', 'KC', 'QD', 'JT', '10P'];

function Abanico() {
  const reducido = useReducedMotion();
  return (
    <div className="a-abanico" aria-hidden="true">
      {ABANICO.map((c, i) => {
        const d = i - (ABANICO.length - 1) / 2;
        return (
          <motion.div key={c} className="a-abanico-carta"
            initial={{ rotate: 0, x: 0, y: 30, opacity: 0 }}
            animate={{ rotate: d * 11, x: d * 30, y: Math.abs(d) * 7, opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 160, damping: 20 }}>
            <motion.div animate={reducido ? undefined : { y: [0, -5, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 + i * 0.35 }}>
              <Carta codigo={c} />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

function AvisoError({ texto }: { texto: string }) {
  return (
    <AnimatePresence>
      {texto && (
        <motion.p key={texto} className="a-error" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}>{texto}</motion.p>
      )}
    </AnimatePresence>
  );
}

function Inicio({ v, abrirTutorial }: { v: VistaInicio; abrirTutorial: () => void }) {
  return (
    <motion.main className="a-pantalla" {...PANTALLA}>
      <Abanico />
      <h1 className="a-titulo">Mesa 101</h1>
      <p className="a-tenue a-lema">Apuntado a 101 y Clásica 4-3-3, en línea.</p>
      <form className="a-tarjeta" onSubmit={(ev) => { ev.preventDefault(); if (v.puedeEntrar) v.entrar(); }}>
        <label className="a-campo">Tu apodo
          <input value={v.apodo} maxLength={20} autoFocus autoComplete="nickname" onChange={(e) => v.setApodo(e.target.value)} />
        </label>
        <motion.button type="submit" className="a-boton principal ancho" disabled={!v.puedeEntrar} whileTap={{ scale: 0.97 }}>
          Entrar
        </motion.button>
        <button type="button" className="a-boton suave ancho" onClick={abrirTutorial}>Cómo jugar (Tutorial)</button>
        <AvisoError texto={v.error} />
      </form>
    </motion.main>
  );
}

function Vestibulo({ v, abrirTutorial }: { v: VistaVestibulo; abrirTutorial: () => void }) {
  return (
    <motion.main className="a-pantalla" {...PANTALLA}>
      <p className="a-sobretitulo">Mesa 101</p>
      <h1 className="a-titulo pequeno">Hola, {v.apodo}</h1>
      <div className="a-tarjeta">
        <motion.button type="button" className="a-boton principal ancho" onClick={v.crear} whileTap={{ scale: 0.97 }}>
          Crear una sala
        </motion.button>
        <div className="a-separador"><span>o únete con un código</span></div>
        <form className="a-fila-codigo" onSubmit={(ev) => { ev.preventDefault(); if (v.puedeUnirse) v.unirse(); }}>
          <input className="a-entrada-codigo" aria-label="Código de sala" placeholder="CÓDIGO" value={v.codigo} maxLength={6}
            autoCapitalize="characters" onChange={(e) => v.setCodigo(e.target.value)} />
          <motion.button type="submit" className="a-boton" disabled={!v.puedeUnirse} whileTap={{ scale: 0.97 }}>Unirme</motion.button>
        </form>
        <AvisoError texto={v.error} />
        <div className="a-prev-enlaces">
          <button type="button" className="a-boton fantasma" onClick={v.cambiarApodo}>Cambiar de apodo</button>
          <button type="button" className="a-boton fantasma" onClick={abrirTutorial}>Tutorial</button>
        </div>
      </div>
    </motion.main>
  );
}

const MODALIDADES = [
  { id: 'APUNTADO_101', nombre: 'Apuntado a 101',
    texto: 'Cierra con 3 ternas y sobrante < 5 puntos. Se juegan rondas hasta que los demás llegan a 101.' },
  { id: 'CLASICA_433', nombre: 'Clásica 4-3-3', texto: 'Cierra con 1 cuarta + 2 ternas + 1 descarte. Una sola ronda.' },
] as const;

function Sala({ v, abrirTutorial }: { v: VistaSala; abrirTutorial: () => void }) {
  const { estado, opciones, cambiar } = v;
  const reducido = useReducedMotion();
  const jugadores = estado?.jugadores ?? [];
  return (
    <motion.main className="a-pantalla ancha" {...PANTALLA}>
      <p className="a-sobretitulo">Sala de espera</p>
      <div className="a-codigo" aria-label={`Código de sala ${v.codigo.split('').join(' ')}`}>
        {v.codigo.split('').map((ch, i) => (
          <motion.span key={`${ch}-${i}`} aria-hidden="true" initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}>{ch}</motion.span>
        ))}
      </div>
      <p className="a-tenue a-centrado">Comparte este código con los demás jugadores</p>

      <div className="a-tarjeta">
        <h2 className="a-subtitulo">Jugadores <ContadorVivo valor={jugadores.length} texto={`${jugadores.length}/6`} /></h2>
        <ul className="a-jugadores">
          <AnimatePresence initial={false}>
            {jugadores.map((j) => (
              <motion.li key={j.sub} layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }}>
                <Avatar sub={j.sub} nombre={j.alias} enTurno={false} tam={34} />
                <span>{j.alias}</span>
                {j.sub === estado?.anfitrion && <span className="a-insignia">anfitrión</span>}
                {j.sub === v.yo && <span className="a-insignia tu">tú</span>}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {v.soyAnfitrion ? (
          <section className="a-opciones" aria-label="Opciones de la partida">
            <h2 className="a-subtitulo">Modalidad</h2>
            <div className="a-modalidades" role="radiogroup" aria-label="Modalidad">
              {MODALIDADES.map((m) => {
                const activa = opciones.modalidad === m.id;
                return (
                  <button key={m.id} type="button" role="radio" aria-checked={activa}
                    className={['a-modalidad', activa ? 'activa' : ''].join(' ')} onClick={() => cambiar({ modalidad: m.id })}>
                    {activa && <motion.span layoutId="modalidad-activa" className="a-modalidad-marco" aria-hidden="true"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                    <strong>{m.nombre}</strong>
                    <span>{m.texto}</span>
                  </button>
                );
              })}
            </div>
            <label className="a-interruptor">
              <input type="checkbox" checked={opciones.robarDelDescarte}
                onChange={(e) => cambiar({ robarDelDescarte: e.target.checked })} />
              <span className="a-pista" aria-hidden="true">
                <motion.span className="a-perilla" animate={{ x: opciones.robarDelDescarte ? 18 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              </span>
              Permitir robar del pozo
            </label>
            <div className="a-numeros">
              <label className="a-campo">Segundos por turno
                <input type="number" min={15} max={300} value={opciones.segundosPorTurno}
                  onChange={(e) => cambiar({ segundosPorTurno: Number(e.target.value) })} />
              </label>
              <AnimatePresence initial={false}>
                {opciones.modalidad === 'APUNTADO_101' && (
                  <motion.label key="umbral" className="a-campo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    Puntos de eliminación
                    <input type="number" min={10} max={500} value={opciones.umbral ?? 101}
                      onChange={(e) => cambiar({ umbral: Number(e.target.value) })} />
                  </motion.label>
                )}
              </AnimatePresence>
            </div>
            <motion.button type="button" className="a-boton principal ancho a-brilla" onClick={v.iniciar} disabled={!v.puedeIniciar}
              whileTap={{ scale: 0.97 }}>
              {v.puedeIniciar && !reducido && (
                <motion.span className="a-destello" aria-hidden="true" animate={{ x: ['-120%', '320%'] }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }} />
              )}
              {v.puedeIniciar ? 'Iniciar partida' : 'Esperando a otro jugador…'}
            </motion.button>
          </section>
        ) : (
          <p className="a-espera">
            <span className="a-red-puntos" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <motion.i key={i} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
              ))}
            </span>
            Esperando a que el anfitrión elija la modalidad e inicie
          </p>
        )}
        <AvisoError texto={v.error} />
        <div className="a-prev-enlaces">
          <button type="button" className="a-boton fantasma" onClick={v.salir}>Salir de la sala</button>
          <button type="button" className="a-boton fantasma" onClick={abrirTutorial}>Tutorial</button>
        </div>
      </div>
    </motion.main>
  );
}

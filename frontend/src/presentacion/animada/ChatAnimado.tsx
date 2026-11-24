// Chat en vivo de la mesa (version animada): boton en la cabecera con mensajes sin leer y un panel desplegable.
// Solo usa lo que entrega useMesa(); el servidor limpia, acota y limita la frecuencia de los mensajes.
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { LARGO_CHAT } from '../../mensajes';
import type { MensajeChat, VistaMesa } from '../../estado/tipos';

const VISTA_PREVIA_MS = 4000;

export function ChatAnimado({ mesa }: { mesa: VistaMesa }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  /** Id del ultimo mensaje visto con el panel abierto (los ids crecen; la lista se recorta a los 60 mas nuevos). */
  const [leidoHasta, setLeidoHasta] = useState(0);
  const [previa, setPrevia] = useState<MensajeChat | null>(null);
  const lista = useRef<HTMLOListElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const ultimo = mesa.chat[mesa.chat.length - 1];
  const sinLeer = abierto ? 0 : mesa.chat.filter((m) => m.id > leidoHasta && m.jugadorId !== mesa.yo).length;

  useEffect(() => { if (abierto && ultimo) setLeidoHasta(ultimo.id); }, [abierto, ultimo]);
  useEffect(() => { lista.current?.scrollTo({ top: lista.current.scrollHeight }); }, [abierto, mesa.chat.length]);
  useEffect(() => { if (abierto) entrada.current?.focus(); }, [abierto]);
  // Con el panel cerrado, el mensaje nuevo de otro jugador asoma unos segundos bajo el boton.
  useEffect(() => {
    if (abierto || !ultimo || ultimo.jugadorId === mesa.yo || ultimo.id <= leidoHasta) return undefined;
    setPrevia(ultimo);
    const t = setTimeout(() => setPrevia(null), VISTA_PREVIA_MS);
    return () => clearTimeout(t);
  }, [abierto, ultimo, mesa.yo, leidoHasta]);

  const enviar = (ev: FormEvent) => {
    ev.preventDefault();
    mesa.enviarChat(texto);
    setTexto('');
  };

  return (
    <div className="a-chat">
      <button type="button" className={['a-boton suave a-chat-boton', abierto ? 'activo' : ''].join(' ')}
        aria-expanded={abierto} aria-controls="a-chat-panel" onClick={() => { setAbierto((a) => !a); setPrevia(null); }}>
        Chat
        {sinLeer > 0 && <span className="a-chat-contador" aria-label={`${sinLeer} sin leer`}>{sinLeer}</span>}
      </button>
      <AnimatePresence>
        {previa && !abierto && (
          <motion.button key={previa.id} type="button" className="a-chat-previa" onClick={() => setAbierto(true)}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <b>{mesa.nombre(previa.jugadorId)}:</b> {previa.texto}
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {abierto && (
          <motion.section id="a-chat-panel" className="a-chat-panel" aria-label="Chat de la mesa"
            initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}>
            <header>
              <h2>Chat de la mesa</h2>
              <button type="button" className="a-boton fantasma" onClick={() => setAbierto(false)}>Cerrar</button>
            </header>
            <ol ref={lista} className="a-chat-lista" aria-live="polite">
              {mesa.chat.length === 0 && <li className="a-tenue">Nadie ha escrito todavía. ¡Saluda a la mesa!</li>}
              {mesa.chat.map((m) => (
                <li key={m.id} className={m.jugadorId === mesa.yo ? 'mio' : ''}>
                  <b>{m.jugadorId === mesa.yo ? 'Tú' : mesa.nombre(m.jugadorId)}</b>
                  <span>{m.texto}</span>
                </li>
              ))}
            </ol>
            <form className="a-chat-form" onSubmit={enviar}>
              <input ref={entrada} aria-label="Mensaje para la mesa" placeholder="Escribe a la mesa…" maxLength={LARGO_CHAT}
                value={texto} onChange={(e) => setTexto(e.target.value)} />
              <button type="submit" className="a-boton principal" disabled={!texto.trim()}>Enviar</button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

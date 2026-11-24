package co.edu.unal.apuntado.infrastructure.realtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import co.edu.unal.apuntado.domain.gameplay.ComandoInvalidoException;
import co.edu.unal.apuntado.domain.gameplay.ITurno;
import co.edu.unal.apuntado.domain.gameplay.MotivoComando;
import co.edu.unal.apuntado.domain.gameplay.Participante;
import co.edu.unal.apuntado.domain.gameplay.VistaPartida;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import co.edu.unal.apuntado.infrastructure.realtime.ChatMesa.ChatRechazado;
import co.edu.unal.apuntado.infrastructure.realtime.Comandos.Chat;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/** Chat en vivo: solo jugadores con asiento, texto limpio y acotado, frecuencia limitada y sin texto en la auditoria. */
class ChatMesaTest {

    /** Reloj que avanza a mano para probar la ventana de frecuencia. */
    private static final class RelojManual extends Clock {
        Instant ahora = Instant.parse("2026-11-24T20:00:00Z");

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zona) { return this; }
        @Override public Instant instant() { return ahora; }
    }

    /** Solo sub-a y sub-b juegan la partida 7; cualquier otra partida ya no esta en memoria. */
    private static final class TurnosConAsientos implements ITurno {
        @Override public long iniciarPartida(String c, ConfiguracionReglas cfg, List<Participante> j) { return 0; }
        @Override public void robar(long p, String j, boolean d, int n) { }
        @Override public void descartar(long p, String j, String c, int n) { }
        @Override public ResultadoValidacion cerrar(long p, String j, String c, int n) { return null; }
        @Override public void vencerTurno(long p, int n) { }
        @Override public VistaPartida vistaDe(long p, String j) { return null; }
        @Override public void marcarConexion(long p, String j, boolean c) { }
        @Override public void reanudarRonda(long p, String j) { }

        @Override
        public boolean participa(long partidaId, String jugadorId) {
            if (partidaId != 7L) {
                throw new ComandoInvalidoException(MotivoComando.PARTIDA_INEXISTENTE);
            }
            return Set.of("sub-a", "sub-b").contains(jugadorId);
        }
    }

    private final RelojManual reloj = new RelojManual();
    private final List<Message<?>> publicados = new CopyOnWriteArrayList<>();
    private final ChatMesa chat = new ChatMesa(new TurnosConAsientos(),
            new SimpMessagingTemplate((m, t) -> publicados.add(m)), new ObjectMapper(), reloj);
    private final ListAppender<ILoggingEvent> auditoria = new ListAppender<>();

    @BeforeEach
    void escucharAuditoria() {
        auditoria.start();
        ((Logger) LoggerFactory.getLogger("auditoria")).addAppender(auditoria);
    }

    @AfterEach
    void soltarAuditoria() {
        ((Logger) LoggerFactory.getLogger("auditoria")).detachAppender(auditoria);
    }

    private static Principal jugador(String sub) {
        return () -> sub;
    }

    private static String motivo(Runnable envio) {
        return assertThrows(ChatRechazado.class, envio::run).getMessage();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> datosPublicados(int i) {
        return (Map<String, Object>) ((Map<String, Object>) publicados.get(i).getPayload()).get("datos");
    }

    @Test
    void elMensajeDeUnJugadorLlegaALaMesaLimpioYSinTextoEnLaAuditoria() {
        chat.hablar(7L, new Chat("  ¡Hola\n\tmesa!   ¿Jugamos?  "), jugador("sub-a"));

        assertEquals(1, publicados.size());
        Message<?> m = publicados.get(0);
        assertEquals("/topic/partidas/7", SimpMessageHeaderAccessor.getDestination(m.getHeaders()));
        assertEquals("Chat", ((Map<?, ?>) m.getPayload()).get("tipo"));
        assertEquals("¡Hola mesa! ¿Jugamos?", datosPublicados(0).get("texto"));
        assertEquals("sub-a", datosPublicados(0).get("jugadorId"));
        String linea = auditoria.list.get(0).getFormattedMessage();
        assertTrue(linea.contains("\"tipo\":\"CHAT\"") && linea.contains("\"largo\":21"));
        assertFalse(linea.contains("Jugamos"), "la auditoria no guarda el contenido");
    }

    @Test
    void textoVacioOLargoSeRechazaSinDifundir() {
        assertEquals("CHAT_VACIO", motivo(() -> chat.hablar(7L, new Chat(" \n\t "), jugador("sub-a"))));
        assertEquals("CHAT_VACIO", motivo(() -> chat.hablar(7L, new Chat(null), jugador("sub-a"))));
        assertEquals("CHAT_VACIO", motivo(() -> chat.hablar(7L, null, jugador("sub-a"))));
        assertEquals("CHAT_LARGO", motivo(() -> chat.hablar(7L, new Chat("x".repeat(201)), jugador("sub-a"))));
        chat.hablar(7L, new Chat("🐴".repeat(200)), jugador("sub-a"));
        assertEquals(1, publicados.size(), "200 emojis caben: se cuentan caracteres, no unidades UTF-16");
    }

    @Test
    void quienNoTieneAsientoNoHablaYUnaPartidaPerdidaSeInforma() {
        assertEquals("CHAT_SIN_ASIENTO", motivo(() -> chat.hablar(7L, new Chat("hola"), jugador("intruso"))));
        ComandoInvalidoException x = assertThrows(ComandoInvalidoException.class,
                () -> chat.hablar(99L, new Chat("hola"), jugador("sub-a")));
        assertEquals("PARTIDA_INEXISTENTE", chat.partidaInvalida(x).motivo());
        assertTrue(publicados.isEmpty());
    }

    @Test
    void masDeCincoMensajesEnDiezSegundosSeFrenanPorJugador() {
        for (int i = 0; i < ChatMesa.MENSAJES_POR_VENTANA; i++) {
            chat.hablar(7L, new Chat("m" + i), jugador("sub-a"));
        }
        assertEquals("CHAT_MUY_RAPIDO", motivo(() -> chat.hablar(7L, new Chat("otro"), jugador("sub-a"))));
        chat.hablar(7L, new Chat("yo si puedo"), jugador("sub-b"));

        reloj.ahora = reloj.ahora.plus(ChatMesa.VENTANA).plus(Duration.ofMillis(1));
        chat.hablar(7L, new Chat("ya paso la ventana"), jugador("sub-a"));
        assertEquals(7, publicados.size());
        assertEquals("CHAT_MUY_RAPIDO", chat.rechazar(new ChatRechazado("CHAT_MUY_RAPIDO")).motivo());
    }
}

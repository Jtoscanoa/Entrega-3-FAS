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
import co.edu.unal.apuntado.infrastructure.realtime.Comandos.Reaccion;
import co.edu.unal.apuntado.infrastructure.realtime.ReaccionesMesa.ReaccionRechazada;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.time.Clock;
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

/** Reacciones en la mesa (ADR-11): tipos permitidos, asientos validos, 1 cada 3 s y auditoria solo con el tipo. */
class ReaccionesMesaTest {

    private static final class RelojManual extends Clock {
        Instant ahora = Instant.parse("2026-11-25T16:00:00Z");

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zona) { return this; }
        @Override public Instant instant() { return ahora; }
    }

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
    private final ReaccionesMesa reacciones = new ReaccionesMesa(new TurnosConAsientos(),
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
        return assertThrows(ReaccionRechazada.class, envio::run).getMessage();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> datosPublicados(int i) {
        return (Map<String, Object>) ((Map<String, Object>) publicados.get(i).getPayload()).get("datos");
    }

    @Test
    void difundeLaReaccionALaMesaYAuditaSoloElTipo() {
        reacciones.reaccionar(7L, new Reaccion("sub-b", "  Tomate "), jugador("sub-a"));

        assertEquals(1, publicados.size());
        Message<?> m = publicados.get(0);
        assertEquals("/topic/partidas/7", SimpMessageHeaderAccessor.getDestination(m.getHeaders()));
        assertEquals("Reaccion", ((Map<?, ?>) m.getPayload()).get("tipo"));
        Map<String, Object> datos = datosPublicados(0);
        assertEquals(7L, datos.get("partidaId"));
        assertEquals("sub-a", datos.get("de"));
        assertEquals("sub-b", datos.get("para"));
        assertEquals("tomate", datos.get("tipo"));

        String linea = auditoria.list.get(0).getFormattedMessage();
        assertTrue(linea.contains("\"tipo\":\"REACCION\""));
        assertTrue(linea.contains("\"reaccion\":\"tomate\""));
        assertFalse(linea.contains("sub-b"));
        assertFalse(linea.contains("\"para\""));
    }

    @Test
    void limitaAUnaReaccionCadaTresSegundosPorJugador() {
        reacciones.reaccionar(7L, new Reaccion("sub-b", "tomate"), jugador("sub-a"));

        reloj.ahora = reloj.ahora.plusMillis(2999);
        assertEquals("REACCION_MUY_RAPIDA",
                motivo(() -> reacciones.reaccionar(7L, new Reaccion("sub-b", "burro"), jugador("sub-a"))));
        reacciones.reaccionar(7L, new Reaccion("sub-a", "aplauso"), jugador("sub-b"));

        reloj.ahora = reloj.ahora.plusMillis(2);
        reacciones.reaccionar(7L, new Reaccion("sub-b", "risa"), jugador("sub-a"));
        assertEquals(3, publicados.size());
        assertEquals("REACCION_MUY_RAPIDA",
                reacciones.rechazar(new ReaccionRechazada("REACCION_MUY_RAPIDA")).motivo());
    }

    @Test
    void rechazaTiposInvalidosJugadoresSinAsientoOPartidasInexistentes() {
        assertEquals("REACCION_INVALIDA", motivo(() -> reacciones.reaccionar(7L, null, jugador("sub-a"))));
        assertEquals("REACCION_INVALIDA",
                motivo(() -> reacciones.reaccionar(7L, new Reaccion("sub-b", "piedra"), jugador("sub-a"))));
        assertEquals("REACCION_DESTINO_INVALIDO",
                motivo(() -> reacciones.reaccionar(7L, new Reaccion(" ", "tomate"), jugador("sub-a"))));
        assertEquals("REACCION_DESTINO_INVALIDO",
                motivo(() -> reacciones.reaccionar(7L, new Reaccion("intruso", "tomate"), jugador("sub-a"))));
        assertEquals("REACCION_SIN_ASIENTO",
                motivo(() -> reacciones.reaccionar(7L, new Reaccion("sub-b", "tomate"), jugador("intruso"))));
        ComandoInvalidoException x = assertThrows(ComandoInvalidoException.class,
                () -> reacciones.reaccionar(99L, new Reaccion("sub-b", "tomate"), jugador("sub-a")));
        assertEquals("PARTIDA_INEXISTENTE", reacciones.partidaInvalida(x).motivo());
        assertTrue(publicados.isEmpty());
    }
}

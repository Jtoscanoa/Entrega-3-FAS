package co.edu.unal.apuntado.infrastructure.realtime;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

/** RF17 / ADR-08b: presencia por partida contando sesiones STOMP, sin reglas ni persistencia. */
class PresenciaTest {

    /** Registra los avisos al dominio; puede simular una partida que ya no esta en memoria. */
    private static final class TurnosEspia implements ITurno {
        final List<String> avisos = new CopyOnWriteArrayList<>();
        volatile boolean partidaInexistente;

        @Override public long iniciarPartida(String c, ConfiguracionReglas cfg, List<Participante> j) { return 0; }
        @Override public void robar(long p, String j, boolean d, int n) { }
        @Override public void descartar(long p, String j, String c, int n) { }
        @Override public ResultadoValidacion cerrar(long p, String j, String c, int n) { return null; }
        @Override public void vencerTurno(long p, int n) { }
        @Override public VistaPartida vistaDe(long p, String j) { return null; }
        @Override public void reanudarRonda(long p, String j) { }
        @Override public boolean participa(long p, String j) { return true; }

        @Override
        public void marcarConexion(long partidaId, String jugadorId, boolean conectado) {
            if (partidaInexistente) {
                throw new ComandoInvalidoException(MotivoComando.PARTIDA_INEXISTENTE);
            }
            avisos.add(partidaId + ":" + jugadorId + ":" + conectado);
        }
    }

    private final TurnosEspia turnos = new TurnosEspia();
    private final List<Message<?>> publicados = new CopyOnWriteArrayList<>();
    private final PresenciaJugadores presencia = new PresenciaJugadores(turnos,
            new SimpMessagingTemplate((m, t) -> publicados.add(m)), new ObjectMapper());
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

    private void suscribir(String sesion, String sub, String destino) {
        StompHeaderAccessor a = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        a.setSessionId(sesion);
        a.setSubscriptionId("sub-0");
        a.setDestination(destino);
        presencia.alSuscribirse(new SessionSubscribeEvent(this,
                MessageBuilder.createMessage(new byte[0], a.getMessageHeaders()), jugador(sub)));
    }

    private void desconectar(String sesion, String sub) {
        StompHeaderAccessor a = StompHeaderAccessor.create(StompCommand.DISCONNECT);
        a.setSessionId(sesion);
        presencia.alDesconectarse(new SessionDisconnectEvent(this,
                MessageBuilder.createMessage(new byte[0], a.getMessageHeaders()), sesion, CloseStatus.NORMAL, jugador(sub)));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> datosDe(Message<?> m) {
        Map<String, Object> sobre = (Map<String, Object>) m.getPayload();
        assertEquals("Presencia", sobre.get("tipo"));
        return (Map<String, Object>) sobre.get("datos");
    }

    @Test
    void variasPestanasDelMismoJugadorCuentanComoUnaPresencia() {
        suscribir("s1", "ana", "/topic/partidas/7");
        suscribir("s2", "ana", "/topic/partidas/7");
        assertEquals(List.of("7:ana:true"), turnos.avisos, "solo la primera sesion avisa");
        assertEquals(1, publicados.size());
        assertEquals(Set.of("ana"), presencia.conectados(7));

        desconectar("s1", "ana");
        assertEquals(1, turnos.avisos.size(), "con otra pestana abierta sigue conectado");
        desconectar("s2", "ana");
        assertEquals(List.of("7:ana:true", "7:ana:false"), turnos.avisos);
        assertTrue(presencia.conectados(7).isEmpty());
    }

    @Test
    void laDesconexionDeLaUltimaSesionPublicaElEventoALaMesaYQuedaAuditada() {
        suscribir("s1", "beto", "/topic/partidas/3");
        desconectar("s1", "beto");
        Message<?> ultimo = publicados.get(publicados.size() - 1);
        assertEquals("/topic/partidas/3", StompHeaderAccessor.wrap(ultimo).getDestination());
        Map<String, Object> datos = datosDe(ultimo);
        assertEquals(3L, datos.get("partidaId"));
        assertEquals("beto", datos.get("jugadorId"));
        assertEquals(false, datos.get("conectado"));
        assertEquals(2, auditoria.list.size());
        assertTrue(auditoria.list.get(1).getFormattedMessage().contains("\"tipo\":\"PRESENCIA\""));
        assertTrue(auditoria.list.get(1).getFormattedMessage().contains("\"conectado\":false"));
    }

    @Test
    void ignoraOtrosDestinosSesionesDesconocidasYSuscripcionesRepetidas() {
        suscribir("s1", "caro", "/user/queue/partida");
        suscribir("s1", "caro", "/topic/partidas/abc");
        desconectar("s9", "caro");
        assertTrue(turnos.avisos.isEmpty());
        suscribir("s1", "caro", "/topic/partidas/5");
        suscribir("s1", "caro", "/topic/partidas/5");
        desconectar("s1", "caro");
        assertEquals(List.of("5:caro:true", "5:caro:false"), turnos.avisos);
    }

    @Test
    void unaPartidaQueYaNoEstaEnMemoriaNoRompeLaPresencia() {
        turnos.partidaInexistente = true;
        assertDoesNotThrow(() -> suscribir("s1", "dani", "/topic/partidas/99"));
        assertEquals(1, publicados.size(), "la mesa igual se entera");
        assertEquals(Set.of("dani"), presencia.conectados(99));
    }
}

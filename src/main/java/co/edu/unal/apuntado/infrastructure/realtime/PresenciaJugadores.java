package co.edu.unal.apuntado.infrastructure.realtime;

import co.edu.unal.apuntado.domain.gameplay.ComandoInvalidoException;
import co.edu.unal.apuntado.domain.gameplay.ITurno;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

/**
 * Presencia por partida (RF17, ADR-08b). Sin reglas (FF-06) ni persistencia (FF-07): cuenta las sesiones STOMP
 * suscritas a /topic/partidas/{id} por jugador. Un jugador puede tener varias pestanas: queda conectado con la
 * primera y desconectado cuando cierra la ultima. Cada cambio se audita, se difunde a la mesa como
 * {tipo:"Presencia"} y se avisa al dominio para ajustar el temporizador.
 */
@Component
public class PresenciaJugadores {

    private static final Logger LOG = LoggerFactory.getLogger(PresenciaJugadores.class);
    private static final Pattern TEMA_PARTIDA = Pattern.compile("^/topic/partidas/(\\d+)$");

    /** Cambio de presencia ya decidido; se notifica fuera de la seccion sincronizada. */
    record Cambio(long partidaId, String jugadorId, boolean conectado) { }

    private record Clave(long partidaId, String jugadorId) { }

    private final ITurno turnos;
    private final SimpMessagingTemplate plantilla;
    private final ObjectMapper json;
    private final Map<String, Set<Clave>> porSesion = new HashMap<>();
    private final Map<Clave, Integer> sesionesAbiertas = new HashMap<>();

    public PresenciaJugadores(ITurno turnos, SimpMessagingTemplate plantilla, ObjectMapper json) {
        this.turnos = turnos;
        this.plantilla = plantilla;
        this.json = json;
    }

    @EventListener
    public void alSuscribirse(SessionSubscribeEvent evento) {
        Long partida = partidaDe(evento.getMessage());
        Principal usuario = evento.getUser();
        if (partida != null && usuario != null) {
            notificar(abrir(sesionDe(evento.getMessage()), new Clave(partida, usuario.getName())));
        }
    }

    @EventListener
    public void alDesconectarse(SessionDisconnectEvent evento) {
        notificar(cerrarSesion(evento.getSessionId()));
    }

    /** Jugadores con al menos una sesion abierta en la partida (para pruebas y diagnostico). */
    public synchronized Set<String> conectados(long partidaId) {
        Set<String> r = new HashSet<>();
        sesionesAbiertas.keySet().stream().filter(c -> c.partidaId() == partidaId).forEach(c -> r.add(c.jugadorId()));
        return r;
    }

    private synchronized List<Cambio> abrir(String sesion, Clave clave) {
        if (sesion == null || !porSesion.computeIfAbsent(sesion, s -> new HashSet<>()).add(clave)) {
            return List.of();
        }
        int abiertas = sesionesAbiertas.merge(clave, 1, Integer::sum);
        return abiertas == 1 ? List.of(new Cambio(clave.partidaId(), clave.jugadorId(), true)) : List.of();
    }

    private synchronized List<Cambio> cerrarSesion(String sesion) {
        Set<Clave> claves = sesion == null ? null : porSesion.remove(sesion);
        if (claves == null) {
            return List.of();
        }
        List<Cambio> cambios = new ArrayList<>();
        for (Clave c : claves) {
            Integer quedan = sesionesAbiertas.computeIfPresent(c, (k, n) -> n > 1 ? n - 1 : null);
            if (quedan == null) {
                cambios.add(new Cambio(c.partidaId(), c.jugadorId(), false));
            }
        }
        return cambios;
    }

    private void notificar(List<Cambio> cambios) {
        cambios.forEach(this::notificar);
    }

    private void notificar(Cambio c) {
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("partidaId", c.partidaId());
        datos.put("jugadorId", c.jugadorId());
        datos.put("conectado", c.conectado());
        auditar(datos);
        plantilla.convertAndSend("/topic/partidas/" + c.partidaId(), PublicadorEventosStomp.sobre("Presencia", datos));
        try {
            turnos.marcarConexion(c.partidaId(), c.jugadorId(), c.conectado());
        } catch (ComandoInvalidoException e) {
            LOG.debug("Presencia de una partida que ya no esta en memoria: {}", e.motivo());
        }
    }

    private void auditar(Map<String, Object> datos) {
        Map<String, Object> linea = new LinkedHashMap<>();
        linea.put("tipo", "PRESENCIA");
        linea.put("hora", Instant.now().toString());
        linea.putAll(datos);
        PublicadorEventosStomp.AUDITORIA.info(PublicadorEventosStomp.aJson(json, linea));
    }

    private static Long partidaDe(Message<?> mensaje) {
        String destino = StompHeaderAccessor.wrap(mensaje).getDestination();
        Matcher m = destino == null ? null : TEMA_PARTIDA.matcher(destino);
        return m != null && m.matches() ? Long.valueOf(m.group(1)) : null;
    }

    private static String sesionDe(Message<?> mensaje) {
        return StompHeaderAccessor.wrap(mensaje).getSessionId();
    }
}

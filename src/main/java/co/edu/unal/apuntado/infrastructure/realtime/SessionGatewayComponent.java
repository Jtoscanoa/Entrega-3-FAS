package co.edu.unal.apuntado.infrastructure.realtime;

import co.edu.unal.apuntado.domain.gameplay.ComandoInvalidoException;
import co.edu.unal.apuntado.domain.gameplay.EventoDominio;
import co.edu.unal.apuntado.domain.gameplay.IEventosPartida;
import co.edu.unal.apuntado.domain.gameplay.ITurno;
import co.edu.unal.apuntado.infrastructure.realtime.Comandos.Cerrar;
import co.edu.unal.apuntado.infrastructure.realtime.Comandos.Descartar;
import co.edu.unal.apuntado.infrastructure.realtime.Comandos.ErrorComando;
import co.edu.unal.apuntado.infrastructure.realtime.Comandos.Robar;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Controller;

/**
 * Adaptador STOMP sin reglas (FF-06) ni acceso a persistencia (FF-07): traduce mensajes a llamadas de ITurno y
 * eventos de dominio a /user/queue/partida (privado) o /topic/partidas/{id} (publico). Cada comando y cada evento
 * deja una linea JSON en el logger "auditoria" (evidencia de las pruebas con usuarios, seccion 3.2 del E3).
 */
@Controller
public class SessionGatewayComponent implements IEventosPartida {

    private static final Logger AUDITORIA = LoggerFactory.getLogger("auditoria");
    private final ITurno turnos;
    private final SimpMessagingTemplate plantilla;
    private final ObjectMapper json;

    public SessionGatewayComponent(ITurno turnos, SimpMessagingTemplate plantilla, ObjectMapper json) {
        this.turnos = turnos;
        this.plantilla = plantilla;
        this.json = json;
    }

    @MessageMapping("/partidas/{id}/robar")
    public void robar(@DestinationVariable long id, Robar comando, Principal usuario) {
        String accion = comando.delDescarte() ? "ROBAR_POZO" : "ROBAR_MAZO";
        auditar(id, usuario, accion, comando.numeroTurno(),
                () -> turnos.robar(id, usuario.getName(), comando.delDescarte(), comando.numeroTurno()));
    }

    @MessageMapping("/partidas/{id}/descartar")
    public void descartar(@DestinationVariable long id, Descartar comando, Principal usuario) {
        auditar(id, usuario, "DESCARTAR", comando.numeroTurno(),
                () -> turnos.descartar(id, usuario.getName(), comando.carta(), comando.numeroTurno()));
    }

    @MessageMapping("/partidas/{id}/cerrar")
    public void cerrar(@DestinationVariable long id, Cerrar comando, Principal usuario) {
        auditar(id, usuario, "CERRAR", comando.numeroTurno(),
                () -> turnos.cerrar(id, usuario.getName(), comando.carta(), comando.numeroTurno()));
    }

    @MessageMapping("/partidas/{id}/reanudar")
    public void reanudar(@DestinationVariable long id, Principal usuario) {
        plantilla.convertAndSendToUser(usuario.getName(), "/queue/partida",
                sobre("VistaPartida", turnos.vistaDe(id, usuario.getName())));
    }

    @MessageExceptionHandler(ComandoInvalidoException.class)
    @SendToUser("/queue/errores")
    public ErrorComando rechazar(ComandoInvalidoException e) {
        return new ErrorComando(e.motivo().name());
    }

    @MessageExceptionHandler(IllegalArgumentException.class)
    @SendToUser("/queue/errores")
    public ErrorComando rechazarFormato(IllegalArgumentException e) {
        return new ErrorComando("COMANDO_INVALIDO");
    }

    @Override
    public void publicar(EventoDominio evento) {
        Map<String, Object> linea = new LinkedHashMap<>();
        linea.put("tipo", "EVENTO");
        linea.put("hora", Instant.now().toString());
        linea.put("evento", evento.getClass().getSimpleName());
        linea.put("datos", evento);
        AUDITORIA.info(aJson(linea));
        Map<String, Object> mensaje = sobre(evento.getClass().getSimpleName(), evento);
        if (evento.destinatario() != null) {
            plantilla.convertAndSendToUser(evento.destinatario(), "/queue/partida", mensaje);
        } else {
            plantilla.convertAndSend("/topic/partidas/" + evento.partidaId(), mensaje);
        }
    }

    /** Sobre {tipo, datos}: la SPA distingue los mensajes por tipo sin inspeccionar sus campos. */
    private static Map<String, Object> sobre(String tipo, Object datos) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tipo", tipo);
        m.put("datos", datos);
        return m;
    }

    /** PROCESADO = el servidor acepto el comando (un cierre invalido se ve en el evento CierreRechazado). */
    private void auditar(long partidaId, Principal usuario, String accion, int numeroTurno, Runnable comando) {
        try {
            comando.run();
            registrar(partidaId, usuario, accion, numeroTurno, "PROCESADO", null);
        } catch (ComandoInvalidoException e) {
            registrar(partidaId, usuario, accion, numeroTurno, "RECHAZADO", e.motivo().name());
            throw e;
        } catch (IllegalArgumentException e) {
            registrar(partidaId, usuario, accion, numeroTurno, "RECHAZADO", "COMANDO_INVALIDO");
            throw e;
        }
    }

    private void registrar(long partidaId, Principal usuario, String accion, int numeroTurno, String resultado,
                           String motivo) {
        Map<String, Object> linea = new LinkedHashMap<>();
        linea.put("tipo", "COMANDO");
        linea.put("hora", Instant.now().toString());
        linea.put("partidaId", partidaId);
        linea.put("jugador", usuario.getName());
        linea.put("apodo", usuario instanceof JwtAuthenticationToken t
                ? t.getToken().getClaimAsString("preferred_username") : null);
        linea.put("accion", accion);
        linea.put("numeroTurno", numeroTurno);
        linea.put("resultado", resultado);
        linea.put("motivo", motivo);
        AUDITORIA.info(aJson(linea));
    }

    private String aJson(Map<String, Object> linea) {
        try {
            return json.writeValueAsString(linea);
        } catch (JsonProcessingException e) {
            return String.valueOf(linea);
        }
    }
}

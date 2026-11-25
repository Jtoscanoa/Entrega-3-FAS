package co.edu.unal.apuntado.infrastructure.realtime;

import co.edu.unal.apuntado.domain.gameplay.ComandoInvalidoException;
import co.edu.unal.apuntado.domain.gameplay.ITurno;
import co.edu.unal.apuntado.infrastructure.realtime.Comandos.ErrorComando;
import co.edu.unal.apuntado.infrastructure.realtime.Comandos.Reaccion;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.time.Clock;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

/**
 * Reacciones sociales en la mesa (tomate, burro, aplauso, risa). Adaptador sin reglas de juego (FF-06) ni
 * persistencia (FF-07), equivalente a ChatMesa (ADR-11): valida asientos, limita a 1 cada 3 s por jugador y la
 * auditoria registra unicamente el tipo de reaccion.
 */
@Controller
public class ReaccionesMesa {

    static final Set<String> TIPOS = Set.of("tomate", "burro", "aplauso", "risa");
    static final int REACCIONES_POR_VENTANA = 1;
    static final Duration VENTANA = Duration.ofSeconds(3);

    /** Reaccion rechazada; el motivo viaja a /user/queue/errores como en cualquier comando de la mesa. */
    static final class ReaccionRechazada extends RuntimeException {
        ReaccionRechazada(String motivo) {
            super(motivo);
        }
    }

    private final ITurno turnos;
    private final SimpMessagingTemplate plantilla;
    private final ObjectMapper json;
    private final Clock reloj;
    private final LimiteFrecuencia limite;

    public ReaccionesMesa(ITurno turnos, SimpMessagingTemplate plantilla, ObjectMapper json, Clock reloj) {
        this.turnos = turnos;
        this.plantilla = plantilla;
        this.json = json;
        this.reloj = reloj;
        this.limite = new LimiteFrecuencia(REACCIONES_POR_VENTANA, VENTANA, reloj);
    }

    @MessageMapping("/partidas/{id}/reaccion")
    public void reaccionar(@DestinationVariable("id") long id, Reaccion comando, Principal usuario) {
        String tipo = validarTipo(comando == null ? null : comando.tipo());
        String para = validarDestino(comando == null ? null : comando.para());
        verificarAsientos(id, usuario.getName(), para);
        if (!limite.permitir(id + ":" + usuario.getName())) {
            throw new ReaccionRechazada("REACCION_MUY_RAPIDA");
        }
        auditar(id, usuario.getName(), tipo);
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("partidaId", id);
        datos.put("de", usuario.getName());
        datos.put("para", para);
        datos.put("tipo", tipo);
        datos.put("hora", reloj.instant().toString());
        plantilla.convertAndSend("/topic/partidas/" + id, PublicadorEventosStomp.sobre("Reaccion", datos));
    }

    @MessageExceptionHandler(ReaccionRechazada.class)
    @SendToUser("/queue/errores")
    public ErrorComando rechazar(ReaccionRechazada e) {
        return new ErrorComando(e.getMessage());
    }

    @MessageExceptionHandler(ComandoInvalidoException.class)
    @SendToUser("/queue/errores")
    public ErrorComando partidaInvalida(ComandoInvalidoException e) {
        return new ErrorComando(e.motivo().name());
    }

    private static String validarTipo(String tipo) {
        String limpio = tipo == null ? "" : tipo.strip().toLowerCase(Locale.ROOT);
        if (!TIPOS.contains(limpio)) {
            throw new ReaccionRechazada("REACCION_INVALIDA");
        }
        return limpio;
    }

    private static String validarDestino(String para) {
        if (para == null || para.isBlank()) {
            throw new ReaccionRechazada("REACCION_DESTINO_INVALIDO");
        }
        return para.strip();
    }

    private void verificarAsientos(long partidaId, String autor, String destino) {
        if (!turnos.participa(partidaId, autor)) {
            throw new ReaccionRechazada("REACCION_SIN_ASIENTO");
        }
        if (!turnos.participa(partidaId, destino)) {
            throw new ReaccionRechazada("REACCION_DESTINO_INVALIDO");
        }
    }

    private void auditar(long partidaId, String jugador, String tipo) {
        Map<String, Object> linea = new LinkedHashMap<>();
        linea.put("tipo", "REACCION");
        linea.put("hora", reloj.instant().toString());
        linea.put("partidaId", partidaId);
        linea.put("jugador", jugador);
        linea.put("reaccion", tipo);
        PublicadorEventosStomp.AUDITORIA.info(PublicadorEventosStomp.aJson(json, linea));
    }
}

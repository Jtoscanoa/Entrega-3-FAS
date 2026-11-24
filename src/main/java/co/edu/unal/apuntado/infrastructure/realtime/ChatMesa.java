package co.edu.unal.apuntado.infrastructure.realtime;

import co.edu.unal.apuntado.domain.gameplay.ComandoInvalidoException;
import co.edu.unal.apuntado.domain.gameplay.ITurno;
import co.edu.unal.apuntado.infrastructure.realtime.Comandos.Chat;
import co.edu.unal.apuntado.infrastructure.realtime.Comandos.ErrorComando;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.time.Clock;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

/**
 * Chat en vivo de la mesa. Es un adaptador social sin reglas de juego (FF-06) ni persistencia (FF-07): valida que
 * quien escribe tenga asiento, limpia el texto, limita la frecuencia y lo difunde a /topic/partidas/{id} en el sobre
 * {tipo:"Chat", datos}. La auditoria guarda quien escribio y el largo, no el contenido.
 */
@Controller
public class ChatMesa {

    static final int LARGO_MAXIMO = 200;
    static final int MENSAJES_POR_VENTANA = 5;
    static final Duration VENTANA = Duration.ofSeconds(10);
    private static final Pattern CONTROL = Pattern.compile("\\p{Cntrl}");
    private static final Pattern ESPACIOS = Pattern.compile("\\s+");

    /** Mensaje rechazado; el motivo viaja a /user/queue/errores igual que el de un comando de juego. */
    static final class ChatRechazado extends RuntimeException {
        ChatRechazado(String motivo) {
            super(motivo);
        }
    }

    private final ITurno turnos;
    private final SimpMessagingTemplate plantilla;
    private final ObjectMapper json;
    private final Clock reloj;
    private final LimiteFrecuencia limite;

    public ChatMesa(ITurno turnos, SimpMessagingTemplate plantilla, ObjectMapper json, Clock reloj) {
        this.turnos = turnos;
        this.plantilla = plantilla;
        this.json = json;
        this.reloj = reloj;
        this.limite = new LimiteFrecuencia(MENSAJES_POR_VENTANA, VENTANA, reloj);
    }

    @MessageMapping("/partidas/{id}/chat")
    public void hablar(@DestinationVariable long id, Chat mensaje, Principal usuario) {
        String texto = limpiar(mensaje == null ? null : mensaje.texto());
        if (!turnos.participa(id, usuario.getName())) {
            throw new ChatRechazado("CHAT_SIN_ASIENTO");
        }
        if (!limite.permitir(id + ":" + usuario.getName())) {
            throw new ChatRechazado("CHAT_MUY_RAPIDO");
        }
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("partidaId", id);
        datos.put("jugadorId", usuario.getName());
        datos.put("texto", texto);
        datos.put("hora", reloj.instant().toString());
        auditar(id, usuario.getName(), texto.codePointCount(0, texto.length()));
        plantilla.convertAndSend("/topic/partidas/" + id, PublicadorEventosStomp.sobre("Chat", datos));
    }

    /** Sin caracteres de control ni espacios repetidos; vacio o mas largo que LARGO_MAXIMO se rechaza. */
    static String limpiar(String texto) {
        String limpio = texto == null ? ""
                : ESPACIOS.matcher(CONTROL.matcher(texto).replaceAll(" ")).replaceAll(" ").strip();
        if (limpio.isEmpty()) {
            throw new ChatRechazado("CHAT_VACIO");
        }
        if (limpio.codePointCount(0, limpio.length()) > LARGO_MAXIMO) {
            throw new ChatRechazado("CHAT_LARGO");
        }
        return limpio;
    }

    @MessageExceptionHandler(ChatRechazado.class)
    @SendToUser("/queue/errores")
    public ErrorComando rechazar(ChatRechazado e) {
        return new ErrorComando(e.getMessage());
    }

    @MessageExceptionHandler(ComandoInvalidoException.class)
    @SendToUser("/queue/errores")
    public ErrorComando partidaInvalida(ComandoInvalidoException e) {
        return new ErrorComando(e.motivo().name());
    }

    private void auditar(long partidaId, String jugador, int largo) {
        Map<String, Object> linea = new LinkedHashMap<>();
        linea.put("tipo", "CHAT");
        linea.put("hora", reloj.instant().toString());
        linea.put("partidaId", partidaId);
        linea.put("jugador", jugador);
        linea.put("largo", largo);
        PublicadorEventosStomp.AUDITORIA.info(PublicadorEventosStomp.aJson(json, linea));
    }
}

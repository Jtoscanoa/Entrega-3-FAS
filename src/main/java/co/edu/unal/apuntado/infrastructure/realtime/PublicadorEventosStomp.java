package co.edu.unal.apuntado.infrastructure.realtime;

import co.edu.unal.apuntado.domain.gameplay.EventoDominio;
import co.edu.unal.apuntado.domain.gameplay.IEventosPartida;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Salida de eventos de dominio hacia STOMP (ADR-06): /user/queue/partida (privado) o /topic/partidas/{id} (publico),
 * en un sobre {tipo, datos}. Esta separado del gateway de entrada para que el orquestador dependa solo de
 * IEventosPartida y no exista el ciclo orquestador -> gateway -> orquestador. Es la costura donde un broker externo
 * (Redis o RabbitMQ) reemplazaria al broker simple si se separa el cuanto de conexiones.
 */
@Component
public class PublicadorEventosStomp implements IEventosPartida {

    static final Logger AUDITORIA = LoggerFactory.getLogger("auditoria");
    private final SimpMessagingTemplate plantilla;
    private final ObjectMapper json;

    public PublicadorEventosStomp(SimpMessagingTemplate plantilla, ObjectMapper json) {
        this.plantilla = plantilla;
        this.json = json;
    }

    @Override
    public void publicar(EventoDominio evento) {
        Map<String, Object> linea = new LinkedHashMap<>();
        linea.put("tipo", "EVENTO");
        linea.put("hora", Instant.now().toString());
        linea.put("evento", evento.getClass().getSimpleName());
        linea.put("datos", evento);
        AUDITORIA.info(aJson(json, linea));
        Map<String, Object> mensaje = sobre(evento.getClass().getSimpleName(), evento);
        if (evento.destinatario() != null) {
            plantilla.convertAndSendToUser(evento.destinatario(), "/queue/partida", mensaje);
        } else {
            plantilla.convertAndSend("/topic/partidas/" + evento.partidaId(), mensaje);
        }
    }

    /** Sobre {tipo, datos}: la SPA distingue los mensajes por tipo sin inspeccionar sus campos. */
    static Map<String, Object> sobre(String tipo, Object datos) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tipo", tipo);
        m.put("datos", datos);
        return m;
    }

    static String aJson(ObjectMapper json, Map<String, Object> linea) {
        try {
            return json.writeValueAsString(linea);
        } catch (JsonProcessingException e) {
            return String.valueOf(linea);
        }
    }
}

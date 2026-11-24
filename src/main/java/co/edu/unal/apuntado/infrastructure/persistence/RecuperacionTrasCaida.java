package co.edu.unal.apuntado.infrastructure.persistence;

import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.Recuperacion;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Retro E2 2.3: el estado vivo de cada mesa esta en memoria (ADR-05), asi que tras un reinicio ninguna ronda
 * EN_CURSO se puede continuar. Al arrancar se anulan en una transaccion (IMatchState#anularPartidasEnCurso) y el
 * resultado queda en el logger "auditoria". Los puntos de las rondas ya liquidadas se conservan.
 */
@Component
public class RecuperacionTrasCaida {

    private static final Logger AUDITORIA = LoggerFactory.getLogger("auditoria");
    private final IMatchState estado;
    private final ObjectMapper json;
    private final Clock reloj;

    public RecuperacionTrasCaida(IMatchState estado, ObjectMapper json, Clock reloj) {
        this.estado = estado;
        this.json = json;
        this.reloj = reloj;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void alArrancar() {
        Recuperacion r = estado.anularPartidasEnCurso();
        Map<String, Object> linea = new LinkedHashMap<>();
        linea.put("tipo", "RECUPERACION");
        linea.put("hora", reloj.instant().toString());
        linea.put("rondasAnuladas", r.rondasAnuladas());
        linea.put("partidasInterrumpidas", r.partidasInterrumpidas());
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

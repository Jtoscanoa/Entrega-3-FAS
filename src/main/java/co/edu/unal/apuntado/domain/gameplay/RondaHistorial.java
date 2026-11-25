package co.edu.unal.apuntado.domain.gameplay;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Una ronda ya liquidada, tal como la vio la mesa (RF13): tipo de cierre, puntos de la ronda por jugador y total
 * acumulado despues de ella. Viaja en VistaPartida para que el historial sobreviva a una recarga de la SPA.
 */
public record RondaHistorial(int numeroRonda, String cerradorId, String tipoCierre, Map<String, Integer> puntosRonda,
                             Map<String, Integer> marcador) {

    public RondaHistorial {
        puntosRonda = Collections.unmodifiableMap(new LinkedHashMap<>(puntosRonda));
        marcador = Collections.unmodifiableMap(new LinkedHashMap<>(marcador));
    }
}

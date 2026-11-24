package co.edu.unal.apuntado.domain.rules.modelo;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** Resultado inmutable de liquidar una ronda. */
public record ResultadoLiquidacion(
        Map<String, Integer> puntosRonda,
        Map<String, Integer> marcador,
        Set<String> eliminados,
        boolean finPartida,
        Optional<String> ganador,
        Optional<MotivoFin> motivoFin) {

    public ResultadoLiquidacion {
        puntosRonda = Collections.unmodifiableMap(new LinkedHashMap<>(puntosRonda));
        marcador = Collections.unmodifiableMap(new LinkedHashMap<>(marcador));
        eliminados = Set.copyOf(eliminados);
    }
}

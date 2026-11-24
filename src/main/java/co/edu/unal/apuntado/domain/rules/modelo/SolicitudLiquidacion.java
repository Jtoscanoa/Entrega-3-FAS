package co.edu.unal.apuntado.domain.rules.modelo;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Entrada inmutable de la liquidacion (perdedores = activos distintos de quien cierra). Recibe las agrupaciones
 * que produjo IEvaluadorMano: extraer y aplicar sus puntos es responsabilidad de ILiquidacion, no del
 * orquestador (FF-01c).
 */
public record SolicitudLiquidacion(
        int numeroRonda,
        String cerradorId,
        ResultadoValidacion cierre,
        Map<String, Agrupacion> agrupacionesPerdedores,
        Map<String, Integer> marcadorPrevio,
        ConfiguracionReglas cfg) {

    public SolicitudLiquidacion {
        if (!cierre.valido()) {
            throw new IllegalArgumentException("No se liquida un cierre rechazado");
        }
        agrupacionesPerdedores = Map.copyOf(agrupacionesPerdedores);
        marcadorPrevio = Collections.unmodifiableMap(new LinkedHashMap<>(marcadorPrevio));
        if (!marcadorPrevio.containsKey(cerradorId) || agrupacionesPerdedores.containsKey(cerradorId)) {
            throw new IllegalArgumentException("El que cierra debe estar activo y no figurar como perdedor");
        }
    }
}

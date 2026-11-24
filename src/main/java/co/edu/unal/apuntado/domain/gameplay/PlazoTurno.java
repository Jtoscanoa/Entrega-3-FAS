package co.edu.unal.apuntado.domain.gameplay;

import java.time.Duration;
import java.time.Instant;

/**
 * Hora limite del turno vigente (ADR-08 y su enmienda ADR-08b). Funcion pura: el orquestador le entrega los datos
 * y se limita a programar el resultado.
 * <ul>
 *   <li>Jugador conectado: inicio del turno + segundos por turno.</li>
 *   <li>Jugador ausente: lo que ocurra antes entre ahora + plazo de ausente y el limite normal (desconectarse no
 *   alarga el turno).</li>
 *   <li>Mesa vacia: null, no se programa ningun vencimiento.</li>
 * </ul>
 */
final class PlazoTurno {

    private PlazoTurno() {
    }

    static Instant vencimiento(Instant inicioTurno, Instant ahora, Duration normal, Duration ausente,
                               boolean jugadorAusente, boolean mesaVacia) {
        if (mesaVacia) {
            return null;
        }
        Instant limiteNormal = inicioTurno.plus(normal);
        if (!jugadorAusente) {
            return limiteNormal;
        }
        Instant limiteAusente = ahora.plus(ausente);
        return limiteAusente.isBefore(limiteNormal) ? limiteAusente : limiteNormal;
    }
}

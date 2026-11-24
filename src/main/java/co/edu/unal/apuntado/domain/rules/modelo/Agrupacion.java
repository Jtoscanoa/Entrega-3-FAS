package co.edu.unal.apuntado.domain.rules.modelo;

import java.util.List;

/** Mejor agrupacion de una mano: combinaciones, cartas sueltas y los puntos de estas ultimas. */
public record Agrupacion(int puntos, List<Combinacion> combinaciones, List<Carta> sueltas) {

    public Agrupacion {
        combinaciones = List.copyOf(combinaciones);
        sueltas = List.copyOf(sueltas);
    }
}

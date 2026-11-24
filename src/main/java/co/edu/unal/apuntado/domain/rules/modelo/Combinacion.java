package co.edu.unal.apuntado.domain.rules.modelo;

import java.util.List;

/** Grupo (mismo valor) o escalera (consecutivas de una pinta) de 3 a 5 cartas. */
public record Combinacion(TipoCombinacion tipo, List<Carta> cartas) {

    public Combinacion {
        cartas = List.copyOf(cartas);
    }

    public int tamano() {
        return cartas.size();
    }
}

package co.edu.unal.apuntado.domain.rules;

import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import java.util.Arrays;
import java.util.List;

/** Utilidad de pruebas: "7C 8C *" -> cartas. */
final class Manos {
    private Manos() {
    }

    static List<Carta> de(String texto) {
        return Arrays.stream(texto.trim().split("\\s+")).map(Carta::deCodigo).toList();
    }
}

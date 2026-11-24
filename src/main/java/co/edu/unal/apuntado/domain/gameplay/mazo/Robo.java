package co.edu.unal.apuntado.domain.gameplay.mazo;

import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import java.util.Optional;

/** Carta robada y, si el mazo se agoto, la huella del mazo repuesto (RF14). */
public record Robo(Carta carta, Optional<String> huellaReposicion) {
}

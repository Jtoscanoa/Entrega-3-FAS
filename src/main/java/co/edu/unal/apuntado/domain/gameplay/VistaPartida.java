package co.edu.unal.apuntado.domain.gameplay;

import java.util.List;
import java.util.Map;

/**
 * Vista completa y personalizada para reconectar (E7): nunca incluye manos ajenas. {@code fase} y las
 * opciones de la mesa permiten a la SPA reconstruir la pantalla sin haber visto los eventos anteriores.
 */
public record VistaPartida(long partidaId, int numeroRonda, List<String> mano, String cimaDescarte,
                           Map<String, Integer> marcador, String turnoDe, int numeroTurno, String huella,
                           boolean finalizada, String fase, String modalidad, int umbral,
                           boolean robarDelDescarte, List<String> eliminados) {
}

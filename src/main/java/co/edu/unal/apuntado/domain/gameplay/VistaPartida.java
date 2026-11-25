package co.edu.unal.apuntado.domain.gameplay;

import co.edu.unal.apuntado.domain.rules.modelo.EvaluacionMano;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Vista completa y personalizada para reconectar (E7): nunca incluye manos ajenas. {@code fase} y las
 * opciones de la mesa permiten a la SPA reconstruir la pantalla sin haber visto los eventos anteriores.
 * {@code conectados} son los jugadores con al menos una sesion abierta segun la presencia (RF17, ADR-08b).
 * {@code evaluacion} es el avance de la mano propia hacia el cierre (RF16), calculado por IEvaluadorMano: la SPA lo
 * muestra y resalta "Cerrar", pero no valida nada (RD4). {@code historial} son las rondas ya liquidadas (RF13).
 */
public record VistaPartida(long partidaId, int numeroRonda, List<String> mano, String cimaDescarte,
                           Map<String, Integer> marcador, String turnoDe, int numeroTurno, String huella,
                           boolean finalizada, String fase, String modalidad, int umbral,
                           boolean robarDelDescarte, List<String> eliminados,
                           List<String> conectados, EvaluacionMano evaluacion,
                           List<RondaHistorial> historial, Instant venceEn, int segundosPorTurno) {
}

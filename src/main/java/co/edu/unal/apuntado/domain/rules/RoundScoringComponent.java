package co.edu.unal.apuntado.domain.rules;

import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.EvaluacionMano;
import co.edu.unal.apuntado.domain.rules.modelo.MotivoFin;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoLiquidacion;
import co.edu.unal.apuntado.domain.rules.modelo.SolicitudLiquidacion;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** Unico responsable de aplicar puntos, eliminar al alcanzar el umbral y decidir el fin de partida. */
public final class RoundScoringComponent implements ILiquidacion {

    private static final Agrupacion SIN_SUELTAS = new Agrupacion(0, List.of(), List.of());

    @Override
    public ResultadoLiquidacion liquidar(SolicitudLiquidacion s) {
        Map<String, Integer> ronda = puntosDeRonda(s);
        Map<String, Integer> marcador = acumular(s.marcadorPrevio(), ronda);
        Set<String> eliminados = superanUmbral(marcador, s.cfg().umbralEliminacion());
        Optional<MotivoFin> motivo = determinarFin(s, marcador, eliminados);
        Optional<String> ganador = motivo.map(m -> elegirGanador(s, marcador, eliminados, m));
        return new ResultadoLiquidacion(ronda, marcador, eliminados, motivo.isPresent(), ganador, motivo);
    }

    /** Sin umbral en una partida de una sola ronda (la Clasica): solo se informa el marcador proyectado. */
    @Override
    public EvaluacionMano proyectar(EvaluacionMano evaluacion, int marcadorActual, ConfiguracionReglas cfg) {
        int proyectado = marcadorActual + evaluacion.penalizacionSiCierranAhora();
        if (cfg.maximoRondas() == 1) {
            return evaluacion.conProyeccion(proyectado, null, false);
        }
        int umbral = cfg.umbralEliminacion();
        return evaluacion.conProyeccion(proyectado, umbral - proyectado, alcanzaUmbral(proyectado, umbral));
    }

    /** Regla unica de eliminacion: llegar al umbral elimina (101 con umbral 101; 100 no). */
    private static boolean alcanzaUmbral(int total, int umbral) {
        return total >= umbral;
    }

    private static Map<String, Integer> puntosDeRonda(SolicitudLiquidacion s) {
        Map<String, Integer> ronda = new LinkedHashMap<>();
        s.marcadorPrevio().keySet().forEach(id -> ronda.put(id, puntosDe(s, id)));
        return ronda;
    }

    private static int puntosDe(SolicitudLiquidacion s, String id) {
        return id.equals(s.cerradorId()) ? s.cierre().puntos() : s.agrupacionesPerdedores().getOrDefault(id, SIN_SUELTAS).puntos();
    }

    private static Map<String, Integer> acumular(Map<String, Integer> previo, Map<String, Integer> ronda) {
        Map<String, Integer> total = new LinkedHashMap<>();
        previo.forEach((id, p) -> total.put(id, p + ronda.get(id)));
        return total;
    }

    private static Set<String> superanUmbral(Map<String, Integer> marcador, int umbral) {
        Set<String> r = new LinkedHashSet<>();
        marcador.forEach((id, total) -> {
            if (alcanzaUmbral(total, umbral)) {
                r.add(id);
            }
        });
        return r;
    }

    private static Optional<MotivoFin> determinarFin(SolicitudLiquidacion s, Map<String, Integer> marcador,
                                                     Set<String> eliminados) {
        int restantes = marcador.size() - eliminados.size();
        if (s.cfg().maximoRondas() > 0 && s.numeroRonda() >= s.cfg().maximoRondas()) {
            return Optional.of(MotivoFin.MAXIMO_RONDAS);
        }
        if (restantes == 0) {
            return Optional.of(MotivoFin.TODOS_SUPERARON_UMBRAL);
        }
        if (restantes == 1) {
            return Optional.of(MotivoFin.ULTIMO_ACTIVO);
        }
        boolean meta = marcador.values().stream().anyMatch(t -> t <= s.cfg().metaVictoria());
        return meta ? Optional.of(MotivoFin.META_VICTORIA) : Optional.empty();
    }

    private static String elegirGanador(SolicitudLiquidacion s, Map<String, Integer> marcador,
                                        Set<String> eliminados, MotivoFin motivo) {
        if (motivo == MotivoFin.ULTIMO_ACTIVO) {
            return marcador.keySet().stream().filter(id -> !eliminados.contains(id)).findFirst().orElseThrow();
        }
        Comparator<String> menorMarcador = Comparator.<String>comparingInt(marcador::get)
                .thenComparing(id -> !id.equals(s.cerradorId()))
                .thenComparing(Comparator.naturalOrder());
        return marcador.keySet().stream().min(menorMarcador).orElseThrow();
    }
}

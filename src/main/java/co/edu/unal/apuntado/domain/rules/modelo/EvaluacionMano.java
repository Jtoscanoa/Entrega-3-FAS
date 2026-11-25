package co.edu.unal.apuntado.domain.rules.modelo;

import java.util.List;

/**
 * Lectura de la mano propia para la SPA (RF16, sesion S1): cuanto le falta al jugador para cerrar, calculado en el
 * servidor (RD4). {@code grupos} son los indices, dentro de la mano evaluada, de cada combinacion que cuenta para el
 * cierre; {@code descarteSugerido} es el indice de la carta que conviene descartar (solo con la mano de 11 cartas).
 *
 * <p>Proyeccion (sesion S1, E3-18f): {@code penalizacionSiCierranAhora} son los puntos que sumaria el jugador si otro
 * cerrara ya (cartas sueltas de su mejor agrupacion, RF07; con 11 cartas, tras el descarte sugerido). La completan
 * ILiquidacion#proyectar: {@code marcadorProyectado} (null hasta proyectar), {@code faltaParaUmbral} (null si la
 * partida no tiene umbral, p. ej. la Clasica de una ronda) y {@code quedariaEliminado}.
 */
public record EvaluacionMano(List<List<Integer>> grupos, int cuartasFormadas, int cuartasRequeridas,
                             int ternasFormadas, int ternasRequeridas, int puntosSobrantes, boolean puedeCerrar,
                             Integer descarteSugerido, int penalizacionSiCierranAhora, Integer marcadorProyectado,
                             Integer faltaParaUmbral, boolean quedariaEliminado) {

    public EvaluacionMano {
        grupos = grupos.stream().map(List::copyOf).toList();
    }

    /** Avance sin proyeccion (lo que arma cada plug-in de regla). */
    public EvaluacionMano(List<List<Integer>> grupos, int cuartasFormadas, int cuartasRequeridas,
                          int ternasFormadas, int ternasRequeridas, int puntosSobrantes, boolean puedeCerrar,
                          Integer descarteSugerido) {
        this(grupos, cuartasFormadas, cuartasRequeridas, ternasFormadas, ternasRequeridas, puntosSobrantes,
                puedeCerrar, descarteSugerido, 0, null, null, false);
    }

    /** Para variantes que no informan su avance. */
    public static EvaluacionMano sinDetalle() {
        return new EvaluacionMano(List.of(), 0, 0, 0, 0, 0, false, null);
    }

    /** La misma lectura para la mano con una carta mas en la posicion {@code descarte}, que se descartaria. */
    public EvaluacionMano conDescarte(int descarte, boolean cierraAsi) {
        List<List<Integer>> corridos = grupos.stream()
                .map(g -> g.stream().map(i -> i >= descarte ? i + 1 : i).toList())
                .toList();
        return new EvaluacionMano(corridos, cuartasFormadas, cuartasRequeridas, ternasFormadas, ternasRequeridas,
                puntosSobrantes, cierraAsi, descarte, penalizacionSiCierranAhora, marcadorProyectado, faltaParaUmbral,
                quedariaEliminado);
    }

    public EvaluacionMano conPenalizacion(int penalizacion) {
        return new EvaluacionMano(grupos, cuartasFormadas, cuartasRequeridas, ternasFormadas, ternasRequeridas,
                puntosSobrantes, puedeCerrar, descarteSugerido, penalizacion, marcadorProyectado, faltaParaUmbral,
                quedariaEliminado);
    }

    public EvaluacionMano conProyeccion(int marcador, Integer falta, boolean eliminado) {
        return new EvaluacionMano(grupos, cuartasFormadas, cuartasRequeridas, ternasFormadas, ternasRequeridas,
                puntosSobrantes, puedeCerrar, descarteSugerido, penalizacionSiCierranAhora, marcador, falta,
                eliminado);
    }

    /** Orden de preferencia entre descartes: primero el que permite cerrar, luego mas juegos, luego menos sobrante. */
    public boolean mejorQue(EvaluacionMano otra) {
        if (puedeCerrar != otra.puedeCerrar) {
            return puedeCerrar;
        }
        int juegos = cuartasFormadas + ternasFormadas;
        int juegosOtra = otra.cuartasFormadas + otra.ternasFormadas;
        if (juegos != juegosOtra) {
            return juegos > juegosOtra;
        }
        return puntosSobrantes < otra.puntosSobrantes;
    }
}

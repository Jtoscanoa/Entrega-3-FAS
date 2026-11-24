package co.edu.unal.apuntado.domain.rules.evaluacion;

import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.TipoCombinacion;
import co.edu.unal.apuntado.domain.rules.modelo.Valor;
import java.util.List;
import java.util.Optional;

/** Clasifica un conjunto de 3 a 5 cartas como grupo, escalera o nada. Sin estado. */
public final class ValidadorCombinacion {

    public static final int MINIMO = 3;
    public static final int MAXIMO = 5;
    private static final int MINIMO_NATURALES = 2;
    private static final int AS_ALTO = 14;
    private static final int AS_BAJO = 1;

    private ValidadorCombinacion() {
    }

    public static Optional<TipoCombinacion> clasificar(List<Carta> cartas, boolean comodines) {
        int n = cartas.size();
        if (n < MINIMO || n > MAXIMO) {
            return Optional.empty();
        }
        List<Carta> naturales = cartas.stream().filter(c -> !c.esComodin()).toList();
        if (!admisible(n - naturales.size(), naturales.size(), comodines)) {
            return Optional.empty();
        }
        if (esGrupo(naturales)) {
            return Optional.of(TipoCombinacion.GRUPO);
        }
        return esEscalera(naturales, n) ? Optional.of(TipoCombinacion.ESCALERA) : Optional.empty();
    }

    private static boolean admisible(int comodinesUsados, int naturales, boolean comodinesHabilitados) {
        return (comodinesUsados == 0 || comodinesHabilitados) && naturales >= MINIMO_NATURALES;
    }

    private static boolean esGrupo(List<Carta> naturales) {
        return naturales.stream().map(Carta::valor).distinct().count() == 1;
    }

    private static boolean esEscalera(List<Carta> naturales, int tamano) {
        return mismaPinta(naturales)
                && (cabe(naturales, tamano, AS_BAJO) || cabe(naturales, tamano, AS_ALTO));
    }

    private static boolean mismaPinta(List<Carta> naturales) {
        return naturales.stream().map(Carta::pinta).distinct().count() == 1;
    }

    /** Rangos distintos y con huecos rellenables por los comodines dentro de {@code tamano} posiciones. */
    private static boolean cabe(List<Carta> naturales, int tamano, int valorAs) {
        int[] rangos = naturales.stream().mapToInt(c -> rango(c, valorAs)).sorted().toArray();
        for (int i = 1; i < rangos.length; i++) {
            if (rangos[i] == rangos[i - 1]) {
                return false;
            }
        }
        return rangos[rangos.length - 1] - rangos[0] + 1 <= tamano;
    }

    private static int rango(Carta carta, int valorAs) {
        return carta.valor() == Valor.AS ? valorAs : carta.valor().rango();
    }
}

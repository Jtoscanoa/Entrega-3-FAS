package co.edu.unal.apuntado.domain.rules.evaluacion;

import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.Combinacion;
import co.edu.unal.apuntado.domain.rules.modelo.TipoCombinacion;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Representa cada subconjunto de la mano (hasta 11 cartas) como una mascara de bits y resuelve las
 * particiones decidiendo siempre el destino de la carta de menor indice aun sin ubicar: cada agrupacion
 * se explora una sola vez.
 */
public final class BuscadorCombinaciones {

    public static final int MAX_CARTAS = 11;
    private static final int TERNA = 3;

    /** Ternas elegidas mas las cartas que sobran y sus puntos. */
    public record ParticionConSobrantes(List<Combinacion> ternas, List<Carta> sobrantes, int puntos) {
        public ParticionConSobrantes {
            ternas = List.copyOf(ternas);
            sobrantes = List.copyOf(sobrantes);
        }
    }

    private static final class Mejor {
        private int puntos = Integer.MAX_VALUE;
        private List<Integer> ternas = List.of();
        private List<Integer> sueltas = List.of();

        void registrar(int acumulado, Deque<Integer> t, Deque<Integer> s) {
            puntos = acumulado;
            ternas = new ArrayList<>(t);
            sueltas = new ArrayList<>(s);
        }
    }

    private final List<Carta> mano;
    private final int n;
    private final int completa;
    private final int[] puntos;
    private final int[][] porMenor;
    private final Map<Integer, TipoCombinacion> tipos = new HashMap<>();

    public BuscadorCombinaciones(List<Carta> mano, boolean comodines) {
        if (mano.size() > MAX_CARTAS) {
            throw new IllegalArgumentException("Se admiten hasta " + MAX_CARTAS + " cartas");
        }
        this.mano = List.copyOf(mano);
        this.n = this.mano.size();
        this.completa = (1 << n) - 1;
        this.puntos = this.mano.stream().mapToInt(TablaPuntos::puntos).toArray();
        List<List<Integer>> grupos = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            grupos.add(new ArrayList<>());
        }
        enumerar(comodines, grupos);
        this.porMenor = grupos.stream()
                .map(l -> l.stream().mapToInt(Integer::intValue).toArray())
                .toArray(int[][]::new);
    }

    private void enumerar(boolean comodines, List<List<Integer>> grupos) {
        for (int m = 1; m <= completa; m++) {
            int k = Integer.bitCount(m);
            if (k >= ValidadorCombinacion.MINIMO && k <= ValidadorCombinacion.MAXIMO) {
                registrar(m, comodines, grupos);
            }
        }
    }

    private void registrar(int mascara, boolean comodines, List<List<Integer>> grupos) {
        ValidadorCombinacion.clasificar(cartasDe(mascara), comodines).ifPresent(t -> {
            tipos.put(mascara, t);
            grupos.get(Integer.numberOfTrailingZeros(mascara)).add(mascara);
        });
    }

    private List<Carta> cartasDe(int mascara) {
        List<Carta> r = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            if ((mascara & (1 << i)) != 0) {
                r.add(mano.get(i));
            }
        }
        return r;
    }

    private Combinacion combinacionDe(int mascara) {
        return new Combinacion(tipos.get(mascara), cartasDe(mascara));
    }

    private List<Combinacion> combinacionesDe(Iterable<Integer> mascaras) {
        List<Combinacion> r = new ArrayList<>();
        mascaras.forEach(m -> r.add(combinacionDe(m)));
        return r;
    }

    /** Numero de combinaciones validas de 3 a 5 cartas halladas en la mano. */
    public int totalCombinaciones() {
        return tipos.size();
    }

    /** Particion de TODA la mano en combinaciones con exactamente estos tamanos (p. ej. 4, 3, 3). */
    public Optional<List<Combinacion>> particionExacta(int... tamanos) {
        int[] cupos = new int[ValidadorCombinacion.MAXIMO + 1];
        for (int t : tamanos) {
            if (t < ValidadorCombinacion.MINIMO || t > ValidadorCombinacion.MAXIMO) {
                return Optional.empty();
            }
            cupos[t]++;
        }
        if (Arrays.stream(tamanos).sum() != n) {
            return Optional.empty();
        }
        return particionar(completa, cupos, new ArrayDeque<>());
    }

    /** Particion de toda la mano en combinaciones de 3 a 5 cartas (cierre completo). */
    public Optional<List<Combinacion>> particionLibre() {
        return particionar(completa, null, new ArrayDeque<>());
    }

    private Optional<List<Combinacion>> particionar(int resto, int[] cupos, Deque<Integer> elegidas) {
        if (resto == 0) {
            return Optional.of(combinacionesDe(elegidas));
        }
        for (int m : porMenor[Integer.numberOfTrailingZeros(resto)]) {
            if (cabe(m, resto, cupos)) {
                Optional<List<Combinacion>> r = probar(m, resto, cupos, elegidas);
                if (r.isPresent()) {
                    return r;
                }
            }
        }
        return Optional.empty();
    }

    private static boolean cabe(int m, int resto, int[] cupos) {
        return (m & resto) == m && (cupos == null || cupos[Integer.bitCount(m)] > 0);
    }

    private Optional<List<Combinacion>> probar(int m, int resto, int[] cupos, Deque<Integer> elegidas) {
        int k = Integer.bitCount(m);
        if (cupos != null) {
            cupos[k]--;
        }
        elegidas.push(m);
        Optional<List<Combinacion>> r = particionar(resto ^ m, cupos, elegidas);
        elegidas.pop();
        if (cupos != null) {
            cupos[k]++;
        }
        return r;
    }

    /** Mejor particion en {@code ternas} ternas mas el resto suelto; minimiza los puntos de lo suelto. */
    public Optional<ParticionConSobrantes> mejorParticionConSobrantes(int ternas) {
        int sueltas = n - ternas * TERNA;
        if (ternas < 0 || sueltas < 0) {
            return Optional.empty();
        }
        Mejor mejor = new Mejor();
        explorar(completa, ternas, sueltas, 0, new ArrayDeque<>(), new ArrayDeque<>(), mejor);
        if (mejor.puntos == Integer.MAX_VALUE) {
            return Optional.empty();
        }
        List<Carta> sobrantes = new ArrayList<>();
        mejor.sueltas.forEach(i -> sobrantes.add(mano.get(i)));
        return Optional.of(new ParticionConSobrantes(combinacionesDe(mejor.ternas), sobrantes, mejor.puntos));
    }

    private void explorar(int resto, int ternasQuedan, int sueltasQuedan, int acumulado,
                          Deque<Integer> ternas, Deque<Integer> sueltas, Mejor mejor) {
        if (resto == 0) {
            if (ternasQuedan == 0 && acumulado < mejor.puntos) {
                mejor.registrar(acumulado, ternas, sueltas);
            }
            return;
        }
        int c = Integer.numberOfTrailingZeros(resto);
        if (sueltasQuedan > 0) {
            sueltas.push(c);
            explorar(resto & (resto - 1), ternasQuedan, sueltasQuedan - 1, acumulado + puntos[c],
                    ternas, sueltas, mejor);
            sueltas.pop();
        }
        if (ternasQuedan > 0) {
            probarTernas(c, resto, ternasQuedan, sueltasQuedan, acumulado, ternas, sueltas, mejor);
        }
    }

    private void probarTernas(int c, int resto, int ternasQuedan, int sueltasQuedan, int acumulado,
                              Deque<Integer> ternas, Deque<Integer> sueltas, Mejor mejor) {
        for (int m : porMenor[c]) {
            if (Integer.bitCount(m) == TERNA && (m & resto) == m) {
                ternas.push(m);
                explorar(resto ^ m, ternasQuedan - 1, sueltasQuedan, acumulado, ternas, sueltas, mejor);
                ternas.pop();
            }
        }
    }

    /**
     * Programacion dinamica (RF07): f(S) = min(puntos(c) + f(S - c), min f(S - m)) con c la carta de menor
     * indice de S y m una combinacion valida que la contiene. A lo sumo 2^11 = 2.048 estados.
     */
    public Agrupacion minimizarSueltas() {
        int[] f = new int[completa + 1];
        int[] decision = new int[completa + 1];
        for (int s = 1; s <= completa; s++) {
            resolverEstado(s, f, decision);
        }
        return reconstruir(decision, f[completa]);
    }

    private void resolverEstado(int s, int[] f, int[] decision) {
        int c = Integer.numberOfTrailingZeros(s);
        int mejor = puntos[c] + f[s & (s - 1)];
        int elegida = 0;
        for (int m : porMenor[c]) {
            if ((m & s) == m && f[s ^ m] < mejor) {
                mejor = f[s ^ m];
                elegida = m;
            }
        }
        f[s] = mejor;
        decision[s] = elegida;
    }

    private Agrupacion reconstruir(int[] decision, int total) {
        List<Combinacion> combinaciones = new ArrayList<>();
        List<Carta> sueltas = new ArrayList<>();
        int s = completa;
        while (s != 0) {
            int m = decision[s];
            if (m == 0) {
                sueltas.add(mano.get(Integer.numberOfTrailingZeros(s)));
                s &= s - 1;
            } else {
                combinaciones.add(combinacionDe(m));
                s ^= m;
            }
        }
        return new Agrupacion(total, combinaciones, sueltas);
    }
}

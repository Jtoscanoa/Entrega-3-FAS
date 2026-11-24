package co.edu.unal.apuntado.domain.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.rules.evaluacion.TablaPuntos;
import co.edu.unal.apuntado.domain.rules.evaluacion.ValidadorCombinacion;
import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.Pinta;
import co.edu.unal.apuntado.domain.rules.modelo.Valor;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/** RF07: la programacion dinamica supera a la regla voraz y coincide con la fuerza bruta. */
class CartasSueltasTest {

    private final HandEvaluatorComponent evaluador = new HandEvaluatorComponent(new RegistroReglas());
    private final ConfiguracionReglas cfg = ConfiguracionReglas.apuntado101();

    @Test
    void cartaEnDisputaDaCuarentaYCincoNoCuarentaYOcho() {
        Agrupacion g = evaluador.cartasSueltas(Manos.de("7C 8C 9C 9T 9P KD QT 5P 3D 2T"), cfg);
        assertEquals(45, g.puntos());
        assertEquals(1, g.combinaciones().size());
    }

    @Test
    void tablaDePuntos() {
        assertEquals(10, TablaPuntos.puntos(Carta.deCodigo("AC")));
        assertEquals(10, TablaPuntos.puntos(Carta.deCodigo("KP")));
        assertEquals(10, TablaPuntos.puntos(Carta.deCodigo("10D")));
        assertEquals(7, TablaPuntos.puntos(Carta.deCodigo("7T")));
        assertEquals(0, TablaPuntos.puntos(Carta.COMODIN));
    }

    @Test
    void manoSinCombinacionesSumaTodo() {
        Agrupacion g = evaluador.cartasSueltas(Manos.de("AC 3D 5T 7P 9C"), cfg);
        assertEquals(10 + 3 + 5 + 7 + 9, g.puntos());
        assertTrue(g.combinaciones().isEmpty());
    }

    @Test
    void manoVaciaYUnaCarta() {
        assertEquals(0, evaluador.cartasSueltas(List.of(), cfg).puntos());
        assertEquals(10, evaluador.cartasSueltas(Manos.de("KC"), cfg).puntos());
    }

    @Test
    void programacionDinamicaIgualaFuerzaBrutaEnTrescientasManos() {
        Random azar = new Random(20261012L);
        List<Carta> baraja = baraja();
        for (int i = 0; i < 300; i++) {
            List<Carta> mano = new ArrayList<>(baraja);
            Collections.shuffle(mano, azar);
            mano = new ArrayList<>(mano.subList(0, 10 + (i % 2)));
            boolean comodines = i % 3 == 0;
            if (comodines) {
                mano.set(0, Carta.COMODIN);
            }
            assertEquals(fuerzaBruta(mano, comodines), evaluador.cartasSueltas(mano, cfg.conComodines(comodines)).puntos(),
                    "mano " + i);
        }
    }

    @Test
    void manosSesgadasAEscalerasTambienCoinciden() {
        Random azar = new Random(7L);
        for (int i = 0; i < 60; i++) {
            List<Carta> mano = new ArrayList<>();
            Pinta p = Pinta.values()[azar.nextInt(2)];
            for (int k = 0; k < 10; k++) {
                mano.add(new Carta(Valor.values()[azar.nextInt(8)], azar.nextBoolean() ? p : Pinta.PICAS));
            }
            assertEquals(fuerzaBruta(mano, false), evaluador.cartasSueltas(mano, cfg).puntos());
        }
    }

    private static List<Carta> baraja() {
        List<Carta> r = new ArrayList<>();
        for (Pinta p : Pinta.values()) {
            for (Valor v : Valor.values()) {
                r.add(new Carta(v, p));
            }
        }
        return r;
    }

    /** Implementacion independiente: recursion sobre la primera carta con subconjuntos explicitos. */
    private static int fuerzaBruta(List<Carta> mano, boolean comodines) {
        if (mano.isEmpty()) {
            return 0;
        }
        Carta primera = mano.get(0);
        List<Carta> resto = mano.subList(1, mano.size());
        int mejor = TablaPuntos.puntos(primera) + fuerzaBruta(resto, comodines);
        int m = resto.size();
        for (int mascara = 1; mascara < (1 << m); mascara++) {
            int k = Integer.bitCount(mascara);
            if (k < 2 || k > 4) {
                continue;
            }
            List<Carta> grupo = new ArrayList<>(List.of(primera));
            List<Carta> sobra = new ArrayList<>();
            for (int i = 0; i < m; i++) {
                ((mascara & (1 << i)) != 0 ? grupo : sobra).add(resto.get(i));
            }
            if (ValidadorCombinacion.clasificar(grupo, comodines).isPresent()) {
                mejor = Math.min(mejor, fuerzaBruta(sobra, comodines));
            }
        }
        return mejor;
    }
}

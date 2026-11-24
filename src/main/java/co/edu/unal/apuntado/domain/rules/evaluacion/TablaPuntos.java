package co.edu.unal.apuntado.domain.rules.evaluacion;

import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.Valor;

/** Puntos de una carta suelta (RF07): A, J, Q, K = 10; 2 a 10 = valor visible; comodin = 0. */
public final class TablaPuntos {

    private static final int PUNTOS_FIGURA = 10;

    private TablaPuntos() {
    }

    public static int puntos(Carta carta) {
        if (carta.esComodin()) {
            return 0;
        }
        Valor v = carta.valor();
        return v == Valor.AS || v.rango() >= PUNTOS_FIGURA ? PUNTOS_FIGURA : v.rango();
    }
}

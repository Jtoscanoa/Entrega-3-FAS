package co.edu.unal.apuntado.domain.rules.evaluacion;

import co.edu.unal.apuntado.domain.rules.ReglaJuego;
import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.MotivoRechazo;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import co.edu.unal.apuntado.domain.rules.modelo.TipoCierre;
import java.util.List;

/**
 * FF-13: variante de prueba que solo existe en test. Se cierra con "flor": las 10 cartas de la misma pinta, sin
 * comodines. Los perdedores pagan todas sus cartas como sueltas. Se registra por ServiceLoader desde
 * src/test/resources/variante-prueba, sin tocar ninguna clase de src/main.
 */
public final class ReglaFlorPrueba implements ReglaJuego {

    public static final String MODALIDAD = "FLOR_PRUEBA";
    private static final int PUNTOS_CIERRE = -20;

    @Override
    public String modalidad() {
        return MODALIDAD;
    }

    @Override
    public ResultadoValidacion evaluarCierre(List<Carta> mano, ConfiguracionReglas cfg) {
        boolean flor = mano.stream().noneMatch(Carta::esComodin)
                && mano.stream().map(Carta::pinta).distinct().count() == 1;
        return flor ? ResultadoValidacion.aceptado(TipoCierre.COMPLETO, PUNTOS_CIERRE)
                : ResultadoValidacion.rechazado(MotivoRechazo.ESTRUCTURA_INVALIDA);
    }

    @Override
    public Agrupacion cartasSueltas(List<Carta> mano, ConfiguracionReglas cfg) {
        int puntos = mano.stream().mapToInt(TablaPuntos::puntos).sum();
        return new Agrupacion(puntos, List.of(), mano);
    }
}

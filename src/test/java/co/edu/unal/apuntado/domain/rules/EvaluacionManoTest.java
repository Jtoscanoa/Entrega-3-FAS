package co.edu.unal.apuntado.domain.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.EvaluacionMano;
import co.edu.unal.apuntado.domain.rules.modelo.MotivoRechazo;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** RF16 (sesion S1, hallazgo 2): el servidor le dice al jugador cuanto le falta y si ya puede cerrar. */
class EvaluacionManoTest {

    private final HandEvaluatorComponent evaluador = new HandEvaluatorComponent(new RegistroReglas());
    private final ConfiguracionReglas apuntado = ConfiguracionReglas.apuntado101();
    private final ConfiguracionReglas clasica = ConfiguracionReglas.clasica();

    private static final String TERNAS = "5C 6C 7C 8D 8T 8P JC QC KC";

    private EvaluacionMano evaluar(String mano, ConfiguracionReglas cfg) {
        return evaluador.evaluarMano(Manos.de(mano), cfg);
    }

    @Test
    void apuntadoConDiezCartasCuentaTernasYSobranteSinCierre() {
        EvaluacionMano e = evaluar("5C 6C 7C 8D 8T 8P 2D 4T 9P KC", apuntado);
        assertEquals(2, e.ternasFormadas());
        assertEquals(3, e.ternasRequeridas());
        assertEquals(0, e.cuartasRequeridas());
        assertEquals(2 + 4 + 9 + 10, e.puntosSobrantes());
        assertEquals(List.of(List.of(0, 1, 2), List.of(3, 4, 5)), e.grupos());
        assertFalse(e.puedeCerrar(), "con 10 cartas primero hay que robar");
        assertNull(e.descarteSugerido());
    }

    @Test
    void apuntadoConOnceCartasEncuentraElDescarteQueCierra() {
        EvaluacionMano e = evaluar(TERNAS + " 4T KP", apuntado);
        assertTrue(e.puedeCerrar());
        assertEquals(10, e.descarteSugerido(), "descartar KP deja 3 ternas y sobrante 4");
        assertEquals(3, e.ternasFormadas());
        assertEquals(4, e.puntosSobrantes());
        assertEquals(3, e.grupos().size());
    }

    @Test
    void apuntadoSobranteDeCincoNoPermiteCerrar() {
        EvaluacionMano e = evaluar(TERNAS + " 5T KP", apuntado);
        assertFalse(e.puedeCerrar());
        assertEquals(3, e.ternasFormadas());
        assertEquals(5, e.puntosSobrantes());
        assertEquals(10, e.descarteSugerido());
    }

    @Test
    void losIndicesSeCorrenDespuesDelDescarte() {
        EvaluacionMano e = evaluar("KP " + TERNAS + " 4T", apuntado);
        assertEquals(0, e.descarteSugerido());
        assertEquals(List.of(1, 2, 3), e.grupos().get(0), "las ternas apuntan a la mano de 11 cartas");
    }

    @Test
    void apuntadoCompletoMuestraSusCombinacionesYSobranteCero() {
        EvaluacionMano e = evaluar("5P 6P 7P 8P 9P 2C 3C 4C 5C 6C", apuntado);
        assertEquals(Set.of(List.of(0, 1, 2, 3, 4), List.of(5, 6, 7, 8, 9)), Set.copyOf(e.grupos()));
        assertEquals(3, e.ternasFormadas());
        assertEquals(0, e.puntosSobrantes());
    }

    @Test
    void clasicaCuentaLaCuartaAparte() {
        EvaluacionMano e = evaluar("7C 7D 7T 7P 2C 3C 4C 9D 9T 9P", clasica);
        assertEquals(1, e.cuartasFormadas());
        assertEquals(1, e.cuartasRequeridas());
        assertEquals(2, e.ternasFormadas());
        assertEquals(0, e.puntosSobrantes());
        assertEquals(List.of(0, 1, 2, 3), e.grupos().get(0), "la cuarta va primero");
    }

    @Test
    void clasicaSinCuarta() {
        EvaluacionMano e = evaluar("7C 7D 7T 2C 3C 4C 9D 9T 9P KP", clasica);
        assertEquals(0, e.cuartasFormadas());
        assertEquals(2, e.ternasFormadas(), "se acota a las ternas que pide la modalidad");
        assertEquals(10, e.puntosSobrantes());
    }

    @Test
    void clasicaConOnceCartasPuedeCerrar() {
        EvaluacionMano e = evaluar("7C 7D 7T 7P 2C 3C 4C 9D 9T 9P KP", clasica);
        assertTrue(e.puedeCerrar());
        assertEquals(10, e.descarteSugerido());
    }

    @Test
    void modalidadDesconocida() {
        ConfiguracionReglas rara = new ConfiguracionReglas("CONTINENTAL", 101, 4, false, false, false,
                false, 0, -51, 30);
        assertThrows(IllegalArgumentException.class, () -> evaluar(TERNAS + " 4T", rara));
    }

    @Test
    void unaVarianteSinAvanceNoMuestraDetalle() {
        ReglaJuego variante = new ReglaJuego() {
            @Override
            public String modalidad() {
                return "SIN_DETALLE";
            }

            @Override
            public ResultadoValidacion evaluarCierre(List<Carta> mano, ConfiguracionReglas cfg) {
                return ResultadoValidacion.rechazado(MotivoRechazo.ESTRUCTURA_INVALIDA);
            }

            @Override
            public Agrupacion cartasSueltas(List<Carta> mano, ConfiguracionReglas cfg) {
                return new Agrupacion(0, List.of(), mano);
            }
        };
        assertEquals(EvaluacionMano.sinDetalle(), variante.evaluarAvance(Manos.de(TERNAS), apuntado));
    }

    @Test
    void preferenciaEntreDescartes() {
        EvaluacionMano cierra = new EvaluacionMano(List.of(), 0, 0, 3, 3, 4, true, 0);
        EvaluacionMano tres = new EvaluacionMano(List.of(), 0, 0, 3, 3, 9, false, 1);
        EvaluacionMano tresMenos = new EvaluacionMano(List.of(), 0, 0, 3, 3, 6, false, 2);
        EvaluacionMano dos = new EvaluacionMano(List.of(), 0, 0, 2, 3, 0, false, 3);
        assertTrue(cierra.mejorQue(tres));
        assertFalse(tres.mejorQue(cierra));
        assertTrue(tres.mejorQue(dos));
        assertFalse(dos.mejorQue(tres));
        assertTrue(tresMenos.mejorQue(tres));
        assertFalse(tres.mejorQue(tresMenos));
    }
}

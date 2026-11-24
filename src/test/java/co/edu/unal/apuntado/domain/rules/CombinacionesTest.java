package co.edu.unal.apuntado.domain.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.rules.evaluacion.ValidadorCombinacion;
import co.edu.unal.apuntado.domain.rules.modelo.TipoCombinacion;
import org.junit.jupiter.api.Test;

/** Tabla 4 del E2: casos borde de combinaciones. */
class CombinacionesTest {

    private static boolean valida(String cartas, boolean comodines) {
        return ValidadorCombinacion.clasificar(Manos.de(cartas), comodines).isPresent();
    }

    @Test
    void asEnEscaleraBajaYAlta() {
        assertTrue(valida("AC 2C 3C", false));
        assertTrue(valida("QP KP AP", false));
    }

    @Test
    void escaleraNoDaLaVuelta() {
        assertFalse(valida("KT AT 2T", false));
        assertFalse(valida("QT KT AT 2T", false));
    }

    @Test
    void comodinEnCualquierPosicion() {
        assertTrue(valida("* 5D 6D", true));
        assertTrue(valida("5D * 7D", true));
        assertTrue(valida("QC KC *", true));
    }

    @Test
    void dosComodinesNoFormanTerna() {
        assertFalse(valida("* * 7P", true));
    }

    @Test
    void comodinDeshabilitadoPorDefecto() {
        assertFalse(valida("* 5D 6D", false));
    }

    @Test
    void segundoMazoPermiteGrupoConRepetidasPeroNoEscaleraRepetida() {
        assertEquals(TipoCombinacion.GRUPO,
                ValidadorCombinacion.clasificar(Manos.de("7C 7C 7T"), false).orElseThrow());
        assertFalse(valida("5C 6C 6C", false));
    }

    @Test
    void grupoYEscaleraSeClasificanCorrectamente() {
        assertEquals(TipoCombinacion.GRUPO, ValidadorCombinacion.clasificar(Manos.de("9C 9D 9T 9P"), false).orElseThrow());
        assertEquals(TipoCombinacion.ESCALERA, ValidadorCombinacion.clasificar(Manos.de("5P 6P 7P 8P 9P"), false).orElseThrow());
        assertEquals(TipoCombinacion.GRUPO, ValidadorCombinacion.clasificar(Manos.de("9C 9D *"), true).orElseThrow());
    }

    @Test
    void rechazaTamanosYMezclas() {
        assertFalse(valida("5C 6C", false));
        assertFalse(valida("5C 6C 7C 8C 9C 10C", false));
        assertFalse(valida("5C 6D 7C", false));
        assertFalse(valida("5C 5D 6C", false));
        assertFalse(valida("2C 3C 5C", false));
    }

    @Test
    void escaleraConHuecoRellenadoPorComodin() {
        assertTrue(valida("5D * 7D", true));
        assertFalse(valida("5D * 8D", true));
    }
}

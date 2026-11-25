package co.edu.unal.apuntado.domain.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.EvaluacionMano;
import org.junit.jupiter.api.Test;

/**
 * Sesion S1 (E3-18f): "si cierran ahora" sale del servidor. La penalizacion son las cartas sueltas de la mano (RF07)
 * y la eliminacion usa la misma regla que la liquidacion (llegar al umbral elimina).
 */
class ProyeccionTest {

    private final HandEvaluatorComponent evaluador = new HandEvaluatorComponent(new RegistroReglas());
    private final RoundScoringComponent liquidacion = new RoundScoringComponent();
    private final ConfiguracionReglas apuntado = ConfiguracionReglas.apuntado101();

    /** 5C 6C 7C y 8-8-8 forman juego; sueltas 2D + 4T + 9P + KC = 25 puntos. */
    private static final String DOS_TERNAS = "5C 6C 7C 8D 8T 8P 2D 4T 9P KC";
    private static final String TERNAS = "5C 6C 7C 8D 8T 8P JC QC KC";

    private EvaluacionMano proyectar(String mano, int marcador, ConfiguracionReglas cfg) {
        return liquidacion.proyectar(evaluador.evaluarMano(Manos.de(mano), cfg), marcador, cfg);
    }

    @Test
    void laPenalizacionSonLasCartasSueltasDeLaMano() {
        EvaluacionMano e = proyectar(DOS_TERNAS, 39, apuntado);
        assertEquals(25, e.penalizacionSiCierranAhora());
        assertEquals(64, e.marcadorProyectado());
        assertEquals(37, e.faltaParaUmbral());
        assertFalse(e.quedariaEliminado());
    }

    @Test
    void llegarExactamenteAlUmbralElimina() {
        EvaluacionMano e = proyectar(DOS_TERNAS, 76, apuntado);
        assertEquals(101, e.marcadorProyectado());
        assertEquals(0, e.faltaParaUmbral());
        assertTrue(e.quedariaEliminado());
    }

    @Test
    void quedarUnPuntoPorDebajoNoElimina() {
        EvaluacionMano e = proyectar(DOS_TERNAS, 75, apuntado);
        assertEquals(100, e.marcadorProyectado());
        assertEquals(1, e.faltaParaUmbral());
        assertFalse(e.quedariaEliminado());
    }

    @Test
    void pasarseDelUmbralDaFaltaNegativaYElimina() {
        EvaluacionMano e = proyectar(DOS_TERNAS, 90, apuntado);
        assertEquals(-14, e.faltaParaUmbral());
        assertTrue(e.quedariaEliminado());
    }

    @Test
    void elUmbralConfiguradoEnLaSalaSeRespeta() {
        EvaluacionMano e = proyectar(DOS_TERNAS, 100, apuntado.conUmbral(150));
        assertEquals(125, e.marcadorProyectado());
        assertEquals(25, e.faltaParaUmbral());
        assertFalse(e.quedariaEliminado());
    }

    @Test
    void conOnceCartasSeProyectaLaManoTrasElDescarteSugerido() {
        EvaluacionMano e = proyectar(TERNAS + " 4T KP", 10, apuntado);
        assertEquals(10, e.descarteSugerido(), "se descartaria KP");
        assertEquals(4, e.penalizacionSiCierranAhora(), "queda 4T suelta");
        assertEquals(14, e.marcadorProyectado());
    }

    @Test
    void unaManoQueCierraNoSumaNada() {
        EvaluacionMano e = proyectar("5P 6P 7P 8P 9P 2C 3C 4C 5C 6C", 20, apuntado);
        assertEquals(0, e.penalizacionSiCierranAhora());
        assertEquals(20, e.marcadorProyectado());
    }

    @Test
    void laClasicaDeUnaRondaNoTieneUmbral() {
        EvaluacionMano e = proyectar("7C 7D 7T 2C 3C 4C 9D 9T 9P KP", 0, ConfiguracionReglas.clasica());
        assertEquals(10, e.penalizacionSiCierranAhora());
        assertEquals(10, e.marcadorProyectado());
        assertNull(e.faltaParaUmbral());
        assertFalse(e.quedariaEliminado());
    }

    @Test
    void sinProyectarElMarcadorQuedaVacio() {
        EvaluacionMano e = evaluador.evaluarMano(Manos.de(DOS_TERNAS), apuntado);
        assertEquals(25, e.penalizacionSiCierranAhora());
        assertNull(e.marcadorProyectado());
        assertNull(EvaluacionMano.sinDetalle().faltaParaUmbral());
    }
}

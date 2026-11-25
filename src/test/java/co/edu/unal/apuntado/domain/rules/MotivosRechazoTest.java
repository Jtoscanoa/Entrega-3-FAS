package co.edu.unal.apuntado.domain.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import co.edu.unal.apuntado.domain.rules.evaluacion.ReglaClasicaCuartaTerna;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.MotivoRechazo;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import org.junit.jupiter.api.Test;

/**
 * RF16 tras la sesion S1: cada rechazo dice que le falta al jugador. Los 12 rechazos de S1 mostraron el mismo texto
 * generico (docs/validacion/S1/resumen.md, hallazgo 1).
 */
class MotivosRechazoTest {

    private final HandEvaluatorComponent evaluador = new HandEvaluatorComponent(new RegistroReglas());
    private final ConfiguracionReglas apuntado = ConfiguracionReglas.apuntado101();
    private final ConfiguracionReglas clasica = ConfiguracionReglas.clasica();

    private static final String TERNAS = "5C 6C 7C 8D 8T 8P JC QC KC";

    private ResultadoValidacion apuntado(String mano) {
        return evaluador.validarCierre(Manos.de(mano), apuntado);
    }

    private ResultadoValidacion clasica(String mano) {
        return evaluador.validarCierre(Manos.de(mano), clasica);
    }

    private static void rechazo(ResultadoValidacion r, MotivoRechazo motivo, String mensaje) {
        assertFalse(r.valido());
        assertEquals(motivo, r.motivo());
        assertEquals(mensaje, r.mensaje());
    }

    // ---------------------------------------------------------------- Apuntado

    @Test
    void apuntadoConDosTernasDiceCuantasTiene() {
        rechazo(apuntado("5C 6C 7C 8D 8T 8P 2D 4T 9P KC"), MotivoRechazo.FALTAN_TERNAS, "Tienes 2 de 3 ternas.");
    }

    @Test
    void apuntadoConUnaTerna() {
        rechazo(apuntado("5C 6C 7C 2D 4T 9P KC JD 3P 10T"), MotivoRechazo.FALTAN_TERNAS, "Tienes 1 de 3 ternas.");
    }

    @Test
    void apuntadoSinTernas() {
        rechazo(apuntado("AC 3D 5T 7P 9C JD KT 2P 4D 6T"), MotivoRechazo.FALTAN_TERNAS, "Tienes 0 de 3 ternas.");
    }

    @Test
    void apuntadoSobranteDeExactamenteCincoSeRechazaConElValor() {
        rechazo(apuntado(TERNAS + " 5T"), MotivoRechazo.RESIDUO_EXCEDIDO, "Sobrante de 5 puntos; debe ser menor a 5.");
    }

    @Test
    void apuntadoSobranteDeUnaFigura() {
        rechazo(apuntado(TERNAS + " KT"), MotivoRechazo.RESIDUO_EXCEDIDO, "Sobrante de 10 puntos; debe ser menor a 5.");
    }

    @Test
    void apuntadoElTopeDelMensajeSigueAlResiduoConfigurado() {
        ResultadoValidacion r = evaluador.validarCierre(Manos.de(TERNAS + " 3T"), apuntado.conResiduoMaximo(2));
        rechazo(r, MotivoRechazo.RESIDUO_EXCEDIDO, "Sobrante de 3 puntos; debe ser menor a 3.");
    }

    // ---------------------------------------------------------------- Clasica

    @Test
    void clasicaSinCuartaConDosTernas() {
        rechazo(clasica("7C 7D 7T 2C 3C 4C 9D 9T 9P KP"), MotivoRechazo.FALTA_CUARTA,
                "Falta la cuarta (tienes 2 de 2 ternas).");
    }

    @Test
    void clasicaSinCuartaNiTernas() {
        rechazo(clasica("AC 3D 5T 7P 9C JD KT 2P 4D 6T"), MotivoRechazo.FALTA_CUARTA,
                "Falta la cuarta (tienes 0 de 2 ternas).");
    }

    @Test
    void clasicaConCuartaYUnaTerna() {
        rechazo(clasica("7C 7D 7T 7P 2C 3C 4C 9D JT KP"), MotivoRechazo.FALTAN_TERNAS, "Tienes 1 de 2 ternas.");
    }

    @Test
    void clasicaConCuartaSinTernas() {
        rechazo(clasica("7C 7D 7T 7P 2C 5D 9T JP KC 4D"), MotivoRechazo.FALTAN_TERNAS, "Tienes 0 de 2 ternas.");
    }

    @Test
    void clasicaDosEscalerasDeCincoTienenCuartaYUnaTerna() {
        rechazo(clasica("5P 6P 7P 8P 9P 2C 3C 4C 5C 6C"), MotivoRechazo.FALTAN_TERNAS, "Tienes 1 de 2 ternas.");
    }

    @Test
    void clasicaConCuartaYDosTernasQueNoCubrenLaManoSobranCartas() {
        ResultadoValidacion r = new ReglaClasicaCuartaTerna()
                .evaluarCierre(Manos.de("7C 7D 7T 7P 2C 3C 4C 9D 9T 9P KP"), clasica);
        rechazo(r, MotivoRechazo.SOBRAN_CARTAS, "Sobran cartas: la cuarta y las 2 ternas deben usar todas las cartas.");
    }

    // ---------------------------------------------------------------- textos fijos

    @Test
    void losMotivosSinDatosConservanSuTexto() {
        assertEquals(MotivoRechazo.NUMERO_DE_CARTAS.mensaje(),
                evaluador.validarCierre(Manos.de(TERNAS), apuntado).mensaje());
        assertEquals("Las cartas no forman la estructura que exige la modalidad.",
                ResultadoValidacion.rechazado(MotivoRechazo.ESTRUCTURA_INVALIDA).mensaje());
        assertEquals("Las cartas no forman la estructura que exige la modalidad.",
                new ResultadoValidacion(false, null, 0, MotivoRechazo.ESTRUCTURA_INVALIDA).mensaje());
    }
}

package co.edu.unal.apuntado.domain.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.MotivoRechazo;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import co.edu.unal.apuntado.domain.rules.modelo.TipoCierre;
import org.junit.jupiter.api.Test;

/** Casos borde de cierres (Tabla 4 del E2) contra el evaluador completo. */
class CierresTest {

    private final HandEvaluatorComponent evaluador = new HandEvaluatorComponent(new RegistroReglas());
    private final ConfiguracionReglas apuntado = ConfiguracionReglas.apuntado101();
    private final ConfiguracionReglas clasica = ConfiguracionReglas.clasica();

    private static final String TERNAS = "5C 6C 7C 8D 8T 8P JC QC KC";

    @Test
    void clasicaAceptaCuartaYDosTernas() {
        ResultadoValidacion r = evaluador.validarCierre(Manos.de("7C 7D 7T 7P 2C 3C 4C 9D 9T 9P"), clasica);
        assertTrue(r.valido());
        assertEquals(TipoCierre.CLASICO_433, r.tipo());
        assertEquals(-10, r.puntos());
    }

    @Test
    void clasicaAceptaCuartaEnEscalera() {
        assertTrue(evaluador.validarCierre(Manos.de("5C 6C 7C 8C 2D 2T 2P 9D 9T 9P"), clasica).valido());
    }

    @Test
    void clasicaRechazaDosEscalerasDeCinco() {
        ResultadoValidacion r = evaluador.validarCierre(Manos.de("5P 6P 7P 8P 9P 2C 3C 4C 5C 6C"), clasica);
        assertFalse(r.valido());
        assertEquals(MotivoRechazo.FALTAN_TERNAS, r.motivo());
    }

    @Test
    void apuntadoAceptaDosEscalerasDeCincoComoCompleto() {
        ResultadoValidacion r = evaluador.validarCierre(Manos.de("5P 6P 7P 8P 9P 2C 3C 4C 5C 6C"), apuntado);
        assertEquals(TipoCierre.COMPLETO, r.tipo());
        assertEquals(-10, r.puntos());
    }

    @Test
    void apuntadoResiduoCuatroEsAceptado() {
        ResultadoValidacion r = evaluador.validarCierre(Manos.de(TERNAS + " 4T"), apuntado);
        assertEquals(TipoCierre.APUNTADO, r.tipo());
        assertEquals(4, r.puntos());
    }

    @Test
    void apuntadoResiduoExactoDeCincoEsDenegado() {
        ResultadoValidacion r = evaluador.validarCierre(Manos.de(TERNAS + " 5T"), apuntado);
        assertFalse(r.valido());
        assertEquals(MotivoRechazo.RESIDUO_EXCEDIDO, r.motivo());
    }

    @Test
    void apuntadoRespetaResiduoMaximoConfigurable() {
        ConfiguracionReglas estricta = apuntado.conResiduoMaximo(2);
        assertEquals(MotivoRechazo.RESIDUO_EXCEDIDO,
                evaluador.validarCierre(Manos.de(TERNAS + " 4T"), estricta).motivo());
        assertTrue(evaluador.validarCierre(Manos.de(TERNAS + " 2T"), estricta).valido());
    }

    @Test
    void comodinSobranteSeTomaComoCompletoNoResiduoCero() {
        ResultadoValidacion r = evaluador.validarCierre(Manos.de(TERNAS + " *"), apuntado.conComodines(true));
        assertEquals(TipoCierre.COMPLETO, r.tipo());
        assertEquals(-10, r.puntos());
    }

    @Test
    void cierreAPintasSoloSiSeHabilita() {
        ConfiguracionReglas conPintas = apuntado.conCierreAPintas(true);
        ResultadoValidacion habilitado = evaluador.validarCierre(Manos.de("AC 2C 3C 4C 5C 6C 7C 8C 9C 10C"), conPintas);
        assertEquals(TipoCierre.A_PINTAS, habilitado.tipo());
        assertEquals(-25, habilitado.puntos());
        assertEquals(TipoCierre.A_PINTAS,
                evaluador.validarCierre(Manos.de("AC 2C 4C 6C 8C 9C 10C KC QC JC"), conPintas).tipo());
        assertFalse(evaluador.validarCierre(Manos.de("AC 2C 4C 6C 8C 10C KC QC JC 9C"), apuntado).valido());
    }

    @Test
    void cierreAPintasIgnoraComodinesYExigeUnaSolaPinta() {
        ConfiguracionReglas conPintasYComodines = apuntado.conCierreAPintas(true).conComodines(true);
        assertEquals(TipoCierre.A_PINTAS,
                evaluador.validarCierre(Manos.de("AC 2C 4C 6C 8C 9C 10C KC QC *"), conPintasYComodines).tipo());
        ResultadoValidacion mezcla = evaluador.validarCierre(Manos.de(TERNAS + " 4T"), apuntado.conCierreAPintas(true));
        assertEquals(TipoCierre.APUNTADO, mezcla.tipo(), "con dos o mas pintas se evalua como cierre normal");
        assertEquals(4, mezcla.puntos());
    }

    @Test
    void rechazaNumeroDeCartasYModalidadDesconocida() {
        assertEquals(MotivoRechazo.NUMERO_DE_CARTAS,
                evaluador.validarCierre(Manos.de(TERNAS), apuntado).motivo());
        ConfiguracionReglas rara = new ConfiguracionReglas("CONTINENTAL", 101, 4, false, false, false,
                false, 0, -51, 30);
        assertEquals(MotivoRechazo.MODALIDAD_DESCONOCIDA,
                evaluador.validarCierre(Manos.de(TERNAS + " 4T"), rara).motivo());
    }

    @Test
    void apuntadoRechazaManoSinTresTernas() {
        ResultadoValidacion r = evaluador.validarCierre(Manos.de("AC 3D 5T 7P 9C JD KT 2P 4D 6T"), apuntado);
        assertEquals(MotivoRechazo.FALTAN_TERNAS, r.motivo());
    }

    @Test
    void mesaDeCincoOSeisExigeSegundoMazo() {
        assertTrue(apuntado.admiteJugadores(4));
        assertFalse(apuntado.admiteJugadores(5));
        assertFalse(apuntado.admiteJugadores(6));
        assertTrue(apuntado.conSegundoMazo(true).admiteJugadores(6));
        assertFalse(apuntado.conSegundoMazo(true).admiteJugadores(7));
        assertFalse(apuntado.admiteJugadores(1));
    }
}

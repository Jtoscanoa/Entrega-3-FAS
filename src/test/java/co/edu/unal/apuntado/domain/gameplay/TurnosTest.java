package co.edu.unal.apuntado.domain.gameplay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.Escenario.MazoFalso;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import org.junit.jupiter.api.Test;

class TurnosTest {

    private static Escenario nuevo() {
        return new Escenario(new MazoFalso(Escenario.MANO_APUNTADA_CON_RESIDUO, Escenario.MANO_RIVAL));
    }

    private static MotivoComando motivo(Runnable r) {
        return assertThrows(ComandoInvalidoException.class, r::run).motivo();
    }

    @Test
    void tresTurnosCompletosRobarYDescartar() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        e.orquestador.descartar(id, "sub-a", "AD", 1);
        e.orquestador.robar(id, "sub-b", false, 2);
        e.orquestador.descartar(id, "sub-b", "2D", 2);
        e.orquestador.robar(id, "sub-a", false, 3);
        e.orquestador.descartar(id, "sub-a", "4T", 3);
        assertEquals(4, e.eventosDe(EventoDominio.TurnoAsignado.class).get(3).numeroTurno());
        assertEquals("sub-b", e.eventosDe(EventoDominio.TurnoAsignado.class).get(3).jugadorId());
        assertEquals(10, e.orquestador.vistaDe(id, "sub-a").mano().size());
    }

    @Test
    void rechazaFueraDeTurnoTurnoViejoFaseYCartaAjena() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        assertEquals(MotivoComando.FUERA_DE_TURNO, motivo(() -> e.orquestador.descartar(id, "sub-b", "2D", 1)));
        assertEquals(MotivoComando.TURNO_OBSOLETO, motivo(() -> e.orquestador.descartar(id, "sub-a", "AD", 9)));
        assertEquals(MotivoComando.FASE_INCORRECTA, motivo(() -> e.orquestador.robar(id, "sub-a", false, 1)));
        assertEquals(MotivoComando.CARTA_NO_EN_MANO, motivo(() -> e.orquestador.descartar(id, "sub-a", "KP", 1)));
        assertEquals(MotivoComando.PARTIDA_INEXISTENTE, motivo(() -> e.orquestador.robar(99, "sub-a", false, 1)));
        assertEquals(11, e.orquestador.vistaDe(id, "sub-a").mano().size());
    }

    @Test
    void robarDelDescarteSoloSiLaSalaLoHabilita() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        e.orquestador.descartar(id, "sub-a", "AD", 1);
        assertEquals(MotivoComando.DESCARTE_NO_PERMITIDO, motivo(() -> e.orquestador.robar(id, "sub-b", true, 2)));

        Escenario f = nuevo();
        long id2 = f.iniciar(ConfiguracionReglas.apuntado101().conRobarDelDescarte(true), 2);
        f.orquestador.descartar(id2, "sub-a", "AD", 1);
        f.orquestador.robar(id2, "sub-b", true, 2);
        assertTrue(f.orquestador.vistaDe(id2, "sub-b").mano().contains("AD"));
        assertEquals(EventoDominio.Origen.DESCARTE, f.eventosDe(EventoDominio.CartaRobada.class).get(0).origen());
    }

    @Test
    void laCartaRobadaViajaSoloASuDueno() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        e.orquestador.descartar(id, "sub-a", "AD", 1);
        e.orquestador.robar(id, "sub-b", false, 2);
        assertEquals("sub-b", e.eventosDe(EventoDominio.CartaRecibida.class).get(0).destinatario());
        assertEquals(null, e.eventosDe(EventoDominio.CartaRobada.class).get(0).destinatario());
        assertEquals("sub-a", e.eventosDe(EventoDominio.ManoEntregada.class).get(0).destinatario());
    }

    @Test
    void elTemporizadorObsoletoNoTieneEfectoYElVigenteJuegaPorDefectoSinCerrar() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        Runnable temporizadorDelTurno1 = e.programador.pendientes.get(0);
        e.orquestador.descartar(id, "sub-a", "AD", 1);
        int antes = e.eventos.size();
        temporizadorDelTurno1.run();
        assertEquals(antes, e.eventos.size(), "vencimiento viejo ignorado");

        e.programador.pendientes.get(1).run();
        assertEquals(3, e.eventosDe(EventoDominio.TurnoAsignado.class).size());
        assertEquals("sub-a", e.eventosDe(EventoDominio.TurnoAsignado.class).get(2).jugadorId());
        assertTrue(e.eventosDe(EventoDominio.RondaLiquidada.class).isEmpty(), "nunca cierra por el jugador");
        assertEquals(10, e.orquestador.vistaDe(id, "sub-b").mano().size());
    }

    @Test
    void temporizadorDelPrimerTurnoDescartaLaUltimaCartaDelAbridor() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        e.programador.pendientes.get(0).run();
        assertEquals(10, e.orquestador.vistaDe(id, "sub-a").mano().size());
        assertFalse(e.orquestador.vistaDe(id, "sub-a").mano().contains("AD"));
    }

    @Test
    void laVistaDeReconexionNoIncluyeManosAjenas() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        VistaPartida v = e.orquestador.vistaDe(id, "sub-b");
        assertEquals(10, v.mano().size());
        assertEquals("sub-a", v.turnoDe());
        assertEquals("4D", v.cimaDescarte());
        assertEquals(MotivoComando.FUERA_DE_TURNO, motivo(() -> e.orquestador.vistaDe(id, "intruso")));
    }

    @Test
    void mesaDeSeisSinSegundoMazoSeRechazaAlIniciar() {
        Escenario e = nuevo();
        assertThrows(IllegalArgumentException.class, () -> e.iniciar(ConfiguracionReglas.apuntado101(), 6));
    }

    @Test
    void elUmbralEliminaYTerminaLaPartidaEnUnaSolaLiquidacion() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101().conUmbral(40), 2);
        e.orquestador.cerrar(id, "sub-a", "AD", 1);
        EventoDominio.PartidaFinalizada fin = e.eventosDe(EventoDominio.PartidaFinalizada.class).get(0);
        assertEquals("sub-a", fin.ganadorId());
        assertEquals("ULTIMO_ACTIVO", fin.motivo());
        assertTrue(e.eventosDe(EventoDominio.RondaLiquidada.class).get(0).eliminados().contains("sub-b"));
        assertEquals(MotivoComando.PARTIDA_FINALIZADA, motivo(() -> e.orquestador.descartar(id, "sub-a", "AD", 1)));
    }
}

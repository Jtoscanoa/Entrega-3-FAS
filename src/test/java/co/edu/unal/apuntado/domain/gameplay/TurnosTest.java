package co.edu.unal.apuntado.domain.gameplay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.Escenario.MazoFalso;
import co.edu.unal.apuntado.domain.gameplay.EventoDominio.TurnoAsignado;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import java.time.Duration;
import java.util.List;
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

    // ------------------------------------------------------------------ presencia (RF17, ADR-08b)

    private static TurnoAsignado ultimoTurno(Escenario e) {
        List<TurnoAsignado> t = e.eventosDe(TurnoAsignado.class);
        return t.get(t.size() - 1);
    }

    @Test
    void alIniciarSePresumeQueTodosEstanConectados() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        assertEquals(Duration.ofSeconds(30), e.programador.ultimaEspera(), "primer turno con el limite normal");
        assertEquals(List.of("sub-a", "sub-b"), e.orquestador.vistaDe(id, "sub-a").conectados());
    }

    @Test
    void elTurnoDeUnAusenteVenceALosDiezSegundosYSeJuegaPorDefecto() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        e.orquestador.marcarConexion(id, "sub-b", false);
        assertEquals(List.of("sub-a"), e.orquestador.vistaDe(id, "sub-a").conectados());
        e.orquestador.descartar(id, "sub-a", "AD", 1);
        assertEquals(Duration.ofSeconds(10), e.programador.ultimaEspera());
        assertEquals(Escenario.AHORA.plusSeconds(10), ultimoTurno(e).venceEn());
        e.programador.ultimo().run();
        assertEquals("sub-a", ultimoTurno(e).jugadorId(), "el ausente robo y descarto por defecto");
        assertEquals(10, e.orquestador.vistaDe(id, "sub-b").mano().size());
        assertTrue(e.eventosDe(EventoDominio.RondaLiquidada.class).isEmpty(), "nunca cierra por el ausente");
    }

    @Test
    void desconectarseEnSuTurnoAcortaElPlazoYVolverLoRestaura() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        e.orquestador.marcarConexion(id, "sub-a", false);
        assertEquals(Duration.ofSeconds(10), e.programador.ultimaEspera());
        Runnable vencimientoCorto = e.programador.ultimo();
        assertEquals(1, ultimoTurno(e).numeroTurno(), "mismo turno, nueva hora limite");

        e.orquestador.marcarConexion(id, "sub-a", true);
        assertEquals(Duration.ofSeconds(30), e.programador.ultimaEspera(), "vuelve el limite normal");
        assertEquals(Escenario.AHORA.plusSeconds(30), ultimoTurno(e).venceEn());
        int antes = e.eventos.size();
        vencimientoCorto.run();
        assertEquals(antes, e.eventos.size(), "el vencimiento reprogramado ya no vale aunque sea del mismo turno");
        assertEquals(11, e.orquestador.vistaDe(id, "sub-a").mano().size());
    }

    @Test
    void conLaMesaVaciaNoSeProgramanVencimientosHastaQueVuelvaAlguien() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        e.orquestador.marcarConexion(id, "sub-a", false);
        Runnable vencimientoCorto = e.programador.ultimo();
        int programados = e.programador.pendientes.size();

        e.orquestador.marcarConexion(id, "sub-b", false);
        assertEquals(programados, e.programador.pendientes.size(), "mesa vacia: no se programa nada");
        assertEquals(null, ultimoTurno(e).venceEn(), "pausa: sin hora limite");
        vencimientoCorto.run();
        assertEquals(11, e.orquestador.vistaDe(id, "sub-a").mano().size(), "nada vence en pausa");
        assertTrue(e.orquestador.vistaDe(id, "sub-a").conectados().isEmpty());
    }

    @Test
    void laMesaVaciaSePausaYSeReanudaCuandoVuelveAlguien() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        e.orquestador.marcarConexion(id, "sub-b", false);
        e.orquestador.marcarConexion(id, "sub-a", false);
        e.orquestador.marcarConexion(id, "sub-b", false);
        int enPausa = e.programador.pendientes.size();
        e.orquestador.marcarConexion(id, "sub-b", false);
        assertEquals(enPausa, e.programador.pendientes.size());

        e.orquestador.marcarConexion(id, "sub-b", true);
        assertEquals(enPausa + 1, e.programador.pendientes.size(), "se reanuda al volver un jugador");
        assertEquals(Duration.ofSeconds(10), e.programador.ultimaEspera(), "quien juega sigue ausente");
        e.programador.ultimo().run();
        assertEquals("sub-b", ultimoTurno(e).jugadorId());
    }

    @Test
    void laPresenciaDeAjenosOFueraDeTurnoNoReprograma() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        int programados = e.programador.pendientes.size();
        e.orquestador.marcarConexion(id, "intruso", false);
        e.orquestador.marcarConexion(id, "sub-b", true);
        e.orquestador.marcarConexion(id, "sub-b", false);
        e.orquestador.marcarConexion(id, "sub-b", true);
        assertEquals(programados, e.programador.pendientes.size(), "sub-b no tiene el turno y la mesa no se vacia");
        assertEquals(MotivoComando.PARTIDA_INEXISTENTE, motivo(() -> e.orquestador.marcarConexion(99, "sub-a", false)));
    }

    @Test
    void soloLosJugadoresConAsientoParticipan() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        assertTrue(e.orquestador.participa(id, "sub-b"));
        assertFalse(e.orquestador.participa(id, "intruso"));
        assertEquals(MotivoComando.PARTIDA_INEXISTENTE, motivo(() -> e.orquestador.participa(99L, "sub-a")));
    }
}

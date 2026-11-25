package co.edu.unal.apuntado.domain.gameplay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.Escenario.MazoFalso;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import co.edu.unal.apuntado.domain.rules.modelo.TipoCierre;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

/** Patron State de la FSM: que admite cada estado y la secuencia completa a traves del orquestador. */
class TransicionesEstadoTest {

    /** Registra que operacion pidio el estado. */
    private static final class AccionesFalsas implements AccionesTurno {
        final List<String> llamadas = new ArrayList<>();
        final ResultadoValidacion cierre = ResultadoValidacion.aceptado(TipoCierre.COMPLETO, -10);

        @Override public void robar(boolean delDescarte) { llamadas.add("robar:" + delDescarte); }
        @Override public void descartar(String carta) { llamadas.add("descartar:" + carta); }
        @Override public ResultadoValidacion cerrar(String carta) { llamadas.add("cerrar:" + carta); return cierre; }
        @Override public void descartarPorDefecto() { llamadas.add("porDefecto"); }
    }

    private static MotivoComando rechazo(Executable x) {
        return assertThrows(ComandoInvalidoException.class, x).motivo();
    }

    private static void rechazaTodo(EstadoTurno estado, MotivoComando motivo) {
        AccionesFalsas a = new AccionesFalsas();
        assertEquals(motivo, rechazo(() -> estado.robar(a, false)));
        assertEquals(motivo, rechazo(() -> estado.descartar(a, "2C")));
        assertEquals(motivo, rechazo(() -> estado.cerrar(a, "2C")));
        estado.vencer(a);
        assertTrue(a.llamadas.isEmpty(), "sin turno en juego el vencimiento no hace nada");
        assertFalse(estado.turnoEnJuego());
    }

    // ---------------------------------------------------------------- estados aislados

    @Test
    void esperandoRoboSoloAdmiteRobarYAlVencerRobaYDescarta() {
        EstadoTurno e = EstadoTurno.ESPERANDO_ROBO;
        AccionesFalsas a = new AccionesFalsas();
        e.robar(a, true);
        assertEquals(MotivoComando.FASE_INCORRECTA, rechazo(() -> e.descartar(a, "2C")));
        assertEquals(MotivoComando.FASE_INCORRECTA, rechazo(() -> e.cerrar(a, "2C")));
        e.vencer(a);
        assertEquals(List.of("robar:true", "robar:false", "porDefecto"), a.llamadas);
        assertTrue(e.turnoEnJuego());
        assertFalse(e.finalizada());
        assertEquals("ESPERANDO_ROBO", e.nombre());
    }

    @Test
    void esperandoDescarteAdmiteDescartarOCerrarYAlVencerSoloDescarta() {
        EstadoTurno e = EstadoTurno.ESPERANDO_DESCARTE;
        AccionesFalsas a = new AccionesFalsas();
        assertEquals(MotivoComando.FASE_INCORRECTA, rechazo(() -> e.robar(a, false)));
        e.descartar(a, "7C");
        assertSame(a.cierre, e.cerrar(a, "AD"));
        e.vencer(a);
        assertEquals(List.of("descartar:7C", "cerrar:AD", "porDefecto"), a.llamadas, "nunca cierra por el jugador");
        assertTrue(e.turnoEnJuego());
        assertEquals("ESPERANDO_DESCARTE", e.nombre());
    }

    @Test
    void entreRondasNoAdmiteJugadas() {
        rechazaTodo(EstadoTurno.ENTRE_RONDAS, MotivoComando.FASE_INCORRECTA);
        assertEquals("ENTRE_RONDAS", EstadoTurno.ENTRE_RONDAS.nombre());
        assertFalse(EstadoTurno.ENTRE_RONDAS.finalizada());
    }

    @Test
    void finalizadaEsTerminal() {
        rechazaTodo(EstadoTurno.FINALIZADA, MotivoComando.PARTIDA_FINALIZADA);
        assertTrue(EstadoTurno.FINALIZADA.finalizada());
        assertEquals("FINALIZADA", EstadoTurno.FINALIZADA.nombre());
    }

    // ---------------------------------------------------------------- secuencia por el orquestador

    private static int turno(Escenario e) {
        List<EventoDominio.TurnoAsignado> t = e.eventosDe(EventoDominio.TurnoAsignado.class);
        return t.get(t.size() - 1).numeroTurno();
    }

    @Test
    void secuenciaDeTurnoDescartarRobarYFueraDeFase() {
        Escenario e = new Escenario(new MazoFalso(Escenario.MANO_APUNTADA_CON_RESIDUO, Escenario.MANO_RIVAL));
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        assertEquals("ESPERANDO_DESCARTE", e.orquestador.vistaDe(id, "sub-a").fase(), "el abridor empieza con 11");
        assertEquals(MotivoComando.FASE_INCORRECTA, rechazo(() -> e.orquestador.robar(id, "sub-a", false, turno(e))));

        e.orquestador.descartar(id, "sub-a", "4T", turno(e));
        assertEquals("ESPERANDO_ROBO", e.orquestador.vistaDe(id, "sub-b").fase());
        assertEquals(MotivoComando.FASE_INCORRECTA,
                rechazo(() -> e.orquestador.descartar(id, "sub-b", "AC", turno(e))));
        assertEquals(MotivoComando.FUERA_DE_TURNO, rechazo(() -> e.orquestador.robar(id, "sub-a", false, turno(e))),
                "el turno se valida antes que la fase, como antes del refactor");

        e.orquestador.robar(id, "sub-b", false, turno(e));
        assertEquals("ESPERANDO_DESCARTE", e.orquestador.vistaDe(id, "sub-b").fase());
    }

    @Test
    void elVencimientoSigueElEstado() {
        Escenario e = new Escenario(new MazoFalso(Escenario.MANO_APUNTADA_CON_RESIDUO, Escenario.MANO_RIVAL));
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        e.orquestador.vencerTurno(id, turno(e));
        assertEquals("AD", e.eventosDe(EventoDominio.CartaDescartada.class).get(0).carta(),
                "esperando descarte, el abridor suelta la ultima de su mano");
        e.orquestador.vencerTurno(id, turno(e));
        assertEquals(1, e.eventosDe(EventoDominio.CartaRobada.class).size(), "esperando robo, roba y descarta");
        assertEquals("ESPERANDO_ROBO", e.orquestador.vistaDe(id, "sub-a").fase());
    }

    @Test
    void cierreValidoAbreOtraRondaYLaClasicaTermina() {
        Escenario apuntado = new Escenario(new MazoFalso(Escenario.MANO_APUNTADA_CON_RESIDUO, Escenario.MANO_RIVAL));
        long id = apuntado.iniciar(ConfiguracionReglas.apuntado101(), 2);
        assertTrue(apuntado.orquestador.cerrar(id, "sub-a", "AD", turno(apuntado)).valido());
        VistaPartida v = apuntado.orquestador.vistaDe(id, "sub-a");
        assertEquals(2, v.numeroRonda());
        assertEquals("ESPERANDO_DESCARTE", v.fase(), "la ronda siguiente empieza con su abridor");

        Escenario clasica = new Escenario(new MazoFalso(Escenario.MANO_CLASICA_GANADORA, Escenario.MANO_RIVAL));
        long c = clasica.iniciar(ConfiguracionReglas.clasica(), 2);
        int t = turno(clasica);
        assertTrue(clasica.orquestador.cerrar(c, "sub-a", "5D", t).valido());
        VistaPartida fin = clasica.orquestador.vistaDe(c, "sub-b");
        assertEquals("FINALIZADA", fin.fase());
        assertTrue(fin.finalizada());
        assertEquals(MotivoComando.PARTIDA_FINALIZADA, rechazo(() -> clasica.orquestador.robar(c, "sub-b", false, t)));
    }
}

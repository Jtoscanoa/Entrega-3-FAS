package co.edu.unal.apuntado.domain.gameplay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.Escenario.MazoFalso;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * D9 (retro E2): si la liquidacion ya se confirmo y falla el registro de la ronda siguiente, el cierre no devuelve
 * error y la partida queda ENTRE_RONDAS hasta que el comando idempotente reanudarRonda la abre.
 */
class ReaperturaRondaTest {

    private final Escenario e = new Escenario(new MazoFalso(Escenario.MANO_APUNTADA_CON_RESIDUO, Escenario.MANO_RIVAL));
    private long id;

    /** Ana (sub-a) cierra la ronda 1 con el registro de la ronda 2 caido. */
    private void cerrarConRegistroCaido() {
        id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        int turno = e.eventosDe(EventoDominio.TurnoAsignado.class).get(0).numeroTurno();
        e.estado.fallarInicioRonda = true;
        assertTrue(e.orquestador.cerrar(id, "sub-a", "AD", turno).valido(), "el cierre confirmado no es un error");
    }

    private List<EventoDominio.RondaIniciada> rondas() {
        return e.eventosDe(EventoDominio.RondaIniciada.class);
    }

    @Test
    void elCierreConfirmadoNoFallaYLaPartidaQuedaEntreRondas() {
        cerrarConRegistroCaido();

        assertEquals(1, e.estado.liquidaciones.get());
        assertEquals(1, e.eventosDe(EventoDominio.RondaLiquidada.class).size());
        List<EventoDominio.RondaPendiente> pendientes = e.eventosDe(EventoDominio.RondaPendiente.class);
        assertEquals(1, pendientes.size());
        assertEquals(2, pendientes.get(0).numeroRonda());
        assertEquals("IllegalStateException", pendientes.get(0).causa());
        assertEquals(1, rondas().size(), "la ronda 2 no se anuncio");

        VistaPartida v = e.orquestador.vistaDe(id, "sub-b");
        assertEquals("ENTRE_RONDAS", v.fase());
        assertEquals(1, v.numeroRonda());
        assertNull(v.cimaDescarte(), "el mazo de la ronda fallida se libero");
        assertEquals(4, v.marcador().get("sub-a"), "los puntos liquidados se conservan");
    }

    @Test
    void elVencimientoViejoYLaPresenciaNoHacenNadaMientrasLaRondaEstaPendiente() {
        cerrarConRegistroCaido();
        int antes = e.eventos.size();

        e.programador.ultimo().run();
        e.orquestador.marcarConexion(id, "sub-b", false);

        assertEquals(antes, e.eventos.size());
        assertEquals("ENTRE_RONDAS", e.orquestador.vistaDe(id, "sub-a").fase());
    }

    @Test
    void reanudarAbreLaRondaConElAbridorSiguienteYEsIdempotente() {
        cerrarConRegistroCaido();
        e.estado.fallarInicioRonda = false;

        e.orquestador.reanudarRonda(id, "sub-b");
        e.orquestador.reanudarRonda(id, "sub-a");

        assertEquals(2, rondas().size(), "dos reanudaciones abren una sola ronda");
        assertEquals(2, rondas().get(1).numeroRonda());
        assertEquals("sub-b", rondas().get(1).abridor());
        VistaPartida v = e.orquestador.vistaDe(id, "sub-b");
        assertEquals("ESPERANDO_DESCARTE", v.fase());
        assertEquals("sub-b", v.turnoDe());
    }

    @Test
    void unReintentoFallidoVuelveAAvisarSinSaltarseAlAbridor() {
        cerrarConRegistroCaido();

        e.orquestador.reanudarRonda(id, "sub-a");
        assertEquals(2, e.eventosDe(EventoDominio.RondaPendiente.class).size());
        assertEquals(1, e.orquestador.vistaDe(id, "sub-a").numeroRonda());

        e.estado.fallarInicioRonda = false;
        e.orquestador.reanudarRonda(id, "sub-a");
        assertEquals(2, rondas().get(1).numeroRonda());
        assertEquals("sub-b", rondas().get(1).abridor(), "el abridor avanza una sola vez");
    }

    @Test
    void enJuegoNormalReanudarNoHaceNada() {
        id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        int antes = e.eventos.size();
        e.orquestador.reanudarRonda(id, "sub-a");
        assertEquals(antes, e.eventos.size());
    }

    @Test
    void quienNoJuegaLaPartidaNoLaReanuda() {
        cerrarConRegistroCaido();
        e.estado.fallarInicioRonda = false;
        int antes = e.eventos.size();
        e.orquestador.reanudarRonda(id, "intruso");
        assertEquals(antes, e.eventos.size());
        assertEquals("ENTRE_RONDAS", e.orquestador.vistaDe(id, "sub-a").fase());
    }

    @Test
    void reanudarUnaPartidaQueNoEstaEnMemoriaSeRechaza() {
        ComandoInvalidoException x = assertThrows(ComandoInvalidoException.class,
                () -> e.orquestador.reanudarRonda(99L, "sub-a"));
        assertEquals(MotivoComando.PARTIDA_INEXISTENTE, x.motivo());
    }
}

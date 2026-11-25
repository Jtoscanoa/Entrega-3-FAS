package co.edu.unal.apuntado.domain.gameplay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.Escenario.MazoFalso;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import org.junit.jupiter.api.Test;

/** RF13: el historial de rondas lo da el servidor en la vista, asi que una recarga de la SPA no lo pierde. */
class HistorialRondasTest {

    private static Escenario nuevo() {
        return new Escenario(new MazoFalso(Escenario.MANO_APUNTADA_CON_RESIDUO, Escenario.MANO_RIVAL));
    }

    @Test
    void sinLiquidarNoHayHistorial() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        int turno = e.eventosDe(EventoDominio.TurnoAsignado.class).get(0).numeroTurno();
        e.orquestador.cerrar(id, "sub-a", "4T", turno);
        assertTrue(e.orquestador.vistaDe(id, "sub-a").historial().isEmpty(), "un cierre rechazado no es una ronda");
    }

    @Test
    void laRondaLiquidadaQuedaEnLaVistaDeTodos() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        int turno = e.eventosDe(EventoDominio.TurnoAsignado.class).get(0).numeroTurno();
        assertTrue(e.orquestador.cerrar(id, "sub-a", "AD", turno).valido());

        for (String jugador : new String[] {"sub-a", "sub-b"}) {
            VistaPartida v = e.orquestador.vistaDe(id, jugador);
            assertEquals(1, v.historial().size());
            RondaHistorial r = v.historial().get(0);
            assertEquals(1, r.numeroRonda());
            assertEquals("sub-a", r.cerradorId());
            assertEquals("APUNTADO", r.tipoCierre());
            assertEquals(4, r.puntosRonda().get("sub-a"));
            assertEquals(v.marcador().get("sub-b"), r.marcador().get("sub-b"), "el total es el marcador tras la ronda");
        }
    }

    @Test
    void elHistorialEsInmutable() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        int turno = e.eventosDe(EventoDominio.TurnoAsignado.class).get(0).numeroTurno();
        e.orquestador.cerrar(id, "sub-a", "AD", turno);
        VistaPartida v = e.orquestador.vistaDe(id, "sub-a");
        assertThrows(UnsupportedOperationException.class, () -> v.historial().clear());
        assertThrows(UnsupportedOperationException.class, () -> v.historial().get(0).puntosRonda().clear());
    }
}

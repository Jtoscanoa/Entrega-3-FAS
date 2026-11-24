package co.edu.unal.apuntado.domain.gameplay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.Escenario.MazoFalso;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import org.junit.jupiter.api.Test;

/** Simulacion de fallo transaccional: sin commit no hay cambio de memoria ni evento (E5, ADR-06). */
class FalloTransaccionalTest {

    private static Escenario nuevo() {
        return new Escenario(new MazoFalso(Escenario.MANO_APUNTADA_CON_RESIDUO, Escenario.MANO_RIVAL));
    }

    @Test
    void siFallaLaTransaccionNadaSeAplicaNiSeDifunde() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        int turno = e.eventosDe(EventoDominio.TurnoAsignado.class).get(0).numeroTurno();
        e.estado.fallar = true;

        assertThrows(IllegalStateException.class, () -> e.orquestador.cerrar(id, "sub-a", "AD", turno));

        VistaPartida v = e.orquestador.vistaDe(id, "sub-a");
        assertEquals(11, v.mano().size(), "la mano sigue intacta");
        assertEquals(0, v.marcador().get("sub-a"));
        assertEquals(0, v.marcador().get("sub-b"));
        assertEquals(turno, v.numeroTurno());
        assertTrue(e.eventosDe(EventoDominio.RondaLiquidada.class).isEmpty(), "ningun cliente ve un marcador sin commit");
        assertEquals(0, e.estado.liquidaciones.get());
    }

    @Test
    void trasRecuperarseElMismoCierreSiLiquida() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        int turno = e.eventosDe(EventoDominio.TurnoAsignado.class).get(0).numeroTurno();
        e.estado.fallar = true;
        assertThrows(IllegalStateException.class, () -> e.orquestador.cerrar(id, "sub-a", "AD", turno));
        e.estado.fallar = false;
        assertTrue(e.orquestador.cerrar(id, "sub-a", "AD", turno).valido());
        assertEquals(1, e.estado.liquidaciones.get());
        assertEquals(2, e.estado.intentos.get());
        assertEquals(4, e.estado.guardadas.get(0).puntajes().get(0).total());
    }

    @Test
    void cierreInvalidoNoTocaLaPersistencia() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        int turno = e.eventosDe(EventoDominio.TurnoAsignado.class).get(0).numeroTurno();
        assertFalse(e.orquestador.cerrar(id, "sub-a", "4T", turno).valido());
        assertEquals(0, e.estado.intentos.get());
        assertEquals(1, e.eventosDe(EventoDominio.CierreRechazado.class).size());
        assertEquals("sub-a", e.eventosDe(EventoDominio.CierreRechazado.class).get(0).destinatario());
    }
}

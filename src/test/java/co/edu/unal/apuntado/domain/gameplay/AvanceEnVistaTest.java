package co.edu.unal.apuntado.domain.gameplay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.Escenario.MazoFalso;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.EvaluacionMano;
import org.junit.jupiter.api.Test;

/** RF16 de punta a punta en el orquestador: la vista trae el avance de la mano propia y el rechazo, su motivo. */
class AvanceEnVistaTest {

    private static Escenario nuevo() {
        return new Escenario(new MazoFalso(Escenario.MANO_APUNTADA_CON_RESIDUO, Escenario.MANO_RIVAL));
    }

    @Test
    void laVistaDeQuienDebeDescartarDiceSiPuedeCerrarYConQueCarta() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        VistaPartida v = e.orquestador.vistaDe(id, "sub-a");
        EvaluacionMano a = v.evaluacion();
        assertTrue(a.puedeCerrar());
        assertEquals("AD", v.mano().get(a.descarteSugerido()), "descartar el As deja 3 ternas y sobrante 4");
        assertEquals(3, a.ternasFormadas());
        assertEquals(4, a.puntosSobrantes());
        assertEquals(3, a.grupos().size());
    }

    @Test
    void laVistaDelRivalMuestraSuAvanceSinCierre() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        EvaluacionMano b = e.orquestador.vistaDe(id, "sub-b").evaluacion();
        assertFalse(b.puedeCerrar());
        assertEquals(3, b.ternasRequeridas());
    }

    @Test
    void elRechazoDiceQueFalta() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        int turno = e.eventosDe(EventoDominio.TurnoAsignado.class).get(0).numeroTurno();
        assertFalse(e.orquestador.cerrar(id, "sub-a", "4T", turno).valido());
        assertEquals("Sobrante de 10 puntos; debe ser menor a 5.",
                e.eventosDe(EventoDominio.CierreRechazado.class).get(0).motivo());
    }

    /** E3-18f: la vista trae la proyeccion "si cierran ahora" calculada por ILiquidacion con el marcador real. */
    @Test
    void laVistaTraeLaProyeccionConElMarcadorDelJugador() {
        Escenario e = nuevo();
        long id = e.iniciar(ConfiguracionReglas.apuntado101(), 2);
        EvaluacionMano b = e.orquestador.vistaDe(id, "sub-b").evaluacion();
        assertTrue(b.penalizacionSiCierranAhora() > 0);
        assertEquals(b.penalizacionSiCierranAhora(), b.marcadorProyectado(), "con marcador 0 suma solo la penalizacion");
        assertEquals(101 - b.marcadorProyectado(), b.faltaParaUmbral());
        assertFalse(b.quedariaEliminado());
    }
}

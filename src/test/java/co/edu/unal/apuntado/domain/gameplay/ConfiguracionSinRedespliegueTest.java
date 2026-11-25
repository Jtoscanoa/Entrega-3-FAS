package co.edu.unal.apuntado.domain.gameplay;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.Escenario.MazoFalso;
import co.edu.unal.apuntado.domain.lobby.LobbyPartyComponent;
import co.edu.unal.apuntado.domain.lobby.OpcionesPartida;
import co.edu.unal.apuntado.domain.rules.GameConfigurationComponent;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import java.util.List;
import java.util.random.RandomGenerator;
import org.junit.jupiter.api.Test;

/**
 * FF-12 (E1 Configurability): el umbral de eliminacion y los comodines son datos que elige el anfitrion al iniciar la
 * sala (OpcionesPartida), no codigo. Con las MISMAS clases compiladas, una mesa a 150 con comodines se comporta
 * distinto de la mesa predeterminada (101, sin comodines): no hace falta recompilar ni redesplegar.
 */
class ConfiguracionSinRedespliegueTest {

    /** Escalera 5C-6C-comodin, terna de 8, escalera J-Q-K de treboles, 4T de sobrante y AD de descarte. */
    private static final String MANO_CON_COMODIN = "5C 6C * 8D 8T 8P JC QC KC 4T AD";
    /** Diez cartas sin ninguna combinacion: 66 puntos sueltos. */
    private static final String MANO_DE_66 = "AC 3D 5T 8P JC KD 2P 6C 9C 3T";

    private static OpcionesPartida opciones(Boolean comodines, Integer umbral) {
        return new OpcionesPartida("APUNTADO_101", comodines, null, null, null, umbral, null);
    }

    /** Sala de Ana (sub-a) y Beto (sub-b) creada e iniciada por el lobby real, como desde la SPA. */
    private static long iniciarPorLaSala(Escenario e, OpcionesPartida o) {
        LobbyPartyComponent lobby = new LobbyPartyComponent(e.orquestador, new GameConfigurationComponent(),
                RandomGenerator.getDefault());
        String codigo = lobby.crearSala("sub-a", "Ana");
        lobby.unirse(codigo, "sub-b", "Beto");
        return lobby.iniciar(codigo, "sub-a", o);
    }

    private static <T> T ultimo(List<T> lista) {
        return lista.get(lista.size() - 1);
    }

    /** El abridor recibe la mano ganadora del mazo de prueba y cierra en su primer turno descartando AD. */
    private static ResultadoValidacion cierraElAbridor(Escenario e, long id) {
        String abridor = ultimo(e.eventosDe(EventoDominio.RondaIniciada.class)).abridor();
        int turno = ultimo(e.eventosDe(EventoDominio.TurnoAsignado.class)).numeroTurno();
        return e.orquestador.cerrar(id, abridor, "AD", turno);
    }

    @Test
    void conComodinesActivadosEnLaSalaLaManoConComodinCierra() {
        Escenario e = new Escenario(new MazoFalso(MANO_CON_COMODIN, Escenario.MANO_RIVAL));
        long id = iniciarPorLaSala(e, opciones(true, 150));

        assertEquals(150, e.orquestador.vistaDe(id, "sub-a").umbral());
        assertTrue(cierraElAbridor(e, id).valido());
        assertEquals(4, ultimo(e.eventosDe(EventoDominio.RondaLiquidada.class)).marcador().get("sub-a"));
    }

    @Test
    void conLaSalaPredeterminadaLaMismaManoSeRechaza() {
        Escenario e = new Escenario(new MazoFalso(MANO_CON_COMODIN, Escenario.MANO_RIVAL));
        long id = iniciarPorLaSala(e, opciones(null, null));

        assertEquals(101, e.orquestador.vistaDe(id, "sub-a").umbral());
        assertFalse(cierraElAbridor(e, id).valido(), "sin comodines, 5C 6C * no es combinacion");
        assertEquals(1, e.eventosDe(EventoDominio.CierreRechazado.class).size());
    }

    @Test
    void conUmbral150UnJugadorCon136PuntosSigueEnLaMesa() {
        Escenario e = new Escenario(new MazoFalso(Escenario.MANO_APUNTADA_CON_RESIDUO, MANO_DE_66));
        long id = iniciarPorLaSala(e, opciones(null, 150));

        for (int ronda = 0; ronda < 3; ronda++) {
            assertTrue(cierraElAbridor(e, id).valido());
        }

        EventoDominio.RondaLiquidada tercera = ultimo(e.eventosDe(EventoDominio.RondaLiquidada.class));
        assertEquals(136, tercera.marcador().get("sub-b"));
        assertTrue(tercera.eliminados().isEmpty());
        assertTrue(e.eventosDe(EventoDominio.PartidaFinalizada.class).isEmpty());
        assertEquals(4, ultimo(e.eventosDe(EventoDominio.RondaIniciada.class)).numeroRonda());
    }

    @Test
    void conElUmbralPredeterminadoLos136PuntosEliminan() {
        Escenario e = new Escenario(new MazoFalso(Escenario.MANO_APUNTADA_CON_RESIDUO, MANO_DE_66));
        long id = iniciarPorLaSala(e, opciones(null, null));

        for (int ronda = 0; ronda < 3; ronda++) {
            assertTrue(cierraElAbridor(e, id).valido());
        }

        assertTrue(ultimo(e.eventosDe(EventoDominio.RondaLiquidada.class)).eliminados().contains("sub-b"));
        EventoDominio.PartidaFinalizada fin = e.eventosDe(EventoDominio.PartidaFinalizada.class).get(0);
        assertEquals("sub-a", fin.ganadorId());
    }
}

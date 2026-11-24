package co.edu.unal.apuntado.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import co.edu.unal.apuntado.domain.gameplay.ITurno;
import co.edu.unal.apuntado.domain.gameplay.Participante;
import co.edu.unal.apuntado.domain.gameplay.VistaPartida;
import co.edu.unal.apuntado.domain.lobby.LobbyException;
import co.edu.unal.apuntado.domain.lobby.LobbyPartyComponent;
import co.edu.unal.apuntado.domain.lobby.OpcionesPartida;
import co.edu.unal.apuntado.domain.rules.GameConfigurationComponent;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import java.util.List;
import java.util.random.RandomGenerator;
import org.junit.jupiter.api.Test;

class LobbyTest {

    private static final class TurnosFalsos implements ITurno {
        List<Participante> recibidos;

        @Override public long iniciarPartida(String codigoSala, ConfiguracionReglas cfg, List<Participante> j) {
            recibidos = j;
            return 7L;
        }
        @Override public void robar(long p, String j, boolean d, int n) { }
        @Override public void descartar(long p, String j, String c, int n) { }
        @Override public ResultadoValidacion cerrar(long p, String j, String c, int n) { return null; }
        @Override public void vencerTurno(long p, int n) { }
        @Override public VistaPartida vistaDe(long p, String j) { return null; }
        @Override public void marcarConexion(long p, String j, boolean c) { }
        @Override public void reanudarRonda(long p, String j) { }
    }

    private static final OpcionesPartida APUNTADO =
            new OpcionesPartida("APUNTADO_101", null, null, null, null, null, null);
    private final TurnosFalsos turnos = new TurnosFalsos();
    private final LobbyPartyComponent lobby = new LobbyPartyComponent(turnos, new GameConfigurationComponent(),
            RandomGenerator.getDefault());

    private static LobbyException.Motivo motivo(org.junit.jupiter.api.function.Executable x) {
        return assertThrows(LobbyException.class, x).motivo();
    }

    @Test
    void creaUneIniciaYSoloElAnfitrionPuedeIniciar() {
        String codigo = lobby.crearSala("a", "Ana");
        assertEquals(6, codigo.length());
        assertEquals(List.of("Ana", "Beto"), lobby.unirse(codigo, "b", "Beto"));
        assertEquals(List.of("Ana", "Beto"), lobby.unirse(codigo, "b", "Beto"), "unirse es idempotente");
        assertEquals(LobbyException.Motivo.NO_ES_ANFITRION,
                motivo(() -> lobby.iniciar(codigo, "b", APUNTADO)));
        assertEquals(7L, lobby.iniciar(codigo, "a", APUNTADO));
        assertEquals("a", turnos.recibidos.get(0).sub());
        assertEquals(LobbyException.Motivo.SALA_EN_JUEGO, motivo(() -> lobby.unirse(codigo, "c", "Caro")));
    }

    @Test
    void rechazaSalaInexistenteLlenaEInsuficiente() {
        assertEquals(LobbyException.Motivo.SALA_INEXISTENTE, motivo(() -> lobby.unirse("NOPE00", "a", "Ana")));
        String codigo = lobby.crearSala("a", "Ana");
        assertEquals(LobbyException.Motivo.JUGADORES_INSUFICIENTES,
                motivo(() -> lobby.iniciar(codigo, "a", APUNTADO)));
        for (int i = 1; i < 6; i++) {
            lobby.unirse(codigo, "j" + i, "J" + i);
        }
        assertEquals(LobbyException.Motivo.SALA_LLENA, motivo(() -> lobby.unirse(codigo, "x", "X")));
    }
}

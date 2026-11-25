package co.edu.unal.apuntado.infrastructure.realtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.ITurno;
import co.edu.unal.apuntado.domain.gameplay.Participante;
import co.edu.unal.apuntado.domain.gameplay.VistaPartida;
import co.edu.unal.apuntado.domain.lobby.LobbyPartyComponent;
import co.edu.unal.apuntado.domain.rules.GameConfigurationComponent;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import co.edu.unal.apuntado.infrastructure.realtime.LobbyController.SolicitudSala;
import co.edu.unal.apuntado.infrastructure.realtime.LobbyController.VistaSala;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

/** Avatares propios en sala (ADR-11): validacion del catalogo y compatibilidad con llamadas sin cuerpo. */
class LobbyAvataresTest {

    private static final ITurno TURNOS_VACIO = new ITurno() {
        @Override public long iniciarPartida(String c, ConfiguracionReglas cfg, List<Participante> j) { return 1L; }
        @Override public void robar(long p, String j, boolean d, int n) { }
        @Override public void descartar(long p, String j, String c, int n) { }
        @Override public ResultadoValidacion cerrar(long p, String j, String c, int n) { return null; }
        @Override public void vencerTurno(long p, int n) { }
        @Override public VistaPartida vistaDe(long p, String j) { return null; }
        @Override public void marcarConexion(long p, String j, boolean c) { }
        @Override public void reanudarRonda(long p, String j) { }
        @Override public boolean participa(long p, String j) { return false; }
    };

    private static Jwt jwt(String sub, String apodo) {
        return new Jwt("t", Instant.now(), Instant.now().plusSeconds(60), Map.of("alg", "HS256"),
                Map.of("sub", sub, "preferred_username", apodo));
    }

    private final LobbyController controlador = new LobbyController(
            new LobbyPartyComponent(TURNOS_VACIO, new GameConfigurationComponent(), new Random(1L)));

    @Test
    void exponeEnLaSalaLosAvataresElegidosAlCrearYUnirse() {
        String codigo = controlador.crear(new SolicitudSala("Hincha"), jwt("sub-1", "Ana")).get("codigo");
        controlador.unirse(codigo, new SolicitudSala("metro"), jwt("sub-2", "Beto"));

        VistaSala vista = controlador.estado(codigo);
        assertEquals(Map.of("sub-1", "hincha", "sub-2", "metro"), vista.avatares());

        for (String avatar : List.of("hincha", "perro", "mototaxi", "panadero", "metro", "papa")) {
            String sala = controlador.crear(new SolicitudSala(avatar), jwt("sub-" + avatar, "Ana")).get("codigo");
            assertEquals(avatar, controlador.estado(sala).avatares().get("sub-" + avatar));
        }
    }

    @Test
    void admiteLlamadasSinCuerpoYSinAvatar() {
        String codigo = controlador.crear(null, jwt("sub-1", "Ana")).get("codigo");
        controlador.unirse(codigo, new SolicitudSala(" "), jwt("sub-2", "Beto"));

        VistaSala vista = controlador.estado(codigo);
        assertEquals(2, vista.jugadores().size());
        assertTrue(vista.avatares().isEmpty());
    }

    @Test
    void rechazaAvataresFueraDelCatalogo() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> controlador.crear(new SolicitudSala("don-armando"), jwt("sub-1", "Ana")));
        assertEquals("AVATAR_INVALIDO", e.getMessage());
    }
}

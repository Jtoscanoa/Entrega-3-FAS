package co.edu.unal.apuntado.infrastructure.realtime;

import co.edu.unal.apuntado.domain.lobby.EstadoSala;
import co.edu.unal.apuntado.domain.lobby.ILobby;
import co.edu.unal.apuntado.domain.lobby.OpcionesPartida;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Adaptador REST de salas (RF01). Sin reglas ni modelo de reglas (FF-06): solo traduce HTTP a ILobby. */
@RestController
@RequestMapping("/api/salas")
public class LobbyController {

    private final ILobby lobby;

    public LobbyController(ILobby lobby) {
        this.lobby = lobby;
    }

    @PostMapping
    public Map<String, String> crear(@AuthenticationPrincipal Jwt jwt) {
        return Map.of("codigo", lobby.crearSala(jwt.getSubject(), alias(jwt)));
    }

    @PostMapping("/{codigo}/unirse")
    public Map<String, List<String>> unirse(@PathVariable String codigo, @AuthenticationPrincipal Jwt jwt) {
        return Map.of("jugadores", lobby.unirse(codigo, jwt.getSubject(), alias(jwt)));
    }

    @PostMapping("/{codigo}/iniciar")
    public Map<String, Long> iniciar(@PathVariable String codigo, @RequestBody OpcionesPartida opciones,
                                     @AuthenticationPrincipal Jwt jwt) {
        return Map.of("partidaId", lobby.iniciar(codigo, jwt.getSubject(), opciones));
    }

    @GetMapping("/{codigo}")
    public EstadoSala estado(@PathVariable String codigo) {
        return lobby.estado(codigo);
    }

    private static String alias(Jwt jwt) {
        String alias = jwt.getClaimAsString("preferred_username");
        return alias == null ? jwt.getSubject() : alias;
    }
}

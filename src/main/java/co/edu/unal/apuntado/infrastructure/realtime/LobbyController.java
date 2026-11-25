package co.edu.unal.apuntado.infrastructure.realtime;

import co.edu.unal.apuntado.domain.gameplay.Participante;
import co.edu.unal.apuntado.domain.lobby.EstadoSala;
import co.edu.unal.apuntado.domain.lobby.ILobby;
import co.edu.unal.apuntado.domain.lobby.OpcionesPartida;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
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

    static final Set<String> AVATARES = Set.of("hincha", "perro", "mototaxi", "panadero", "metro", "papa");

    public record SolicitudSala(String avatar) { }

    public record VistaSala(String codigo, String anfitrion, List<Participante> jugadores, Long partidaId,
                            Map<String, String> avatares) { }

    private final ILobby lobby;
    private final Map<String, String> avatares = new ConcurrentHashMap<>();

    public LobbyController(ILobby lobby) {
        this.lobby = lobby;
    }

    @PostMapping
    public Map<String, String> crear(@RequestBody(required = false) SolicitudSala solicitud,
                                     @AuthenticationPrincipal Jwt jwt) {
        guardarAvatar(jwt.getSubject(), solicitud);
        return Map.of("codigo", lobby.crearSala(jwt.getSubject(), alias(jwt)));
    }

    @PostMapping("/{codigo}/unirse")
    public Map<String, List<String>> unirse(@PathVariable String codigo,
                                            @RequestBody(required = false) SolicitudSala solicitud,
                                            @AuthenticationPrincipal Jwt jwt) {
        guardarAvatar(jwt.getSubject(), solicitud);
        return Map.of("jugadores", lobby.unirse(codigo, jwt.getSubject(), alias(jwt)));
    }

    @PostMapping("/{codigo}/iniciar")
    public Map<String, Long> iniciar(@PathVariable String codigo, @RequestBody OpcionesPartida opciones,
                                     @AuthenticationPrincipal Jwt jwt) {
        return Map.of("partidaId", lobby.iniciar(codigo, jwt.getSubject(), opciones));
    }

    @GetMapping("/{codigo}")
    public VistaSala estado(@PathVariable String codigo) {
        EstadoSala sala = lobby.estado(codigo);
        Map<String, String> elegidos = new LinkedHashMap<>();
        for (Participante j : sala.jugadores()) {
            String elegido = avatares.get(j.sub());
            if (elegido != null) {
                elegidos.put(j.sub(), elegido);
            }
        }
        return new VistaSala(sala.codigo(), sala.anfitrion(), sala.jugadores(), sala.partidaId(),
                Map.copyOf(elegidos));
    }

    private void guardarAvatar(String sub, SolicitudSala solicitud) {
        if (solicitud == null || solicitud.avatar() == null || solicitud.avatar().isBlank()) {
            return;
        }
        String limpio = solicitud.avatar().strip().toLowerCase(Locale.ROOT);
        if (!AVATARES.contains(limpio)) {
            throw new IllegalArgumentException("AVATAR_INVALIDO");
        }
        avatares.put(sub, limpio);
    }

    private static String alias(Jwt jwt) {
        String alias = jwt.getClaimAsString("preferred_username");
        return alias == null ? jwt.getSubject() : alias;
    }
}

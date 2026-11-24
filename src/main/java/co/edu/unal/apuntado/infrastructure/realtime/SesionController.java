package co.edu.unal.apuntado.infrastructure.realtime;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** ADR-07b: entrega un token de invitado (JWT HS256, 12 h) a partir de un apodo. Sin reglas ni persistencia. */
@RestController
@RequestMapping("/api/sesion")
public class SesionController {

    private static final Duration VIGENCIA = Duration.ofHours(12);
    private static final int APODO_MAXIMO = 20;
    private final JwtEncoder codificador;
    private final Clock reloj;

    public record Solicitud(String apodo) { }

    public record Sesion(String token, String sub, String apodo, Instant venceEn) { }

    public SesionController(JwtEncoder codificador, Clock reloj) {
        this.codificador = codificador;
        this.reloj = reloj;
    }

    @PostMapping
    public Sesion abrir(@RequestBody Solicitud solicitud) {
        String apodo = validarApodo(solicitud == null ? null : solicitud.apodo());
        String sub = UUID.randomUUID().toString();
        Instant ahora = reloj.instant();
        Instant vence = ahora.plus(VIGENCIA);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("apuntado")
                .subject(sub)
                .issuedAt(ahora)
                .expiresAt(vence)
                .claim("preferred_username", apodo)
                .build();
        JwsHeader cabecera = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = codificador.encode(JwtEncoderParameters.from(cabecera, claims)).getTokenValue();
        return new Sesion(token, sub, apodo, vence);
    }

    static String validarApodo(String apodo) {
        String limpio = apodo == null ? "" : apodo.strip();
        if (limpio.isEmpty() || limpio.length() > APODO_MAXIMO) {
            throw new IllegalArgumentException("APODO_INVALIDO");
        }
        return limpio;
    }
}

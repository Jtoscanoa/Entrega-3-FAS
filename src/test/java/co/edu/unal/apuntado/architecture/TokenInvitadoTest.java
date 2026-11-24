package co.edu.unal.apuntado.architecture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import co.edu.unal.apuntado.infrastructure.realtime.AutenticacionStompInterceptor;
import co.edu.unal.apuntado.infrastructure.realtime.SesionController;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/** FF-18 con tokens reales (ADR-07b): firma propia valida, firma ajena y token vencido rechazados en el CONNECT. */
class TokenInvitadoTest {

    private static SecretKey clave(String texto) {
        return new SecretKeySpec(texto.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    private static final SecretKey PROPIA = clave("clave-de-prueba-propia-de-32-bytes-o-mas");
    private static final SecretKey AJENA = clave("clave-de-prueba-ajena-de-32-bytes-o-mass");

    private static SesionController emisor(SecretKey clave, Clock reloj) {
        return new SesionController(new NimbusJwtEncoder(new ImmutableSecret<>(clave)), reloj);
    }

    private static final JwtDecoder DECODIFICADOR =
            NimbusJwtDecoder.withSecretKey(PROPIA).macAlgorithm(MacAlgorithm.HS256).build();

    private static Message<byte[]> connect(String token) {
        StompHeaderAccessor acc = StompHeaderAccessor.create(StompCommand.CONNECT);
        acc.addNativeHeader("Authorization", "Bearer " + token);
        acc.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], acc.getMessageHeaders());
    }

    private final AutenticacionStompInterceptor interceptor = new AutenticacionStompInterceptor(DECODIFICADOR);
    private final MessageChannel canal = Mockito.mock(MessageChannel.class);

    @Test
    void tokenPropioSeAceptaYFijaElSub() {
        SesionController.Sesion s = emisor(PROPIA, Clock.systemUTC()).abrir(new SesionController.Solicitud("Ana"));
        Message<?> salida = interceptor.preSend(connect(s.token()), canal);
        assertEquals(s.sub(), StompHeaderAccessor.wrap(salida).getUser().getName());
        assertEquals("Ana", s.apodo());
    }

    @Test
    void tokenFirmadoConOtraClaveSeRechaza() {
        SesionController.Sesion s = emisor(AJENA, Clock.systemUTC()).abrir(new SesionController.Solicitud("Ana"));
        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(connect(s.token()), canal));
    }

    @Test
    void tokenVencidoSeRechaza() {
        Clock ayer = Clock.fixed(Instant.now().minus(Duration.ofDays(1)), ZoneOffset.UTC);
        SesionController.Sesion s = emisor(PROPIA, ayer).abrir(new SesionController.Solicitud("Ana"));
        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(connect(s.token()), canal));
    }

    @Test
    void apodoVacioOLargoSeRechaza() {
        SesionController emisor = emisor(PROPIA, Clock.systemUTC());
        assertThrows(IllegalArgumentException.class, () -> emisor.abrir(new SesionController.Solicitud("  ")));
        assertThrows(IllegalArgumentException.class,
                () -> emisor.abrir(new SesionController.Solicitud("x".repeat(21))));
    }
}

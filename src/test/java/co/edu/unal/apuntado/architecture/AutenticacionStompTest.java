package co.edu.unal.apuntado.architecture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import co.edu.unal.apuntado.infrastructure.realtime.AutenticacionStompInterceptor;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

/** FF-18: un CONNECT sin token o con token vencido se rechaza; uno valido fija el usuario (sub). */
class AutenticacionStompTest {

    private final JwtDecoder decodificador = mock(JwtDecoder.class);
    private final AutenticacionStompInterceptor interceptor = new AutenticacionStompInterceptor(decodificador);
    private final MessageChannel canal = mock(MessageChannel.class);

    private static Message<byte[]> connect(String autorizacion) {
        StompHeaderAccessor acc = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (autorizacion != null) {
            acc.addNativeHeader("Authorization", autorizacion);
        }
        acc.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], acc.getMessageHeaders());
    }

    @Test
    void sinTokenSeRechaza() {
        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(connect(null), canal));
        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(connect("Basic abc"), canal));
    }

    @Test
    void tokenVencidoOInvalidoSeRechaza() {
        when(decodificador.decode(anyString())).thenThrow(new BadJwtException("Jwt expired"));
        assertThrows(MessageDeliveryException.class, () -> interceptor.preSend(connect("Bearer vencido"), canal));
    }

    @Test
    void tokenValidoFijaElUsuarioConElSubDelToken() {
        Jwt jwt = new Jwt("t", Instant.now(), Instant.now().plusSeconds(60), Map.of("alg", "RS256"),
                Map.of("sub", "usuario-1"));
        when(decodificador.decode("bueno")).thenReturn(jwt);
        Message<?> salida = interceptor.preSend(connect("Bearer bueno"), canal);
        assertEquals("usuario-1", StompHeaderAccessor.wrap(salida).getUser().getName());
    }
}

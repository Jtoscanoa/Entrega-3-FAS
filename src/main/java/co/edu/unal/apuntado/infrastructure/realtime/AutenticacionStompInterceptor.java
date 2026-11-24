package co.edu.unal.apuntado.infrastructure.realtime;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/** FF-18 / ADR-07: un CONNECT sin token, o con token invalido o vencido, se rechaza. */
public class AutenticacionStompInterceptor implements ChannelInterceptor {

    private static final String PREFIJO = "Bearer ";
    private final JwtDecoder decodificador;

    public AutenticacionStompInterceptor(JwtDecoder decodificador) {
        this.decodificador = decodificador;
    }

    @Override
    public Message<?> preSend(Message<?> mensaje, MessageChannel canal) {
        StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(mensaje, StompHeaderAccessor.class);
        if (acc != null && StompCommand.CONNECT.equals(acc.getCommand())) {
            acc.setUser(autenticar(acc.getFirstNativeHeader("Authorization")));
        }
        return mensaje;
    }

    private Authentication autenticar(String cabecera) {
        if (cabecera == null || !cabecera.startsWith(PREFIJO)) {
            throw new MessageDeliveryException("Token ausente");
        }
        try {
            Jwt jwt = decodificador.decode(cabecera.substring(PREFIJO.length()));
            return new JwtAuthenticationToken(jwt);
        } catch (JwtException e) {
            throw new MessageDeliveryException("Token invalido o vencido");
        }
    }
}

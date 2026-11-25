package co.edu.unal.apuntado.infrastructure.realtime;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/** STOMP 1.2 sobre WebSocket con latidos de 10 s (ADR-06). */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final long LATIDO_MS = 10_000L;
    private final JwtDecoder decodificador;
    private final TaskScheduler latidos;
    private final String[] origenes;

    public WebSocketConfig(JwtDecoder decodificador, @Qualifier("planificadorLatidos") TaskScheduler latidos,
                           @Value("${apuntado.cors.origenes}") String[] origenes) {
        this.decodificador = decodificador;
        this.latidos = latidos;
        this.origenes = origenes;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registro) {
        registro.addEndpoint("/ws").setAllowedOriginPatterns(origenes);
        // Conserva por sesion el orden SUBSCRIBE -> SEND (p. ej. /user/queue/partida antes de reanudar, FF-15).
        registro.setPreserveReceiveOrder(true);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registro) {
        registro.setApplicationDestinationPrefixes("/app");
        registro.setUserDestinationPrefix("/user");
        registro.setPreservePublishOrder(true);
        registro.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[] {LATIDO_MS, LATIDO_MS})
                .setTaskScheduler(latidos);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registro) {
        registro.interceptors(new AutenticacionStompInterceptor(decodificador));
    }
}

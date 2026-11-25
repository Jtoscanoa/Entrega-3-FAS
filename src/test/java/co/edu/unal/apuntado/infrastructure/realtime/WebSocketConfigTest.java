package co.edu.unal.apuntado.infrastructure.realtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.broker.OrderedMessageChannelDecorator;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.config.SimpleBrokerRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ExecutorSubscribableChannel;
import org.springframework.messaging.support.ImmutableMessageChannelInterceptor;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.WebMvcStompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;
import org.springframework.web.socket.messaging.StompSubProtocolHandler;
import org.springframework.web.socket.messaging.SubProtocolWebSocketHandler;

/** FF-15 / ADR-06: orden por sesion STOMP tanto en salida como en entrada (SUBSCRIBE -> SEND). */
class WebSocketConfigTest {

    private static WebSocketConfig nuevaConfig() {
        return new WebSocketConfig(mock(JwtDecoder.class), mock(TaskScheduler.class),
                new String[] {"https://mesa101.duckdns.org"});
    }

    private static StompSubProtocolHandler registrarYExtraerStomp(WebSocketConfig cfg,
                                                                 SubProtocolWebSocketHandler wsHandler) {
        WebMvcStompEndpointRegistry registro = new WebMvcStompEndpointRegistry(
                wsHandler, new WebSocketTransportRegistration(), mock(TaskScheduler.class));
        cfg.registerStompEndpoints(registro);
        return wsHandler.getProtocolHandlers().stream()
                .filter(StompSubProtocolHandler.class::isInstance)
                .map(StompSubProtocolHandler.class::cast)
                .findFirst()
                .orElseThrow();
    }

    @Test
    void activaElOrdenDeEntradaYSalidaPorSesion() {
        WebSocketConfig cfg = nuevaConfig();
        SubProtocolWebSocketHandler wsHandler = new SubProtocolWebSocketHandler(
                new ExecutorSubscribableChannel(), new ExecutorSubscribableChannel());
        StompSubProtocolHandler stomp = registrarYExtraerStomp(cfg, wsHandler);
        assertTrue(stomp.isPreserveReceiveOrder());

        MessageBrokerRegistry broker = mock(MessageBrokerRegistry.class);
        SimpleBrokerRegistration simple = mock(SimpleBrokerRegistration.class);
        when(broker.enableSimpleBroker("/topic", "/queue")).thenReturn(simple);
        when(simple.setHeartbeatValue(any())).thenReturn(simple);
        when(simple.setTaskScheduler(any())).thenReturn(simple);

        cfg.configureMessageBroker(broker);
        verify(broker).setPreservePublishOrder(true);
    }

    @Test
    void serializaSubscribeAntesDeSendEnLaMismaSesion() throws InterruptedException {
        WebSocketConfig cfg = nuevaConfig();
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            ExecutorSubscribableChannel entrada = new ExecutorSubscribableChannel(pool);
            entrada.addInterceptor(new ImmutableMessageChannelInterceptor());
            SubProtocolWebSocketHandler wsHandler = new SubProtocolWebSocketHandler(
                    entrada, new ExecutorSubscribableChannel());
            StompSubProtocolHandler stomp = registrarYExtraerStomp(cfg, wsHandler);
            OrderedMessageChannelDecorator.configureInterceptor(entrada, stomp.isPreserveReceiveOrder());

            List<String> orden = new CopyOnWriteArrayList<>();
            CountDownLatch finSend = new CountDownLatch(1);
            entrada.subscribe(m -> {
                StompCommand comando = StompHeaderAccessor.wrap(m).getCommand();
                if (StompCommand.SUBSCRIBE.equals(comando)) {
                    try {
                        new CountDownLatch(1).await(60, TimeUnit.MILLISECONDS);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    orden.add("SUBSCRIBE");
                } else if (StompCommand.SEND.equals(comando)) {
                    orden.add("SEND");
                    finSend.countDown();
                }
            });

            WebSocketSession sesion = mock(WebSocketSession.class);
            when(sesion.getId()).thenReturn("s-1");
            when(sesion.isOpen()).thenReturn(true);
            when(sesion.getAttributes()).thenReturn(new ConcurrentHashMap<>());

            stomp.afterSessionStarted(sesion, entrada);
            TextMessage texto = new TextMessage(
                    "SUBSCRIBE\nid:privado\ndestination:/user/queue/partida\n\n\0"
                    + "SEND\ndestination:/app/partidas/1/reanudar\ncontent-type:application/json\n\n{}\0");
            stomp.handleMessageFromClient(sesion, texto, entrada);

            assertTrue(finSend.await(2, TimeUnit.SECONDS));
            assertEquals(List.of("SUBSCRIBE", "SEND"), orden);
        } finally {
            pool.shutdownNow();
        }
    }
}

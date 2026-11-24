package co.edu.unal.apuntado.infrastructure.realtime;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

/** Ventana deslizante en memoria: como mucho {@code maximo} usos por clave dentro de {@code ventana}. */
final class LimiteFrecuencia {

    private final int maximo;
    private final Duration ventana;
    private final Clock reloj;
    private final Map<String, Deque<Instant>> usos = new HashMap<>();

    LimiteFrecuencia(int maximo, Duration ventana, Clock reloj) {
        this.maximo = maximo;
        this.ventana = ventana;
        this.reloj = reloj;
    }

    /** Registra el uso y devuelve true si cabe en la ventana; si no cabe, no lo registra. */
    synchronized boolean permitir(String clave) {
        Instant ahora = reloj.instant();
        Deque<Instant> recientes = usos.computeIfAbsent(clave, c -> new ArrayDeque<>());
        while (!recientes.isEmpty() && !recientes.peekFirst().isAfter(ahora.minus(ventana))) {
            recientes.pollFirst();
        }
        if (recientes.size() >= maximo) {
            return false;
        }
        recientes.addLast(ahora);
        return true;
    }
}

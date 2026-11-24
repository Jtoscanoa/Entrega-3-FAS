package co.edu.unal.apuntado.infrastructure.realtime;

/** Mensajes STOMP entrantes (/app/partidas/{id}/...). Cada comando lleva el numero de turno (idempotencia). */
public final class Comandos {

    private Comandos() {
    }

    public record Robar(boolean delDescarte, int numeroTurno) { }

    public record Descartar(String carta, int numeroTurno) { }

    public record Cerrar(String carta, int numeroTurno) { }

    public record ErrorComando(String motivo) { }
}

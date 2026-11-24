package co.edu.unal.apuntado.domain.gameplay;

/** Puerto de salida de eventos; lo implementa el gateway de tiempo real (ADR-06). */
public interface IEventosPartida {
    void publicar(EventoDominio evento);
}

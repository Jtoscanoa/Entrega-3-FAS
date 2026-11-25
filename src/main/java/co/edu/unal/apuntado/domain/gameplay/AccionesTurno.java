package co.edu.unal.apuntado.domain.gameplay;

import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;

/**
 * Operaciones del orquestador sobre la partida en turno que un {@link EstadoTurno} puede invocar. Las implementa el
 * orquestador, dentro del candado de la partida, ya validados el numero de turno y el jugador.
 */
interface AccionesTurno {

    void robar(boolean delDescarte);

    void descartar(String carta);

    ResultadoValidacion cerrar(String carta);

    /** ADR-08: descarta la carta recien robada o, si no hubo robo, la ultima de la mano. */
    void descartarPorDefecto();
}

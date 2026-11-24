package co.edu.unal.apuntado.domain.lobby;

import java.util.List;

public interface ILobby {
    String crearSala(String sub, String alias);

    List<String> unirse(String codigo, String sub, String alias);

    /** Solo el anfitrion; devuelve el id de la partida iniciada. */
    long iniciar(String codigo, String sub, OpcionesPartida opciones);

    /** Estado de la sala para la sala de espera (jugadores y partida iniciada, si la hay). */
    EstadoSala estado(String codigo);
}

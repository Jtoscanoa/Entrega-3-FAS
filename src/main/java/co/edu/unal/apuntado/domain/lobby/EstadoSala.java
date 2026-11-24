package co.edu.unal.apuntado.domain.lobby;

import co.edu.unal.apuntado.domain.gameplay.Participante;
import java.util.List;

/** Lo que ve un jugador en la sala de espera; partidaId es null hasta que el anfitrion inicia. */
public record EstadoSala(String codigo, String anfitrion, List<Participante> jugadores, Long partidaId) {
}

package co.edu.unal.apuntado.domain.gameplay;

import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import java.util.List;

public interface ITurno {
    long iniciarPartida(String codigoSala, ConfiguracionReglas cfg, List<Participante> jugadores);

    void robar(long partidaId, String jugadorId, boolean delDescarte, int numeroTurno);

    void descartar(long partidaId, String jugadorId, String codigoCarta, int numeroTurno);

    ResultadoValidacion cerrar(long partidaId, String jugadorId, String codigoCarta, int numeroTurno);

    void vencerTurno(long partidaId, int numeroTurno);

    VistaPartida vistaDe(long partidaId, String jugadorId);

    /**
     * Presencia (RF17, ADR-08b): el adaptador de tiempo real avisa cuando un jugador abre su primera sesion o
     * cierra la ultima. Solo ajusta el temporizador del turno; no cambia las reglas de juego.
     */
    void marcarConexion(long partidaId, String jugadorId, boolean conectado);
}

package co.edu.unal.apuntado.domain.lobby;

public class LobbyException extends RuntimeException {

    public enum Motivo { SALA_INEXISTENTE, SALA_LLENA, SALA_EN_JUEGO, NO_ES_ANFITRION, JUGADORES_INSUFICIENTES }

    private final transient Motivo motivo;

    public LobbyException(Motivo motivo) {
        super(motivo.name());
        this.motivo = motivo;
    }

    public Motivo motivo() {
        return motivo;
    }
}

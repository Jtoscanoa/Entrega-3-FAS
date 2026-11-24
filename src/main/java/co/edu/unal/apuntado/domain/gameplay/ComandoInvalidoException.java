package co.edu.unal.apuntado.domain.gameplay;

/** Comando rechazado sin efectos sobre la partida. */
public class ComandoInvalidoException extends RuntimeException {

    private final transient MotivoComando motivo;

    public ComandoInvalidoException(MotivoComando motivo) {
        super(motivo.name());
        this.motivo = motivo;
    }

    public MotivoComando motivo() {
        return motivo;
    }
}

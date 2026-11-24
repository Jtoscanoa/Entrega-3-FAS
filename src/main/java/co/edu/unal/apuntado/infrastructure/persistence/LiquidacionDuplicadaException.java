package co.edu.unal.apuntado.infrastructure.persistence;

/** El UPDATE condicional sobre EN_CURSO afecto 0 filas: cierre concurrente o reintento. */
public class LiquidacionDuplicadaException extends RuntimeException {
    public LiquidacionDuplicadaException(long rondaId) {
        super("La ronda " + rondaId + " ya fue liquidada");
    }
}

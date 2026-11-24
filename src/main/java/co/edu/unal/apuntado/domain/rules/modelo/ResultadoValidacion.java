package co.edu.unal.apuntado.domain.rules.modelo;

/** Resultado inmutable de validar un cierre. {@code puntos} es la penalizacion de quien cierra. */
public record ResultadoValidacion(boolean valido, TipoCierre tipo, int puntos, MotivoRechazo motivo) {

    public ResultadoValidacion {
        if (valido == (motivo != null) || valido == (tipo == null)) {
            throw new IllegalArgumentException("Un resultado valido lleva tipo; uno rechazado, motivo");
        }
    }

    public static ResultadoValidacion aceptado(TipoCierre tipo, int puntos) {
        return new ResultadoValidacion(true, tipo, puntos, null);
    }

    public static ResultadoValidacion rechazado(MotivoRechazo motivo) {
        return new ResultadoValidacion(false, null, 0, motivo);
    }
}

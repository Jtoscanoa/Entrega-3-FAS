package co.edu.unal.apuntado.domain.rules.modelo;

/**
 * Resultado inmutable de validar un cierre. {@code puntos} es la penalizacion de quien cierra; {@code mensaje} es el
 * texto concreto del rechazo para el jugador (RF16), armado por el plug-in de la regla.
 */
public record ResultadoValidacion(boolean valido, TipoCierre tipo, int puntos, MotivoRechazo motivo, String mensaje) {

    public ResultadoValidacion {
        if (valido == (motivo != null) || valido == (tipo == null)) {
            throw new IllegalArgumentException("Un resultado valido lleva tipo; uno rechazado, motivo");
        }
        if (motivo != null && mensaje == null) {
            mensaje = motivo.mensaje();
        }
    }

    public ResultadoValidacion(boolean valido, TipoCierre tipo, int puntos, MotivoRechazo motivo) {
        this(valido, tipo, puntos, motivo, null);
    }

    public static ResultadoValidacion aceptado(TipoCierre tipo, int puntos) {
        return new ResultadoValidacion(true, tipo, puntos, null, null);
    }

    public static ResultadoValidacion rechazado(MotivoRechazo motivo, Object... datos) {
        return new ResultadoValidacion(false, null, 0, motivo, motivo.mensaje(datos));
    }
}

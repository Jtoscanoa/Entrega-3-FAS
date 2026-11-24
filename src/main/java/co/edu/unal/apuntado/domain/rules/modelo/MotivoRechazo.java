package co.edu.unal.apuntado.domain.rules.modelo;

/** Motivos de rechazo de un cierre; el texto se muestra al jugador (RF16). */
public enum MotivoRechazo {
    MODALIDAD_DESCONOCIDA("La modalidad de la sala no existe."),
    NUMERO_DE_CARTAS("Para cerrar se necesitan exactamente 10 cartas tras descartar."),
    ESTRUCTURA_INVALIDA("Las cartas no forman la estructura que exige la modalidad."),
    RESIDUO_EXCEDIDO("Las cartas sueltas suman mas puntos de los permitidos para cerrar.");

    private final String mensaje;

    MotivoRechazo(String mensaje) {
        this.mensaje = mensaje;
    }

    public String mensaje() {
        return mensaje;
    }
}

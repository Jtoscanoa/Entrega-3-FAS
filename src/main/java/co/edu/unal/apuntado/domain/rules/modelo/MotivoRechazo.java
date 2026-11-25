package co.edu.unal.apuntado.domain.rules.modelo;

import java.util.Locale;

/**
 * Motivos de rechazo de un cierre; el texto se muestra al jugador (RF16). Los motivos de estructura llevan la cuenta
 * concreta de lo que falta (sesion S1: un texto generico no orientaba al jugador), y la arma el plug-in de la regla.
 */
public enum MotivoRechazo {
    MODALIDAD_DESCONOCIDA("La modalidad de la sala no existe."),
    NUMERO_DE_CARTAS("Para cerrar se necesitan exactamente 10 cartas tras descartar."),
    /** Generico, para variantes que no detallan el motivo. */
    ESTRUCTURA_INVALIDA("Las cartas no forman la estructura que exige la modalidad."),
    /** Argumentos: ternas formadas, ternas requeridas. */
    FALTAN_TERNAS("Tienes %d de %d ternas."),
    /** Argumentos: puntos sobrantes, tope exclusivo (residuo maximo + 1). */
    RESIDUO_EXCEDIDO("Sobrante de %d puntos; debe ser menor a %d."),
    /** Argumentos: ternas formadas sin la cuarta, ternas requeridas. */
    FALTA_CUARTA("Falta la cuarta (tienes %d de %d ternas)."),
    SOBRAN_CARTAS("Sobran cartas: la cuarta y las 2 ternas deben usar todas las cartas.");

    private final String plantilla;

    MotivoRechazo(String plantilla) {
        this.plantilla = plantilla;
    }

    /** Texto con los datos del caso (si la plantilla no los usa, se ignoran). */
    public String mensaje(Object... datos) {
        return String.format(Locale.ROOT, plantilla, datos);
    }
}

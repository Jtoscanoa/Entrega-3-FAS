package co.edu.unal.apuntado.domain.rules.modelo;

import java.util.Objects;

/** Carta inmutable. El comodin es la carta sin valor ni pinta ({@link #COMODIN}). */
public record Carta(Valor valor, Pinta pinta) {

    public static final Carta COMODIN = new Carta(null, null);
    private static final String CODIGO_COMODIN = "*";

    public Carta {
        if ((valor == null) != (pinta == null)) {
            throw new IllegalArgumentException("Una carta tiene valor y pinta, o ninguno (comodin)");
        }
    }

    public boolean esComodin() {
        return valor == null;
    }

    /** Codigo corto: "7C", "10T", "KP" o "*". */
    public String codigo() {
        return esComodin() ? CODIGO_COMODIN : valor.simbolo() + pinta.codigo();
    }

    public static Carta deCodigo(String codigo) {
        Objects.requireNonNull(codigo, "codigo");
        if (CODIGO_COMODIN.equals(codigo)) {
            return COMODIN;
        }
        if (codigo.length() < 2 || codigo.length() > 3) {
            throw new IllegalArgumentException("Codigo de carta invalido: " + codigo);
        }
        int corte = codigo.length() - 1;
        return new Carta(Valor.deSimbolo(codigo.substring(0, corte)), Pinta.deCodigo(codigo.charAt(corte)));
    }
}

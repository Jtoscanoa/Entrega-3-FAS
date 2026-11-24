package co.edu.unal.apuntado.domain.rules.modelo;

/** Valor facial. El rango del As es 1; en escaleras tambien puede valer 14. */
public enum Valor {
    AS(1, "A"), DOS(2, "2"), TRES(3, "3"), CUATRO(4, "4"), CINCO(5, "5"), SEIS(6, "6"),
    SIETE(7, "7"), OCHO(8, "8"), NUEVE(9, "9"), DIEZ(10, "10"), J(11, "J"), Q(12, "Q"), K(13, "K");

    private final int rango;
    private final String simbolo;

    Valor(int rango, String simbolo) {
        this.rango = rango;
        this.simbolo = simbolo;
    }

    public int rango() {
        return rango;
    }

    public String simbolo() {
        return simbolo;
    }

    public static Valor deSimbolo(String simbolo) {
        for (Valor v : values()) {
            if (v.simbolo.equals(simbolo)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Valor desconocido: " + simbolo);
    }
}

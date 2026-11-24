package co.edu.unal.apuntado.domain.rules.modelo;

/** Pinta de una carta de la baraja francesa. */
public enum Pinta {
    CORAZONES('C'), DIAMANTES('D'), TREBOLES('T'), PICAS('P');

    private final char codigo;

    Pinta(char codigo) {
        this.codigo = codigo;
    }

    public char codigo() {
        return codigo;
    }

    public static Pinta deCodigo(char codigo) {
        for (Pinta p : values()) {
            if (p.codigo == codigo) {
                return p;
            }
        }
        throw new IllegalArgumentException("Pinta desconocida: " + codigo);
    }
}

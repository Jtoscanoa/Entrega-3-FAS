package co.edu.unal.apuntado.domain.gameplay.mazo;

public class MazoAgotadoException extends IllegalStateException {
    public MazoAgotadoException(String clave) {
        super("Sin cartas para reponer el mazo de " + clave);
    }
}

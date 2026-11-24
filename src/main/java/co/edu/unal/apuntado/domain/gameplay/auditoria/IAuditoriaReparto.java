package co.edu.unal.apuntado.domain.gameplay.auditoria;

public interface IAuditoriaReparto {

    /** Compromete el orden: devuelve la huella SHA-256(orden | sal); la sal queda en el servidor. */
    String sellar(String clave, OrdenMazo orden);

    /** Revela orden y sal del sello inicial de la ronda. */
    RevelacionReparto revelar(String clave);

    boolean verificar(RevelacionReparto revelacion);

    /** Olvida los sellos de una ronda terminada (incluidas las reposiciones). */
    void olvidar(String clave);
}

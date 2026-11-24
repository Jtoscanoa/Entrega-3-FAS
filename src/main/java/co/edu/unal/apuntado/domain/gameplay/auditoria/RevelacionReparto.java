package co.edu.unal.apuntado.domain.gameplay.auditoria;

/** Datos publicados al liquidar: permiten recalcular SHA-256(orden | sal) y compararlo con la huella. */
public record RevelacionReparto(String clave, String huella, String sal, String orden) {
}

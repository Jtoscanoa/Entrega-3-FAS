package co.edu.unal.apuntado.domain.gameplay.auditoria;

import java.util.List;

/** Orden secreto del mazo. Solo DeckManagement y DealAudit pueden conocerlo (FF-05). */
public record OrdenMazo(List<String> codigos) {

    public OrdenMazo {
        codigos = List.copyOf(codigos);
    }

    public String serializar() {
        return String.join(",", codigos);
    }
}

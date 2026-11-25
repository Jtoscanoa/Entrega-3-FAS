package co.edu.unal.apuntado.architecture.muestras.inocente;

import java.util.Collections;
import java.util.List;

/** Muestra para FF01cReglaTest: usa metodos llamados puntos() y max() de duenos que FF-01c no restringe. */
public final class TurnOrchestratorComponent {

    public record Aviso(int puntos) { }

    public int ultimo(Aviso aviso, List<Integer> turnos) {
        return aviso.puntos() + Collections.max(turnos);
    }
}

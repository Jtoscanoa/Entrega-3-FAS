package co.edu.unal.apuntado.architecture.muestras.infractor;

import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;

/** Muestra para FF01cReglaTest: un orquestador que suma puntos por su cuenta (lo que FF-01c prohibe). */
public final class TurnOrchestratorComponent {

    public int penalizacion(Agrupacion sueltas, int marcador) {
        return Math.max(0, marcador + sueltas.puntos());
    }
}

package co.edu.unal.apuntado.domain.rules;

import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.EvaluacionMano;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoLiquidacion;
import co.edu.unal.apuntado.domain.rules.modelo.SolicitudLiquidacion;

public interface ILiquidacion {
    ResultadoLiquidacion liquidar(SolicitudLiquidacion solicitud);

    /**
     * Proyeccion para la mano propia (sesion S1, E3-18f): marcador si otro cerrara ya, cuanto falta para el umbral y
     * si quedaria eliminado, con la misma regla de eliminacion que {@link #liquidar}. No liquida nada.
     */
    EvaluacionMano proyectar(EvaluacionMano evaluacion, int marcadorActual, ConfiguracionReglas cfg);
}

package co.edu.unal.apuntado.domain.rules;

import co.edu.unal.apuntado.domain.rules.modelo.ResultadoLiquidacion;
import co.edu.unal.apuntado.domain.rules.modelo.SolicitudLiquidacion;

public interface ILiquidacion {
    ResultadoLiquidacion liquidar(SolicitudLiquidacion solicitud);
}

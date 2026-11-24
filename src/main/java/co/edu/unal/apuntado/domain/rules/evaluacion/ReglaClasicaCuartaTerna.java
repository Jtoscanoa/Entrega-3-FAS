package co.edu.unal.apuntado.domain.rules.evaluacion;

import co.edu.unal.apuntado.domain.rules.ReglaJuego;
import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.MotivoRechazo;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import co.edu.unal.apuntado.domain.rules.modelo.TipoCierre;
import java.util.List;

/** Clasica 4-3-3: una cuarta, dos ternas y un descarte; sin sobrantes; cierre = -10. */
public final class ReglaClasicaCuartaTerna implements ReglaJuego {

    private static final int PUNTOS_CIERRE = -10;

    @Override
    public String modalidad() {
        return ConfiguracionReglas.CLASICA_433;
    }

    @Override
    public Agrupacion cartasSueltas(List<Carta> mano, ConfiguracionReglas cfg) {
        return new BuscadorCombinaciones(mano, cfg.comodinesHabilitados()).minimizarSueltas();
    }

    @Override
    public ResultadoValidacion evaluarCierre(List<Carta> mano, ConfiguracionReglas cfg) {
        BuscadorCombinaciones buscador = new BuscadorCombinaciones(mano, cfg.comodinesHabilitados());
        return buscador.particionExacta(4, 3, 3).isPresent()
                ? ResultadoValidacion.aceptado(TipoCierre.CLASICO_433, PUNTOS_CIERRE)
                : ResultadoValidacion.rechazado(MotivoRechazo.ESTRUCTURA_INVALIDA);
    }
}

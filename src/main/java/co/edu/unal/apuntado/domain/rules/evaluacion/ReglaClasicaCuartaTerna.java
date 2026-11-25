package co.edu.unal.apuntado.domain.rules.evaluacion;

import co.edu.unal.apuntado.domain.rules.ReglaJuego;
import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.EvaluacionMano;
import co.edu.unal.apuntado.domain.rules.modelo.MotivoRechazo;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import co.edu.unal.apuntado.domain.rules.modelo.TipoCierre;
import java.util.List;
import java.util.Optional;

/** Clasica 4-3-3: una cuarta, dos ternas y un descarte; sin sobrantes; cierre = -10. */
public final class ReglaClasicaCuartaTerna implements ReglaJuego {

    private static final int PUNTOS_CIERRE = -10;
    private static final int TERNAS_REQUERIDAS = 2;

    @Override
    public String modalidad() {
        return ConfiguracionReglas.CLASICA_433;
    }

    @Override
    public Agrupacion cartasSueltas(List<Carta> mano, ConfiguracionReglas cfg) {
        return new BuscadorCombinaciones(mano, cfg.comodinesHabilitados()).minimizarSueltas();
    }

    /**
     * Rechazos (RF16): sin ninguna cuarta, "Falta la cuarta"; con cuarta, "Tienes N de 2 ternas"; con la cuarta y las
     * 2 ternas sin cubrir la mano, "Sobran cartas".
     */
    @Override
    public ResultadoValidacion evaluarCierre(List<Carta> mano, ConfiguracionReglas cfg) {
        BuscadorCombinaciones buscador = new BuscadorCombinaciones(mano, cfg.comodinesHabilitados());
        if (buscador.particionExacta(4, 3, 3).isPresent()) {
            return ResultadoValidacion.aceptado(TipoCierre.CLASICO_433, PUNTOS_CIERRE);
        }
        Optional<BuscadorCombinaciones.Avance> conCuarta = buscador.avance(true);
        if (conCuarta.isEmpty()) {
            int ternas = Math.min(buscador.avance(false).orElseThrow().ternas(), TERNAS_REQUERIDAS);
            return ResultadoValidacion.rechazado(MotivoRechazo.FALTA_CUARTA, ternas, TERNAS_REQUERIDAS);
        }
        int ternas = conCuarta.get().ternas();
        return ternas < TERNAS_REQUERIDAS
                ? ResultadoValidacion.rechazado(MotivoRechazo.FALTAN_TERNAS, ternas, TERNAS_REQUERIDAS)
                : ResultadoValidacion.rechazado(MotivoRechazo.SOBRAN_CARTAS);
    }

    @Override
    public EvaluacionMano evaluarAvance(List<Carta> mano, ConfiguracionReglas cfg) {
        BuscadorCombinaciones buscador = new BuscadorCombinaciones(mano, cfg.comodinesHabilitados());
        Optional<BuscadorCombinaciones.Avance> conCuarta = buscador.avance(true);
        BuscadorCombinaciones.Avance a = conCuarta.orElseGet(() -> buscador.avance(false).orElseThrow());
        return new EvaluacionMano(a.grupos(), conCuarta.isPresent() ? 1 : 0, 1,
                Math.min(a.ternas(), TERNAS_REQUERIDAS), TERNAS_REQUERIDAS, a.sobrante(), false, null);
    }
}

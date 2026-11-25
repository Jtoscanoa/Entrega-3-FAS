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

/** Apuntado a 101. Orden del mas al menos favorable: a pintas (-25), completo (-10), 3 ternas + residuo. */
public final class ReglaApuntado101 implements ReglaJuego {

    private static final int PUNTOS_A_PINTAS = -25;
    private static final int PUNTOS_COMPLETO = -10;
    private static final int TERNAS_REQUERIDAS = 3;

    @Override
    public String modalidad() {
        return ConfiguracionReglas.APUNTADO_101;
    }

    @Override
    public Agrupacion cartasSueltas(List<Carta> mano, ConfiguracionReglas cfg) {
        return new BuscadorCombinaciones(mano, cfg.comodinesHabilitados()).minimizarSueltas();
    }

    /** Rechazos (RF16): "Tienes N de 3 ternas" o "Sobrante de X puntos; debe ser menor a residuoMaximo + 1". */
    @Override
    public ResultadoValidacion evaluarCierre(List<Carta> mano, ConfiguracionReglas cfg) {
        if (cfg.cierreAPintas() && aPintas(mano)) {
            return ResultadoValidacion.aceptado(TipoCierre.A_PINTAS, PUNTOS_A_PINTAS);
        }
        BuscadorCombinaciones buscador = new BuscadorCombinaciones(mano, cfg.comodinesHabilitados());
        if (buscador.particionLibre().isPresent()) {
            return ResultadoValidacion.aceptado(TipoCierre.COMPLETO, PUNTOS_COMPLETO);
        }
        return buscador.mejorParticionConSobrantes(TERNAS_REQUERIDAS)
                .map(p -> aplicarResiduo(p.puntos(), cfg))
                .orElseGet(() -> ResultadoValidacion.rechazado(MotivoRechazo.FALTAN_TERNAS,
                        buscador.avance(false).orElseThrow().ternas(), TERNAS_REQUERIDAS));
    }

    /** Ternas y sobrante de la mano; si ya forma un cierre completo, sus combinaciones y sobrante 0. */
    @Override
    public EvaluacionMano evaluarAvance(List<Carta> mano, ConfiguracionReglas cfg) {
        BuscadorCombinaciones buscador = new BuscadorCombinaciones(mano, cfg.comodinesHabilitados());
        Optional<List<List<Integer>>> completo = buscador.gruposDeParticionLibre();
        if (completo.isPresent()) {
            return new EvaluacionMano(completo.get(), 0, 0, TERNAS_REQUERIDAS, TERNAS_REQUERIDAS, 0, false, null);
        }
        BuscadorCombinaciones.Avance a = buscador.avance(false).orElseThrow();
        return new EvaluacionMano(a.grupos(), 0, 0, Math.min(a.ternas(), TERNAS_REQUERIDAS), TERNAS_REQUERIDAS,
                a.sobrante(), false, null);
    }

    private static ResultadoValidacion aplicarResiduo(int residuo, ConfiguracionReglas cfg) {
        return residuo <= cfg.residuoMaximo()
                ? ResultadoValidacion.aceptado(TipoCierre.APUNTADO, residuo)
                : ResultadoValidacion.rechazado(MotivoRechazo.RESIDUO_EXCEDIDO, residuo, cfg.residuoMaximo() + 1);
    }

    private static boolean aPintas(List<Carta> mano) {
        return mano.stream().filter(c -> !c.esComodin()).map(Carta::pinta).distinct().count() <= 1;
    }
}

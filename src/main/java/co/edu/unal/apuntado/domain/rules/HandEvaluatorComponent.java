package co.edu.unal.apuntado.domain.rules;

import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.EvaluacionMano;
import co.edu.unal.apuntado.domain.rules.modelo.MotivoRechazo;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Nucleo del microkernel: resuelve la estrategia de la modalidad y delega el 100 % de la logica. */
public final class HandEvaluatorComponent implements IEvaluadorMano {

    public static final int CARTAS_AL_CERRAR = 10;
    private final RegistroReglas registro;

    public HandEvaluatorComponent(RegistroReglas registro) {
        this.registro = registro;
    }

    @Override
    public ResultadoValidacion validarCierre(List<Carta> mano, ConfiguracionReglas cfg) {
        Optional<ReglaJuego> regla = registro.obtener(cfg.modalidad());
        if (regla.isEmpty()) {
            return ResultadoValidacion.rechazado(MotivoRechazo.MODALIDAD_DESCONOCIDA);
        }
        if (mano.size() != CARTAS_AL_CERRAR) {
            return ResultadoValidacion.rechazado(MotivoRechazo.NUMERO_DE_CARTAS);
        }
        return regla.get().evaluarCierre(mano, cfg);
    }

    @Override
    public Agrupacion cartasSueltas(List<Carta> mano, ConfiguracionReglas cfg) {
        return regla(cfg).cartasSueltas(mano, cfg);
    }

    /**
     * Con 11 cartas prueba cada descarte con la propia regla y se queda con el mejor (EvaluacionMano#mejorQue). La
     * penalizacion si otro cierra ya son las cartas sueltas (RF07) de la mano que quedaria: la evaluada o, con 11
     * cartas, la que deja el descarte sugerido.
     */
    @Override
    public EvaluacionMano evaluarMano(List<Carta> mano, ConfiguracionReglas cfg) {
        ReglaJuego regla = regla(cfg);
        if (mano.size() != CARTAS_AL_CERRAR + 1) {
            return regla.evaluarAvance(mano, cfg).conPenalizacion(regla.cartasSueltas(mano, cfg).puntos());
        }
        EvaluacionMano mejor = null;
        for (int i = 0; i < mano.size(); i++) {
            EvaluacionMano opcion = regla.evaluarAvance(sin(mano, i), cfg)
                    .conDescarte(i, regla.evaluarCierre(sin(mano, i), cfg).valido());
            if (mejor == null || opcion.mejorQue(mejor)) {
                mejor = opcion;
            }
        }
        return mejor.conPenalizacion(regla.cartasSueltas(sin(mano, mejor.descarteSugerido()), cfg).puntos());
    }

    private static List<Carta> sin(List<Carta> mano, int indice) {
        List<Carta> resto = new ArrayList<>(mano);
        resto.remove(indice);
        return resto;
    }

    private ReglaJuego regla(ConfiguracionReglas cfg) {
        return registro.obtener(cfg.modalidad())
                .orElseThrow(() -> new IllegalArgumentException("Modalidad desconocida: " + cfg.modalidad()));
    }
}

package co.edu.unal.apuntado.domain.rules;

import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.MotivoRechazo;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
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
        return registro.obtener(cfg.modalidad())
                .orElseThrow(() -> new IllegalArgumentException("Modalidad desconocida: " + cfg.modalidad()))
                .cartasSueltas(mano, cfg);
    }
}

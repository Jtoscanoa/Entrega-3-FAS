package co.edu.unal.apuntado.domain.rules;

import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;

/** Entrega la clave de modalidad y valida la mesa; no conoce estrategias. */
public final class GameConfigurationComponent implements IConfiguracion {

    @Override
    public ConfiguracionReglas predeterminada(String modalidad) {
        return switch (modalidad) {
            case ConfiguracionReglas.APUNTADO_101 -> ConfiguracionReglas.apuntado101();
            case ConfiguracionReglas.CLASICA_433 -> ConfiguracionReglas.clasica();
            default -> throw new IllegalArgumentException("Modalidad desconocida: " + modalidad);
        };
    }

    @Override
    public void validarMesa(ConfiguracionReglas cfg, int jugadores) {
        if (!cfg.admiteJugadores(jugadores)) {
            throw new IllegalArgumentException(
                    "La mesa de " + jugadores + " jugadores no es valida (con 5 o 6 se exige segundo mazo)");
        }
    }
}

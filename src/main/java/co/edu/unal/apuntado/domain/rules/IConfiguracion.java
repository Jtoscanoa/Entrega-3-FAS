package co.edu.unal.apuntado.domain.rules;

import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;

public interface IConfiguracion {
    ConfiguracionReglas predeterminada(String modalidad);

    /** Rechaza con IllegalArgumentException una mesa que la configuracion no admite. */
    void validarMesa(ConfiguracionReglas cfg, int jugadores);
}

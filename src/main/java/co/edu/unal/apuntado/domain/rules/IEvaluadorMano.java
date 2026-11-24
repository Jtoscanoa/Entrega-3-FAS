package co.edu.unal.apuntado.domain.rules;

import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import java.util.List;

/** Interfaz provista por HandEvaluator; el orquestador nunca ve una estrategia. */
public interface IEvaluadorMano {
    ResultadoValidacion validarCierre(List<Carta> mano, ConfiguracionReglas cfg);

    Agrupacion cartasSueltas(List<Carta> mano, ConfiguracionReglas cfg);
}

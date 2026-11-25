package co.edu.unal.apuntado.domain.rules;

import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.EvaluacionMano;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import java.util.List;

/** Interfaz provista por HandEvaluator; el orquestador nunca ve una estrategia. */
public interface IEvaluadorMano {
    ResultadoValidacion validarCierre(List<Carta> mano, ConfiguracionReglas cfg);

    Agrupacion cartasSueltas(List<Carta> mano, ConfiguracionReglas cfg);

    /**
     * Avance de la mano propia para la SPA (RF16). Con 11 cartas evalua cada descarte posible y devuelve el mejor:
     * {@code puedeCerrar} indica que alguno deja un cierre valido. Con otra cantidad, la mano tal cual, sin cierre.
     */
    EvaluacionMano evaluarMano(List<Carta> mano, ConfiguracionReglas cfg);
}

package co.edu.unal.apuntado.domain.rules;

import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.EvaluacionMano;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import java.util.List;

/** Contrato Strategy del microkernel de reglas (ADR-04). Una variante nueva es una clase que lo implementa. */
public interface ReglaJuego {

    /** Clave abierta de la modalidad que resuelve el registro. */
    String modalidad();

    /** Evalua el cierre de una mano de 10 cartas (ya descartada la 11.a). */
    ResultadoValidacion evaluarCierre(List<Carta> mano, ConfiguracionReglas cfg);

    /** Agrupacion que minimiza los puntos sueltos de un perdedor (RF07). */
    Agrupacion cartasSueltas(List<Carta> mano, ConfiguracionReglas cfg);

    /**
     * Cuanto le falta a una mano de 10 cartas para cerrar (RF16): combinaciones, ternas y sobrante. Una variante que
     * no lo implemente no muestra avance; nunca se usa para validar (eso es {@link #evaluarCierre}).
     */
    default EvaluacionMano evaluarAvance(List<Carta> mano, ConfiguracionReglas cfg) {
        return EvaluacionMano.sinDetalle();
    }
}

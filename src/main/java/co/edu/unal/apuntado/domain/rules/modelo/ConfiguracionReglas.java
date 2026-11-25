package co.edu.unal.apuntado.domain.rules.modelo;

/** Parametros de una sala, fijos durante la partida. La modalidad es una clave abierta (ADR-04). */
public record ConfiguracionReglas(
        String modalidad,
        int umbralEliminacion,
        int residuoMaximo,
        boolean comodinesHabilitados,
        boolean cierreAPintas,
        boolean segundoMazo,
        boolean robarDelDescarte,
        int maximoRondas,
        int metaVictoria,
        int segundosPorTurno) {

    public static final String APUNTADO_101 = "APUNTADO_101";
    public static final String CLASICA_433 = "CLASICA_433";
    public static final int RESIDUO_TOPE = 4;
    /** Plazo por defecto: en la sesion S1 la mediana de un turno fue 22,6 s y el maximo 46,7 s (35 s no alcanzaba). */
    public static final int SEGUNDOS_POR_TURNO = 60;
    public static final int JUGADORES_MINIMO = 2;
    public static final int JUGADORES_MAXIMO = 6;
    public static final int JUGADORES_CON_UN_MAZO = 4;

    public ConfiguracionReglas {
        if (modalidad == null || modalidad.isBlank()) {
            throw new IllegalArgumentException("La modalidad es obligatoria");
        }
        exigir(umbralEliminacion > 0, "El umbral debe ser positivo");
        exigir(residuoMaximo >= 0 && residuoMaximo <= RESIDUO_TOPE, "El residuo maximo debe estar entre 0 y 4");
        exigir(maximoRondas >= 0, "El maximo de rondas no puede ser negativo");
        exigir(metaVictoria <= 0, "La meta de victoria debe ser cero o negativa");
        exigir(segundosPorTurno >= 5 && segundosPorTurno <= 300, "El tiempo de turno debe estar entre 5 y 300 s");
    }

    private static void exigir(boolean condicion, String mensaje) {
        if (!condicion) {
            throw new IllegalArgumentException(mensaje);
        }
    }

    public static ConfiguracionReglas apuntado101() {
        return new ConfiguracionReglas(APUNTADO_101, 101, RESIDUO_TOPE, false, false, false, false, 0, -51,
                SEGUNDOS_POR_TURNO);
    }

    /** La Clasica 4-3-3 es una partida atomica: maximo de rondas = 1. */
    public static ConfiguracionReglas clasica() {
        return new ConfiguracionReglas(CLASICA_433, 101, RESIDUO_TOPE, false, false, false, false, 1, -51,
                SEGUNDOS_POR_TURNO);
    }

    public ConfiguracionReglas conComodines(boolean valor) {
        return new ConfiguracionReglas(modalidad, umbralEliminacion, residuoMaximo, valor, cierreAPintas,
                segundoMazo, robarDelDescarte, maximoRondas, metaVictoria, segundosPorTurno);
    }

    public ConfiguracionReglas conUmbral(int valor) {
        return new ConfiguracionReglas(modalidad, valor, residuoMaximo, comodinesHabilitados, cierreAPintas,
                segundoMazo, robarDelDescarte, maximoRondas, metaVictoria, segundosPorTurno);
    }

    public ConfiguracionReglas conResiduoMaximo(int valor) {
        return new ConfiguracionReglas(modalidad, umbralEliminacion, valor, comodinesHabilitados, cierreAPintas,
                segundoMazo, robarDelDescarte, maximoRondas, metaVictoria, segundosPorTurno);
    }

    public ConfiguracionReglas conCierreAPintas(boolean valor) {
        return new ConfiguracionReglas(modalidad, umbralEliminacion, residuoMaximo, comodinesHabilitados, valor,
                segundoMazo, robarDelDescarte, maximoRondas, metaVictoria, segundosPorTurno);
    }

    public ConfiguracionReglas conSegundoMazo(boolean valor) {
        return new ConfiguracionReglas(modalidad, umbralEliminacion, residuoMaximo, comodinesHabilitados,
                cierreAPintas, valor, robarDelDescarte, maximoRondas, metaVictoria, segundosPorTurno);
    }

    public ConfiguracionReglas conRobarDelDescarte(boolean valor) {
        return new ConfiguracionReglas(modalidad, umbralEliminacion, residuoMaximo, comodinesHabilitados,
                cierreAPintas, segundoMazo, valor, maximoRondas, metaVictoria, segundosPorTurno);
    }

    public ConfiguracionReglas conSegundosPorTurno(int valor) {
        return new ConfiguracionReglas(modalidad, umbralEliminacion, residuoMaximo, comodinesHabilitados,
                cierreAPintas, segundoMazo, robarDelDescarte, maximoRondas, metaVictoria, valor);
    }

    /** Mesa de 2 a 6; con 5 o 6 el segundo mazo es obligatorio (6 x 10 + 1 = 61 > 52 cartas). */
    public boolean admiteJugadores(int jugadores) {
        if (jugadores < JUGADORES_MINIMO || jugadores > JUGADORES_MAXIMO) {
            return false;
        }
        return jugadores <= JUGADORES_CON_UN_MAZO || segundoMazo;
    }
}

package co.edu.unal.apuntado.domain.lobby;

/**
 * Opciones que elige el anfitrion al iniciar (RF09); null = valor predeterminado de la modalidad. Los extras
 * (comodines, cierre a pintas, segundo mazo) quedan apagados si no se piden (docs/reglas-obligatorias-vs-extras.md).
 * {@code residuoMaximo} (0 a 4) lo valida ConfiguracionReglas: el servidor rechaza un valor fuera de rango.
 */
public record OpcionesPartida(String modalidad, Boolean comodines, Boolean robarDelDescarte,
                              Boolean cierreAPintas, Boolean segundoMazo, Integer umbral,
                              Integer segundosPorTurno, Integer residuoMaximo) {

    /** Sin residuo maximo: el de la modalidad. */
    public OpcionesPartida(String modalidad, Boolean comodines, Boolean robarDelDescarte, Boolean cierreAPintas,
                           Boolean segundoMazo, Integer umbral, Integer segundosPorTurno) {
        this(modalidad, comodines, robarDelDescarte, cierreAPintas, segundoMazo, umbral, segundosPorTurno, null);
    }
}

package co.edu.unal.apuntado.domain.lobby;

/** Opciones que elige el anfitrion al iniciar; null = valor predeterminado de la modalidad. */
public record OpcionesPartida(String modalidad, Boolean comodines, Boolean robarDelDescarte,
                              Boolean cierreAPintas, Boolean segundoMazo, Integer umbral,
                              Integer segundosPorTurno) {
}

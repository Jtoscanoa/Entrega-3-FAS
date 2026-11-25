package co.edu.unal.apuntado.domain.gameplay;

import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;

/**
 * Patron State de la FSM de la partida (E2, diagrama de estados de la partida). Cada estado decide que comandos
 * admite y que hace el vencimiento del turno; un comando fuera de fase se rechaza sin efectos. Los estados no tocan
 * cartas ni puntos (FF-01c): solo eligen que operacion de {@link AccionesTurno} invocar. Las transiciones las fija el
 * orquestador al aplicar cada jugada, en el mismo punto de la secuencia que antes (sin cambios de comportamiento).
 */
sealed interface EstadoTurno
        permits EstadoTurno.EsperandoRobo, EstadoTurno.EsperandoDescarte, EstadoTurno.EntreRondas,
        EstadoTurno.Finalizada {

    EstadoTurno ESPERANDO_ROBO = new EsperandoRobo();
    EstadoTurno ESPERANDO_DESCARTE = new EsperandoDescarte();
    EstadoTurno ENTRE_RONDAS = new EntreRondas();
    EstadoTurno FINALIZADA = new Finalizada();

    /** Nombre que viaja en {@code VistaPartida.fase}. */
    String nombre();

    default void robar(AccionesTurno acciones, boolean delDescarte) {
        throw fueraDeFase();
    }

    default void descartar(AccionesTurno acciones, String carta) {
        throw fueraDeFase();
    }

    default ResultadoValidacion cerrar(AccionesTurno acciones, String carta) {
        throw fueraDeFase();
    }

    /** Vencimiento del turno (ADR-08): fuera de un turno en juego no hace nada. */
    default void vencer(AccionesTurno acciones) {
        // sin turno en juego no hay jugada por defecto
    }

    /** Hay un jugador con el turno (robar o descartar): corre su plazo. */
    default boolean turnoEnJuego() {
        return false;
    }

    default boolean finalizada() {
        return false;
    }

    default ComandoInvalidoException fueraDeFase() {
        return new ComandoInvalidoException(MotivoComando.FASE_INCORRECTA);
    }

    /** Inicio del turno: solo se puede robar. Al vencer, roba del mazo y descarta por defecto. */
    record EsperandoRobo() implements EstadoTurno {
        @Override
        public String nombre() {
            return "ESPERANDO_ROBO";
        }

        @Override
        public void robar(AccionesTurno acciones, boolean delDescarte) {
            acciones.robar(delDescarte);
        }

        @Override
        public void vencer(AccionesTurno acciones) {
            acciones.robar(false);
            acciones.descartarPorDefecto();
        }

        @Override
        public boolean turnoEnJuego() {
            return true;
        }
    }

    /** Con 11 cartas: descartar o cerrar. Al vencer, descarta por defecto; nunca cierra por el jugador. */
    record EsperandoDescarte() implements EstadoTurno {
        @Override
        public String nombre() {
            return "ESPERANDO_DESCARTE";
        }

        @Override
        public void descartar(AccionesTurno acciones, String carta) {
            acciones.descartar(carta);
        }

        @Override
        public ResultadoValidacion cerrar(AccionesTurno acciones, String carta) {
            return acciones.cerrar(carta);
        }

        @Override
        public void vencer(AccionesTurno acciones) {
            acciones.descartarPorDefecto();
        }

        @Override
        public boolean turnoEnJuego() {
            return true;
        }
    }

    /** Ronda liquidada y la siguiente sin abrir (o pendiente por D9): no se juega. */
    record EntreRondas() implements EstadoTurno {
        @Override
        public String nombre() {
            return "ENTRE_RONDAS";
        }
    }

    /** Estado final: todo comando se rechaza con PARTIDA_FINALIZADA. */
    record Finalizada() implements EstadoTurno {
        @Override
        public String nombre() {
            return "FINALIZADA";
        }

        @Override
        public boolean finalizada() {
            return true;
        }

        @Override
        public ComandoInvalidoException fueraDeFase() {
            return new ComandoInvalidoException(MotivoComando.PARTIDA_FINALIZADA);
        }
    }
}

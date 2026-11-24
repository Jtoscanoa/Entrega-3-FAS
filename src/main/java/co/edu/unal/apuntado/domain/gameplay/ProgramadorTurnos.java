package co.edu.unal.apuntado.domain.gameplay;

import java.time.Duration;

/** Puerto del temporizador autoritativo (ADR-08); en produccion lo respalda un TaskScheduler. */
public interface ProgramadorTurnos {
    void programar(Duration espera, Runnable accion);
}

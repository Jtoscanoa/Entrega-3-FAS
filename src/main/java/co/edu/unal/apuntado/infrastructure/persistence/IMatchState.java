package co.edu.unal.apuntado.infrastructure.persistence;

import java.time.Instant;
import java.util.List;

/** Puerto de persistencia: solo tipos primitivos y DTOs propios, sin depender de ningun dominio (FF-08b). */
public interface IMatchState {

    record JugadorPersistido(String sub, String alias) { }

    record ReglasPersistidas(String modalidad, int umbralEliminacion, int residuoMaximo,
                             boolean comodinesHabilitados, boolean cierreAPintas, boolean segundoMazo,
                             boolean robarDelDescarte, int maximoRondas, int metaVictoria, int segundosPorTurno) { }

    record NuevaPartida(String codigoSala, List<JugadorPersistido> jugadores, ReglasPersistidas reglas) {
        public NuevaPartida {
            jugadores = List.copyOf(jugadores);
        }
    }

    record CartaEnMano(int posicion, String codigo, Integer combinacion) { }

    record ManoLiquidada(String sub, int puntosRonda, boolean cierra, List<CartaEnMano> cartas) {
        public ManoLiquidada {
            cartas = List.copyOf(cartas);
        }
    }

    record PuntajeRonda(String sub, String evento, int puntosRonda, int total) { }

    record JugadaRegistrada(int numeroTurno, int secuencia, String sub, String accion, String carta,
                            Instant ocurridaEn) { }

    record LiquidacionRonda(long partidaId, long rondaId, String cerradorSub, String tipoCierre,
                            List<ManoLiquidada> manos, List<PuntajeRonda> puntajes,
                            List<JugadaRegistrada> jugadas, String sal, String ordenRevelado,
                            List<String> eliminadosSub, String ganadorSub) {
        public LiquidacionRonda {
            manos = List.copyOf(manos);
            puntajes = List.copyOf(puntajes);
            jugadas = List.copyOf(jugadas);
            eliminadosSub = List.copyOf(eliminadosSub);
        }

        public boolean finPartida() {
            return ganadorSub != null;
        }
    }

    /** Crea sala (si falta), jugadores, partida, configuracion y participantes; devuelve el id de la partida. */
    long guardarPartida(NuevaPartida partida);

    /** Escribe la huella al iniciar la ronda (estado EN_CURSO); devuelve el id de la ronda. */
    long registrarInicioRonda(long partidaId, int numero, String huellaSha256, String abridorSub);

    /**
     * Liquidacion ACID: UPDATE condicional EN_CURSO -> LIQUIDADA y todas las escrituras en una transaccion.
     *
     * @throws LiquidacionDuplicadaException si la ronda ya no estaba EN_CURSO (0 filas): rollback inmediato
     */
    void guardarLiquidacion(LiquidacionRonda liquidacion);
}

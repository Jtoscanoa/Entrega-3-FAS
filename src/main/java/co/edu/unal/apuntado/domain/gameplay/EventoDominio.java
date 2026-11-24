package co.edu.unal.apuntado.domain.gameplay;

import co.edu.unal.apuntado.domain.gameplay.auditoria.RevelacionReparto;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Eventos de dominio publicados tras el commit. {@code destinatario()} null = publico para la mesa. */
public sealed interface EventoDominio {

    long partidaId();

    default String destinatario() {
        return null;
    }

    enum Origen { MAZO, DESCARTE }

    record RondaIniciada(long partidaId, int numeroRonda, String huella, String cimaDescarte, String abridor)
            implements EventoDominio { }

    record ManoEntregada(long partidaId, String jugadorId, List<String> cartas) implements EventoDominio {
        @Override
        public String destinatario() {
            return jugadorId;
        }
    }

    record TurnoAsignado(long partidaId, String jugadorId, int numeroTurno, Instant venceEn)
            implements EventoDominio { }

    record CartaRobada(long partidaId, String jugadorId, Origen origen) implements EventoDominio { }

    record CartaRecibida(long partidaId, String jugadorId, String carta) implements EventoDominio {
        @Override
        public String destinatario() {
            return jugadorId;
        }
    }

    record CartaDescartada(long partidaId, String jugadorId, String carta) implements EventoDominio { }

    record MazoRepuesto(long partidaId, String huella) implements EventoDominio { }

    record CierreRechazado(long partidaId, String jugadorId, String motivo) implements EventoDominio {
        @Override
        public String destinatario() {
            return jugadorId;
        }
    }

    record RondaLiquidada(long partidaId, int numeroRonda, String cerradorId, String tipoCierre,
                          Map<String, Integer> puntosRonda, Map<String, Integer> marcador,
                          Set<String> eliminados, RevelacionReparto revelacion) implements EventoDominio { }

    /** D9: la ronda {@code numeroRonda} no se pudo abrir tras una liquidacion confirmada; se reintenta al reanudar. */
    record RondaPendiente(long partidaId, int numeroRonda, String causa) implements EventoDominio { }

    record PartidaFinalizada(long partidaId, String ganadorId, String motivo) implements EventoDominio { }
}

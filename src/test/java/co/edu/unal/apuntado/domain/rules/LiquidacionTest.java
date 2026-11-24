package co.edu.unal.apuntado.domain.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.MotivoFin;
import co.edu.unal.apuntado.domain.rules.modelo.MotivoRechazo;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoLiquidacion;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import co.edu.unal.apuntado.domain.rules.modelo.SolicitudLiquidacion;
import co.edu.unal.apuntado.domain.rules.modelo.TipoCierre;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class LiquidacionTest {

    private final RoundScoringComponent scoring = new RoundScoringComponent();
    private final ConfiguracionReglas cfg = ConfiguracionReglas.apuntado101();

    private static Map<String, Integer> mapa(Object... kv) {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put((String) kv[i], (Integer) kv[i + 1]);
        }
        return m;
    }

    /** Agrupaciones de perdedores con los puntos sueltos dados (como las entrega IEvaluadorMano). */
    private static Map<String, Agrupacion> sueltas(Map<String, Integer> puntos) {
        Map<String, Agrupacion> m = new LinkedHashMap<>();
        puntos.forEach((id, p) -> m.put(id, new Agrupacion(p, List.of(), List.of())));
        return m;
    }

    private ResultadoLiquidacion liquidar(int ronda, int puntosCierre, Map<String, Integer> perdedores,
                                          Map<String, Integer> previo, ConfiguracionReglas c) {
        return scoring.liquidar(new SolicitudLiquidacion(ronda, "ana",
                ResultadoValidacion.aceptado(TipoCierre.COMPLETO, puntosCierre), sueltas(perdedores), previo, c));
    }

    @Test
    void quienCierraRestaYLosPerdedoresSuman() {
        ResultadoLiquidacion r = liquidar(1, -10, mapa("beto", 30), mapa("ana", 20, "beto", 10), cfg);
        assertEquals(10, r.marcador().get("ana"));
        assertEquals(40, r.marcador().get("beto"));
        assertFalse(r.finPartida());
        assertTrue(r.eliminados().isEmpty());
    }

    @Test
    void deteccionAtomicaExactaEnElUmbralDe101() {
        Map<String, Integer> previo = mapa("ana", 50, "beto", 98, "caro", 20);
        ResultadoLiquidacion en100 = liquidar(2, -10, mapa("beto", 2, "caro", 5), previo, cfg);
        assertTrue(en100.eliminados().isEmpty());
        assertEquals(100, en100.marcador().get("beto"));
        ResultadoLiquidacion en101 = liquidar(2, -10, mapa("beto", 3, "caro", 5), previo, cfg);
        assertEquals(Set.of("beto"), en101.eliminados());
        assertFalse(en101.finPartida());
    }

    @Test
    void ultimoActivoGanaCuandoElRestoEsEliminado() {
        ResultadoLiquidacion r = liquidar(3, -10, mapa("beto", 5), mapa("ana", 20, "beto", 97), cfg);
        assertTrue(r.finPartida());
        assertEquals(MotivoFin.ULTIMO_ACTIVO, r.motivoFin().orElseThrow());
        assertEquals("ana", r.ganador().orElseThrow());
    }

    @Test
    void ultimoActivoNoDependeDelOrdenDelMarcador() {
        ResultadoLiquidacion r = liquidar(3, -10, mapa("beto", 5), mapa("beto", 97, "ana", 20), cfg);
        assertEquals(MotivoFin.ULTIMO_ACTIVO, r.motivoFin().orElseThrow());
        assertEquals("ana", r.ganador().orElseThrow());
    }

    @Test
    void conMaximoDeRondasLaPartidaSigueAntesDeAlcanzarlo() {
        ConfiguracionReglas tresRondas = new ConfiguracionReglas(ConfiguracionReglas.APUNTADO_101, 101, 4,
                false, false, false, false, 3, -51, 30);
        assertFalse(liquidar(2, -10, mapa("beto", 5), mapa("ana", 0, "beto", 0), tresRondas).finPartida());
        assertEquals(MotivoFin.MAXIMO_RONDAS,
                liquidar(3, -10, mapa("beto", 5), mapa("ana", 0, "beto", 0), tresRondas).motivoFin().orElseThrow());
    }

    @Test
    void siTodosSuperanElUmbralGanaElMenorMarcador() {
        ResultadoLiquidacion r = scoring.liquidar(new SolicitudLiquidacion(4, "ana",
                ResultadoValidacion.aceptado(TipoCierre.APUNTADO, 4), sueltas(mapa("beto", 20)),
                mapa("ana", 98, "beto", 95), cfg));
        assertEquals(MotivoFin.TODOS_SUPERARON_UMBRAL, r.motivoFin().orElseThrow());
        assertEquals("ana", r.ganador().orElseThrow());
    }

    @Test
    void empateDeMarcadorFavoreceAQuienCierra() {
        ResultadoLiquidacion r = scoring.liquidar(new SolicitudLiquidacion(4, "beto",
                ResultadoValidacion.aceptado(TipoCierre.APUNTADO, 4), sueltas(mapa("ana", 4)),
                mapa("ana", 100, "beto", 100), cfg));
        assertEquals("beto", r.ganador().orElseThrow());
    }

    @Test
    void metaDeVictoriaTerminaLaPartida() {
        ResultadoLiquidacion r = liquidar(5, -25, mapa("beto", 3), mapa("ana", -30, "beto", 10), cfg);
        assertEquals(MotivoFin.META_VICTORIA, r.motivoFin().orElseThrow());
        assertEquals("ana", r.ganador().orElseThrow());
    }

    @Test
    void clasicaTerminaEnUnaRondaYGanaQuienCierra() {
        ResultadoLiquidacion r = liquidar(1, -10, mapa("beto", 37, "caro", 12),
                mapa("ana", 0, "beto", 0, "caro", 0), ConfiguracionReglas.clasica());
        assertEquals(MotivoFin.MAXIMO_RONDAS, r.motivoFin().orElseThrow());
        assertEquals("ana", r.ganador().orElseThrow());
    }

    @Test
    void solicitudesIncoherentesSeRechazan() {
        ResultadoValidacion ok = ResultadoValidacion.aceptado(TipoCierre.COMPLETO, -10);
        assertThrows(IllegalArgumentException.class, () -> new SolicitudLiquidacion(1, "zoe", ok,
                sueltas(mapa("beto", 1)), mapa("ana", 0, "beto", 0), cfg));
        assertThrows(IllegalArgumentException.class, () -> new SolicitudLiquidacion(1, "ana",
                ResultadoValidacion.rechazado(MotivoRechazo.ESTRUCTURA_INVALIDA), sueltas(mapa()), mapa("ana", 0), cfg));
        assertThrows(IllegalArgumentException.class, () -> new SolicitudLiquidacion(1, "ana", ok,
                sueltas(mapa("ana", 1, "beto", 1)), mapa("ana", 0, "beto", 0), cfg), "quien cierra no es perdedor");
        assertThrows(IllegalArgumentException.class, () -> ResultadoValidacion.aceptado(null, 0));
        assertThrows(IllegalArgumentException.class, () -> new ResultadoValidacion(true, TipoCierre.COMPLETO,
                -10, MotivoRechazo.ESTRUCTURA_INVALIDA));
        assertThrows(IllegalArgumentException.class, () -> new ResultadoValidacion(false, null, 0, null));
    }
}

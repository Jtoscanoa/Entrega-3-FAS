package co.edu.unal.apuntado.infrastructure;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import co.edu.unal.apuntado.ApuntadoApplication;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.CartaEnMano;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.JugadaRegistrada;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.JugadorPersistido;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.LiquidacionRonda;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.ManoLiquidada;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.NuevaPartida;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.PuntajeRonda;
import co.edu.unal.apuntado.infrastructure.persistence.IMatchState.ReglasPersistidas;
import co.edu.unal.apuntado.infrastructure.persistence.LiquidacionDuplicadaException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Retro E2 2.3: un reinicio del servidor pierde el estado vivo de las mesas. Con PostgreSQL 16 real, una partida con
 * la ronda 1 liquidada y la ronda 2 en curso arranca un contexto nuevo: la ronda 2 queda ANULADA, la partida
 * INTERRUMPIDA y los puntajes de la ronda 1 identicos.
 */
@Testcontainers
class RecuperacionTrasCaidaIT {

    @Container
    static final PostgreSQLContainer<?> PG = new PostgreSQLContainer<>("postgres:16");

    private static final String PUNTAJES = """
            SELECT p.asiento, pa.evento, pa.puntos_ronda, pa.total FROM puntaje_acumulado pa
              JOIN participante p ON p.id = pa.participante_id WHERE pa.ronda_id = ? ORDER BY p.asiento""";

    private static ConfigurableApplicationContext arrancar() {
        // Argumentos de linea de comandos: properties() del builder pierde contra application.yml (server.port).
        return new SpringApplicationBuilder(ApuntadoApplication.class).run(
                "--server.port=0",
                "--spring.datasource.url=" + PG.getJdbcUrl(),
                "--spring.datasource.username=" + PG.getUsername(),
                "--spring.datasource.password=" + PG.getPassword());
    }

    private static LiquidacionRonda rondaUno(long partidaId, long rondaId) {
        List<CartaEnMano> manoA = List.of(new CartaEnMano(1, "5C", 1), new CartaEnMano(2, "6C", 1),
                new CartaEnMano(3, "7C", 1));
        return new LiquidacionRonda(partidaId, rondaId, "sub-a", "APUNTADO",
                List.of(new ManoLiquidada("sub-a", 4, true, manoA),
                        new ManoLiquidada("sub-b", 37, false, List.of(new CartaEnMano(1, "KP", null)))),
                List.of(new PuntajeRonda("sub-a", "RONDA", 4, 4), new PuntajeRonda("sub-b", "RONDA", 37, 37)),
                List.of(new JugadaRegistrada(1, 1, "sub-a", "CERRAR", "AD", Instant.now())),
                "0".repeat(32), "5C,6C,7C", List.of(), null);
    }

    @Test
    void trasElReinicioLaRondaEnCursoSeAnulaYLaLiquidadaSeConserva() {
        long partida;
        long ronda1;
        long ronda2;
        List<Map<String, Object>> puntajesAntes;
        try (ConfigurableApplicationContext antes = arrancar()) {
            IMatchState repo = antes.getBean(IMatchState.class);
            partida = repo.guardarPartida(new NuevaPartida("R3C4ID",
                    List.of(new JugadorPersistido("sub-a", "Ana"), new JugadorPersistido("sub-b", "Beto")),
                    new ReglasPersistidas("APUNTADO_101", 101, 4, false, false, false, true, 0, -51, 60)));
            ronda1 = repo.registrarInicioRonda(partida, 1, "a".repeat(64), "sub-a");
            repo.guardarLiquidacion(rondaUno(partida, ronda1));
            ronda2 = repo.registrarInicioRonda(partida, 2, "b".repeat(64), "sub-b");
            puntajesAntes = antes.getBean(JdbcTemplate.class).queryForList(PUNTAJES, ronda1);
        }

        try (ConfigurableApplicationContext despues = arrancar()) {
            JdbcTemplate jdbc = despues.getBean(JdbcTemplate.class);
            assertEquals("ANULADA", estado(jdbc, "ronda", ronda2));
            assertNotNull(jdbc.queryForObject("SELECT anulada_en FROM ronda WHERE id = ?", Timestamp.class, ronda2));
            assertNull(jdbc.queryForObject("SELECT cerrador_participante_id FROM ronda WHERE id = ?", Long.class,
                    ronda2));
            assertEquals("LIQUIDADA", estado(jdbc, "ronda", ronda1));
            assertEquals("INTERRUMPIDA", estado(jdbc, "partida", partida));
            assertEquals(puntajesAntes, jdbc.queryForList(PUNTAJES, ronda1), "los puntajes de la ronda 1 no cambian");
            assertFalse(puntajesAntes.isEmpty());
            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM puntaje_acumulado WHERE ronda_id = ?",
                    Integer.class, ronda2));

            IMatchState repo = despues.getBean(IMatchState.class);
            assertThrows(LiquidacionDuplicadaException.class, () -> repo.guardarLiquidacion(rondaUno(partida, ronda2)),
                    "una ronda anulada ya no se puede liquidar");
            assertEquals(0, repo.anularPartidasEnCurso().rondasAnuladas().size(), "un segundo arranque no toca nada");
        }
    }

    private static String estado(JdbcTemplate jdbc, String tabla, long id) {
        return jdbc.queryForObject("SELECT estado FROM " + tabla + " WHERE id = ?", String.class, id);
    }
}

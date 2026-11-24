package co.edu.unal.apuntado.infrastructure;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

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
import co.edu.unal.apuntado.infrastructure.persistence.MatchStateRepository;
import java.time.Instant;
import java.util.List;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * FF-16 (y FF-17, segunda barrera): PostgreSQL 16 real con Flyway V1..V3. Un fallo inyectado a mitad de la
 * liquidacion deja 0 filas escritas; una segunda liquidacion de la misma ronda no afecta filas.
 */
@Testcontainers
class LiquidacionTransaccionalIT {

    @Container
    static final PostgreSQLContainer<?> PG = new PostgreSQLContainer<>("postgres:16");

    @Configuration
    @EnableTransactionManagement
    static class Config {
        @Bean DriverManagerDataSource ds() {
            return new DriverManagerDataSource(PG.getJdbcUrl(), PG.getUsername(), PG.getPassword());
        }
        @Bean JdbcTemplate jdbc(DriverManagerDataSource ds) { return new JdbcTemplate(ds); }
        @Bean DataSourceTransactionManager transactionManager(DriverManagerDataSource ds) {
            return new DataSourceTransactionManager(ds);
        }
        @Bean MatchStateRepository repo(JdbcTemplate jdbc) { return new MatchStateRepository(jdbc); }
    }

    private AnnotationConfigApplicationContext ctx;
    private IMatchState repo;
    private JdbcTemplate jdbc;

    @BeforeEach
    void preparar() {
        Flyway flyway = Flyway.configure().dataSource(PG.getJdbcUrl(), PG.getUsername(), PG.getPassword())
                .cleanDisabled(false).load();
        flyway.clean();
        flyway.migrate();
        ctx = new AnnotationConfigApplicationContext(Config.class);
        // El bean es un proxy JDK de IMatchState (contexto Spring sin Boot: proxyTargetClass = false)
        repo = ctx.getBean(IMatchState.class);
        jdbc = ctx.getBean(JdbcTemplate.class);
    }

    @AfterEach
    void cerrar() {
        ctx.close();
    }

    private long partida() {
        return repo.guardarPartida(new NuevaPartida("K7Q2ZP",
                List.of(new JugadorPersistido("sub-a", "Ana"), new JugadorPersistido("sub-b", "Beto")),
                new ReglasPersistidas("APUNTADO_101", 101, 4, false, false, false, false, 0, -51, 30)));
    }

    private LiquidacionRonda liquidacion(long partidaId, long rondaId, String cartaDeBeto) {
        List<CartaEnMano> manoA = List.of(new CartaEnMano(1, "5C", 1), new CartaEnMano(2, "6C", 1),
                new CartaEnMano(3, "7C", 1));
        List<CartaEnMano> manoB = List.of(new CartaEnMano(1, cartaDeBeto, null));
        return new LiquidacionRonda(partidaId, rondaId, "sub-a", "COMPLETO",
                List.of(new ManoLiquidada("sub-a", -10, true, manoA), new ManoLiquidada("sub-b", 10, false, manoB)),
                List.of(new PuntajeRonda("sub-a", "RONDA", -10, -10), new PuntajeRonda("sub-b", "RONDA", 10, 10)),
                List.of(new JugadaRegistrada(1, 1, "sub-a", "CERRAR", "5C", Instant.now())),
                "0".repeat(32), "5C,6C,7C", List.of(), null);
    }

    private int filas(String tabla) {
        return jdbc.queryForObject("SELECT count(*) FROM " + tabla, Integer.class);
    }

    @Test
    void unFalloAMitadDeLaLiquidacionNoEscribeNingunaFila() {
        long p = partida();
        long r = repo.registrarInicioRonda(p, 1, "a".repeat(64), "sub-a");
        // "ZZ" viola la FK de carta: el fallo ocurre DESPUES del UPDATE condicional y de varios INSERT
        assertThrows(RuntimeException.class, () -> repo.guardarLiquidacion(liquidacion(p, r, "ZZ")));
        assertEquals("EN_CURSO", jdbc.queryForObject("SELECT estado FROM ronda WHERE id = ?", String.class, r));
        assertEquals(0, filas("mano_jugador"));
        assertEquals(0, filas("carta_mano"));
        assertEquals(0, filas("puntaje_acumulado"));
        assertEquals(0, filas("turno_jugada"));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM sello_reparto WHERE sal IS NOT NULL", Integer.class));
    }

    @Test
    void laLiquidacionValidaEsAtomicaYLaSegundaNoAfectaFilas() {
        long p = partida();
        long r = repo.registrarInicioRonda(p, 1, "a".repeat(64), "sub-a");
        repo.guardarLiquidacion(liquidacion(p, r, "KP"));
        assertEquals("LIQUIDADA", jdbc.queryForObject("SELECT estado FROM ronda WHERE id = ?", String.class, r));
        assertEquals(2, filas("mano_jugador"));
        assertEquals(2, filas("puntaje_acumulado"));
        assertThrows(LiquidacionDuplicadaException.class, () -> repo.guardarLiquidacion(liquidacion(p, r, "KP")));
        assertEquals(2, filas("mano_jugador"), "la segunda liquidacion no escribio nada");
        assertEquals(1, jdbc.queryForObject("SELECT version FROM partida WHERE id = ?", Integer.class, p));
    }

    @Test
    void elEsquemaRechazaResiduoMaximoDeCincoYDosGanadores() {
        long p = partida();
        assertThrows(RuntimeException.class, () -> jdbc.update(
                "UPDATE configuracion_reglas SET residuo_maximo = 5 WHERE partida_id = ?", p));
        jdbc.update("UPDATE participante SET es_ganador = TRUE WHERE partida_id = ? AND asiento = 1", p);
        assertThrows(RuntimeException.class, () -> jdbc.update(
                "UPDATE participante SET es_ganador = TRUE WHERE partida_id = ? AND asiento = 2", p));
    }
}

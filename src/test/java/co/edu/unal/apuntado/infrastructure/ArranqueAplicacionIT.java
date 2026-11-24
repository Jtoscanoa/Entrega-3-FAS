package co.edu.unal.apuntado.infrastructure;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Prueba de humo del ensamblaje completo (Spring + Flyway + PostgreSQL 16 real): el contexto arranca sin ciclos
 * entre beans y una partida se crea e inicia por REST con tokens de invitado (ADR-07b). Atrapa errores de cableado
 * que las pruebas del dominio no ven porque alli el dominio se arma a mano.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@SuppressWarnings({"rawtypes", "unchecked"})
class ArranqueAplicacionIT {

    @Container
    static final PostgreSQLContainer<?> PG = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void baseDeDatos(DynamicPropertyRegistry registro) {
        registro.add("spring.datasource.url", PG::getJdbcUrl);
        registro.add("spring.datasource.username", PG::getUsername);
        registro.add("spring.datasource.password", PG::getPassword);
    }

    @Autowired
    private TestRestTemplate http;

    private String token(String apodo) {
        ResponseEntity<Map> r = http.postForEntity("/api/sesion", Map.of("apodo", apodo), Map.class);
        assertEquals(HttpStatus.OK, r.getStatusCode());
        return (String) r.getBody().get("token");
    }

    private static HttpEntity<Object> con(String token, Object cuerpo) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(token);
        h.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(cuerpo, h);
    }

    @Test
    void elContextoArrancaYUnaPartidaSeIniciaPorRest() {
        assertEquals(HttpStatus.OK, http.getForEntity("/actuator/health", String.class).getStatusCode());
        String ana = token("Ana");
        String beto = token("Beto");
        Map sala = http.exchange("/api/salas", HttpMethod.POST, con(ana, null), Map.class).getBody();
        String codigo = (String) sala.get("codigo");
        assertEquals(HttpStatus.OK, http.exchange("/api/salas/" + codigo + "/unirse", HttpMethod.POST,
                con(beto, null), Map.class).getStatusCode());

        Map<String, Object> opciones = new HashMap<>();
        opciones.put("modalidad", "APUNTADO_101");
        opciones.put("robarDelDescarte", true);
        opciones.put("segundosPorTurno", 60);
        ResponseEntity<Map> inicio = http.exchange("/api/salas/" + codigo + "/iniciar", HttpMethod.POST,
                con(ana, opciones), Map.class);
        assertEquals(HttpStatus.OK, inicio.getStatusCode());

        Map estado = http.exchange("/api/salas/" + codigo, HttpMethod.GET, con(beto, null), Map.class).getBody();
        assertEquals(((Number) inicio.getBody().get("partidaId")).longValue(),
                ((Number) estado.get("partidaId")).longValue());
    }

    @Test
    void sinTokenLaApiResponde401() {
        assertEquals(HttpStatus.UNAUTHORIZED, http.postForEntity("/api/salas", null, String.class).getStatusCode());
    }
}

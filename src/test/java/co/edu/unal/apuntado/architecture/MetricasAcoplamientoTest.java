package co.edu.unal.apuntado.architecture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.TurnOrchestratorComponent;
import co.edu.unal.apuntado.domain.gameplay.auditoria.DealAuditComponent;
import co.edu.unal.apuntado.domain.gameplay.mazo.DeckManagementComponent;
import co.edu.unal.apuntado.domain.lobby.LobbyPartyComponent;
import co.edu.unal.apuntado.domain.rules.GameConfigurationComponent;
import co.edu.unal.apuntado.domain.rules.HandEvaluatorComponent;
import co.edu.unal.apuntado.domain.rules.RoundScoringComponent;
import co.edu.unal.apuntado.infrastructure.persistence.MatchStateRepository;
import co.edu.unal.apuntado.infrastructure.realtime.LobbyController;
import co.edu.unal.apuntado.infrastructure.realtime.PublicadorEventosStomp;
import co.edu.unal.apuntado.infrastructure.realtime.SessionGatewayComponent;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaPackage;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.library.metrics.ArchitectureMetrics;
import com.tngtech.archunit.library.metrics.ComponentDependencyMetrics;
import com.tngtech.archunit.library.metrics.MetricsComponent;
import com.tngtech.archunit.library.metrics.MetricsComponents;
import java.io.IOException;
import java.lang.reflect.Constructor;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;

/**
 * FF-08 (holistica): metricas de acoplamiento de Martin (2003) en dos niveles.
 * <ol>
 *   <li>Componentes: grafo construido desde los constructores (interfaces inyectadas) mas la UI, que es TypeScript y
 *   no aparece en el bytecode. Se comprueba Ce del orquestador, la estabilidad de los componentes base y el SDP.</li>
 *   <li>Paquetes: Ca, Ce, I, A y D = |A + I - 1| calculados por ArchUnit ({@link ArchitectureMetrics}) para el
 *   reporte de la seccion 4.2 del E3 (zona del dolor y zona de inutilidad).</li>
 * </ol>
 * Salidas: target/metricas-acoplamiento.csv (componentes) y target/metricas-paquetes.csv (paquetes).
 */
class MetricasAcoplamientoTest {

    private static final String RAIZ = "co.edu.unal.apuntado";
    private static final String UI = "SPA (React)";
    private static final List<Class<?>> COMPONENTES = List.of(SessionGatewayComponent.class, LobbyController.class,
            PublicadorEventosStomp.class, LobbyPartyComponent.class, TurnOrchestratorComponent.class,
            DeckManagementComponent.class, DealAuditComponent.class, HandEvaluatorComponent.class,
            RoundScoringComponent.class, GameConfigurationComponent.class, MatchStateRepository.class);
    private static final Set<String> ESTABLES = Set.of("HandEvaluator", "RoundScoring", "GameConfiguration",
            "DealAudit", "MatchStateRepository");
    /** Origenes donde se acepta violar el SDP: adaptadores de entrada y la sala, que dependen del orquestador. */
    private static final Set<String> SDP_ACEPTADO = Set.of("SessionGateway", "LobbyController", "LobbyParty");
    private static final Map<String, Set<String>> GRAFO = construirGrafo();

    private static String nombre(Class<?> c) {
        return c.getSimpleName().replace("Component", "");
    }

    private static Map<String, Set<String>> construirGrafo() {
        Map<Class<?>, String> proveedor = new HashMap<>();
        COMPONENTES.forEach(c -> Arrays.stream(c.getInterfaces()).forEach(i -> proveedor.put(i, nombre(c))));
        Map<String, Set<String>> grafo = new TreeMap<>();
        grafo.put(UI, new TreeSet<>(Set.of(nombre(SessionGatewayComponent.class), nombre(LobbyController.class))));
        for (Class<?> c : COMPONENTES) {
            Set<String> destinos = new TreeSet<>();
            for (Constructor<?> k : c.getDeclaredConstructors()) {
                Arrays.stream(k.getParameterTypes()).map(proveedor::get).filter(Objects::nonNull)
                        .forEach(destinos::add);
            }
            if (c == LobbyController.class) {
                destinos.add(nombre(LobbyPartyComponent.class)); // ILobby lo implementa LobbyParty
            }
            grafo.put(nombre(c), destinos);
        }
        return grafo;
    }

    private static int ce(String c) {
        return GRAFO.get(c).size();
    }

    private static int ca(String c) {
        return (int) GRAFO.values().stream().filter(d -> d.contains(c)).count();
    }

    private static double inestabilidad(String c) {
        int total = ca(c) + ce(c);
        return total == 0 ? 0 : (double) ce(c) / total;
    }

    @Test
    void metricasDeComponentes() throws IOException {
        assertTrue(ce("TurnOrchestrator") <= 7, "Ce del orquestador (umbral E2: 7): " + ce("TurnOrchestrator"));
        for (String estable : ESTABLES) {
            assertEquals(0.0, inestabilidad(estable), "I de " + estable);
        }
        List<String> filas = new ArrayList<>(List.of("componente,Ca,Ce,I"));
        GRAFO.keySet().forEach(c -> filas.add(String.format(Locale.ROOT, "%s,%d,%d,%.2f", c, ca(c), ce(c),
                inestabilidad(c))));
        escribir("metricas-acoplamiento.csv", filas);
    }

    @Test
    void soloSeAceptanLasViolacionesDelSdpDocumentadas() {
        List<String> violaciones = new ArrayList<>();
        GRAFO.forEach((origen, destinos) -> destinos.forEach(destino -> {
            if (!origen.equals(UI) && inestabilidad(origen) < inestabilidad(destino) - 1e-9
                    && !SDP_ACEPTADO.contains(origen)) {
                violaciones.add(origen + "->" + destino);
            }
        }));
        assertTrue(violaciones.isEmpty(), "Nuevas violaciones del SDP: " + violaciones);
    }

    @Test
    void metricasDePaquetesConDistanciaALaSecuenciaPrincipal() throws IOException {
        JavaClasses clases = new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages(RAIZ);
        List<MetricsComponent<JavaClass>> componentes = new ArrayList<>();
        for (JavaPackage p : clases.getPackage(RAIZ).getSubpackagesInTree()) {
            if (!p.getClasses().isEmpty()) {
                componentes.add(MetricsComponent.of(p.getName().substring(RAIZ.length() + 1), p.getClasses()));
            }
        }
        ComponentDependencyMetrics m = ArchitectureMetrics.componentDependencyMetrics(
                MetricsComponents.of(componentes));
        List<String> filas = new ArrayList<>(List.of("paquete,clases,Ca,Ce,I,A,D"));
        componentes.stream().map(MetricsComponent::getIdentifier).sorted().forEach(id -> filas.add(String.format(
                Locale.ROOT, "%s,%d,%d,%d,%.2f,%.2f,%.2f", id, clases.getPackage(RAIZ + "." + id).getClasses().size(),
                m.getAfferentCoupling(id), m.getEfferentCoupling(id), m.getInstability(id), m.getAbstractness(id),
                m.getNormalizedDistanceFromMainSequence(id))));
        escribir("metricas-paquetes.csv", filas);
        assertTrue(filas.size() > 5, "se esperaban los paquetes del dominio y la infraestructura");
    }

    private static void escribir(String archivo, List<String> filas) throws IOException {
        Path csv = Path.of("target", archivo);
        Files.createDirectories(csv.getParent());
        Files.write(csv, filas);
    }
}

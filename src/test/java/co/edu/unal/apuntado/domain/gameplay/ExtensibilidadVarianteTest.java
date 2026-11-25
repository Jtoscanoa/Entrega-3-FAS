package co.edu.unal.apuntado.domain.gameplay;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.gameplay.Escenario.MazoFalso;
import co.edu.unal.apuntado.domain.rules.HandEvaluatorComponent;
import co.edu.unal.apuntado.domain.rules.RegistroReglas;
import co.edu.unal.apuntado.domain.rules.ReglaJuego;
import co.edu.unal.apuntado.domain.rules.evaluacion.ReglaFlorPrueba;
import co.edu.unal.apuntado.domain.rules.modelo.ConfiguracionReglas;
import co.edu.unal.apuntado.domain.rules.modelo.MotivoRechazo;
import co.edu.unal.apuntado.domain.rules.modelo.ResultadoValidacion;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.ServiceLoader;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * FF-13 (E2 Extensibility, ADR-04): una variante nueva es una clase que implementa ReglaJuego mas una linea en
 * META-INF/services. La variante de prueba vive solo en test y su archivo de servicios en un directorio aparte
 * (variante-prueba/), cargado con su propio ClassLoader para no aparecer en las demas pruebas. Ninguna clase de
 * src/main cambia: el registro, el evaluador y el orquestador la usan tal como estan.
 */
class ExtensibilidadVarianteTest {

    /** Diez treboles y el AD para descartar: flor para la variante. */
    private static final String MANO_FLOR = "2C 3C 4C 5C 6C 7C 8C 9C 10C JC AD";
    private URLClassLoader cargador;
    private RegistroReglas registro;

    @BeforeEach
    void cargarVariante() {
        URL raiz = getClass().getResource("/variante-prueba/");
        assertNotNull(raiz, "falta src/test/resources/variante-prueba");
        cargador = new URLClassLoader(new URL[] {raiz}, getClass().getClassLoader());
        registro = new RegistroReglas(ServiceLoader.load(ReglaJuego.class, cargador));
    }

    @AfterEach
    void cerrarCargador() throws IOException {
        cargador.close();
    }

    private static ConfiguracionReglas flor() {
        return new ConfiguracionReglas(ReglaFlorPrueba.MODALIDAD, 101, ConfiguracionReglas.RESIDUO_TOPE,
                false, false, false, false, 0, -51, 30);
    }

    @Test
    void serviceLoaderDescubreLaVarianteJuntoALasDosObligatorias() {
        assertEquals(Set.of(ConfiguracionReglas.APUNTADO_101, ConfiguracionReglas.CLASICA_433,
                ReglaFlorPrueba.MODALIDAD), registro.modalidades());
        assertFalse(new RegistroReglas().modalidades().contains(ReglaFlorPrueba.MODALIDAD),
                "el registro de produccion no la ve");
    }

    @Test
    void elEvaluadorDelegaEnLaVarianteSinConocerla() {
        HandEvaluatorComponent evaluador = new HandEvaluatorComponent(registro);
        ResultadoValidacion flor = evaluador.validarCierre(Escenario.cartas("2C 3C 4C 5C 6C 7C 8C 9C 10C JC"), flor());
        assertTrue(flor.valido());
        assertEquals(-20, flor.puntos());
        assertEquals(MotivoRechazo.ESTRUCTURA_INVALIDA,
                evaluador.validarCierre(Escenario.cartas("2C 3C 4C 5C 6C 7C 8C 9C 10C JD"), flor()).motivo());
    }

    @Test
    void elOrquestadorJuegaUnaRondaCompletaConLaVariante() {
        Escenario e = new Escenario(new MazoFalso(MANO_FLOR, Escenario.MANO_RIVAL), new HandEvaluatorComponent(registro));
        long id = e.iniciar(flor(), 2);
        int turno = e.eventosDe(EventoDominio.TurnoAsignado.class).get(0).numeroTurno();

        assertTrue(e.orquestador.cerrar(id, "sub-a", "AD", turno).valido());

        EventoDominio.RondaLiquidada r = e.eventosDe(EventoDominio.RondaLiquidada.class).get(0);
        assertEquals("COMPLETO", r.tipoCierre());
        assertEquals(-20, r.marcador().get("sub-a"));
        assertEquals(73, r.marcador().get("sub-b"), "el rival paga todas sus cartas: 73 puntos");
        assertEquals(1, e.estado.liquidaciones.get());
    }

    @Test
    void laVarianteSoloDependeDelMotorDeReglasYDeJava() {
        classes().that().haveSimpleName("ReglaFlorPrueba")
                .should().onlyDependOnClassesThat().resideInAnyPackage("..domain.rules..", "java..")
                .check(new ClassFileImporter().importClasses(ReglaFlorPrueba.class));
    }
}

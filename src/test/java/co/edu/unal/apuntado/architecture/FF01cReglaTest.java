package co.edu.unal.apuntado.architecture;

import static com.tngtech.archunit.core.domain.JavaAccess.Predicates.targetOwner;
import static com.tngtech.archunit.core.domain.JavaCall.Predicates.target;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.assignableTo;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.properties.HasName;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

/**
 * La fitness function tambien se prueba (bitacora E3-2): las dos reglas FF-01c deben filtrar por el DUENO del metodo,
 * no solo por su nombre. Se evaluan contra dos orquestadores de muestra que solo existen en test.
 */
class FF01cReglaTest {

    private static JavaClasses muestra(String paquete) {
        return new ClassFileImporter().importPackages("co.edu.unal.apuntado.architecture.muestras." + paquete);
    }

    @Test
    void elOrquestadorQueSumaPuntosDeUnaAgrupacionOUsaMathInfringeAmbasReglas() {
        JavaClasses infractor = muestra("infractor");
        assertTrue(ReglasArquitecturaTest.ff01c_orquestador_sin_calculo_de_cartas.evaluate(infractor).hasViolation());
        assertTrue(ReglasArquitecturaTest.ff01c_orquestador_sin_algoritmos.evaluate(infractor).hasViolation());
    }

    @Test
    void losMismosNombresEnOtrosDuenosNoSonInfraccion() {
        JavaClasses inocente = muestra("inocente");
        assertFalse(ReglasArquitecturaTest.ff01c_orquestador_sin_calculo_de_cartas.evaluate(inocente).hasViolation());
        assertFalse(ReglasArquitecturaTest.ff01c_orquestador_sin_algoritmos.evaluate(inocente).hasViolation());
    }

    /** Evidencia del defecto E3-2: la forma encadenada pierde el filtro de dueno y acusa al orquestador inocente. */
    @Test
    @SuppressWarnings("static-access")
    void laFormaEncadenadaAnteriorDescartabaElDueno() {
        ArchRule anterior = noClasses().that().haveSimpleName("TurnOrchestratorComponent")
                .should().callMethodWhere(targetOwner(assignableTo(Agrupacion.class))
                        .and(target(HasName.Predicates.nameMatching("puntos"))));
        assertTrue(anterior.evaluate(muestra("inocente")).hasViolation());
    }
}

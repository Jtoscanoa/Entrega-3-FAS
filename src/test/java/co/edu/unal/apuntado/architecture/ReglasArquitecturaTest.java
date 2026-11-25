package co.edu.unal.apuntado.architecture;

import static com.tngtech.archunit.core.domain.JavaAccess.Predicates.targetOwner;
import static com.tngtech.archunit.core.domain.JavaCall.Predicates.target;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.assignableTo;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import co.edu.unal.apuntado.domain.gameplay.auditoria.OrdenMazo;
import co.edu.unal.apuntado.domain.rules.ReglaJuego;
import co.edu.unal.apuntado.domain.rules.modelo.Agrupacion;
import co.edu.unal.apuntado.domain.rules.modelo.Carta;
import co.edu.unal.apuntado.domain.rules.modelo.Combinacion;
import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.Dependency;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaMethodCall;
import com.tngtech.archunit.core.domain.properties.HasName;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;

/**
 * Fitness functions estaticas y atomicas (Tabla 11 del E2). Se ejecutan en cada push (mvn verify).
 * Prefijos segun la guia del E3 (seccion 4.1): prueba1 = aislamiento de los plug-ins de reglas;
 * prueba2 = la entrada (UI y tiempo real) aislada del almacenamiento; prueba3 = sin dependencias ciclicas.
 */
@AnalyzeClasses(packages = "co.edu.unal.apuntado", importOptions = ImportOption.DoNotIncludeTests.class)
class ReglasArquitecturaTest {

    private static final String ORQUESTADOR = "TurnOrchestratorComponent";

    @ArchTest // FF-01: el motor de reglas es Java puro
    static final ArchRule prueba1_ff01_reglas_aisladas = noClasses()
            .that().resideInAPackage("..domain.rules..")
            .should().dependOnClassesThat().resideInAnyPackage("..infrastructure..", "..domain.gameplay..",
                    "..domain.lobby..", "..domain.wager..", "..config..", "org.springframework..", "jakarta..",
                    "java.sql..", "javax.sql..");

    @ArchTest // FF-01b: el nucleo compartido no depende del motor que lo usa
    static final ArchRule prueba1_ff01b_modelo_puro = noClasses()
            .that().resideInAPackage("..domain.rules.modelo..")
            .should().dependOnClassesThat().resideInAnyPackage("..domain.rules.evaluacion..",
                    "..domain.gameplay..", "..infrastructure..", "org.springframework..");

    /**
     * Llamada a un metodo de {@code duenos} cuyo nombre cumple {@code nombres}. Se usa el {@code and} estatico con
     * los dos predicados (bitacora E3-2): escrito como {@code targetOwner(...).and(target(...))}, javac lo resolvia al
     * metodo estatico invocado sobre una instancia y descartaba el filtro de owner.
     */
    static DescribedPredicate<JavaMethodCall> llamadaA(DescribedPredicate<? super JavaClass> duenos, String nombres) {
        return DescribedPredicate.<JavaMethodCall>and(targetOwner(duenos),
                target(HasName.Predicates.nameMatching(nombres)));
    }

    @ArchTest // FF-01c: el orquestador es mediador estricto: no calcula sobre cartas, combinaciones ni agrupaciones
    static final ArchRule ff01c_orquestador_sin_calculo_de_cartas = noClasses()
            .that().haveSimpleName(ORQUESTADOR)
            .should().callMethodWhere(llamadaA(assignableTo(Carta.class).or(assignableTo(Combinacion.class))
                            .or(assignableTo(Agrupacion.class)),
                    "puntos|valor|rango|pinta|compareTo|sumar.*|calcular.*"))
            .because("la evaluacion corresponde a IEvaluadorMano y la puntuacion a ILiquidacion");

    @ArchTest // FF-01c (2): ni algoritmos de evaluacion ni aritmetica de agregacion
    static final ArchRule ff01c_orquestador_sin_algoritmos = noClasses()
            .that().haveSimpleName(ORQUESTADOR)
            .should().dependOnClassesThat().resideInAnyPackage("..domain.rules.evaluacion..")
            .orShould().callMethodWhere(llamadaA(assignableTo(Math.class).or(assignableTo(Integer.class)),
                    "sum|max|min|abs"));

    @ArchTest // FF-02: sin ciclos entre dominios
    static final ArchRule prueba3_ff02a_sin_ciclos_entre_dominios = slices()
            .matching("co.edu.unal.apuntado.domain.(*)..").should().beFreeOfCycles();

    @ArchTest // FF-02: sin ciclos entre las infraestructuras
    static final ArchRule prueba3_ff02b_sin_ciclos_entre_infraestructuras = slices()
            .matching("co.edu.unal.apuntado.infrastructure.(*)..").should().beFreeOfCycles();

    @ArchTest // FF-02c: el contrato domain.rules no depende de sus estrategias (evita el ciclo contrato <-> plug-in)
    static final ArchRule prueba3_ff02c_contrato_sin_ciclo_con_estrategias = noClasses()
            .that().resideInAPackage("co.edu.unal.apuntado.domain.rules")
            .should().dependOnClassesThat().resideInAPackage("..domain.rules.evaluacion..");

    @ArchTest // FF-03: una variante no depende de otra
    static final ArchRule prueba1_ff03_variantes_independientes = classes()
            .that().implement(ReglaJuego.class).should(noDependerDeOtraVariante());

    @ArchTest // FF-05: el orden secreto del mazo solo lo conocen mazo y auditoria
    static final ArchRule ff05_orden_del_mazo = noClasses()
            .that().resideOutsideOfPackages("..gameplay.mazo..", "..gameplay.auditoria..")
            .should().dependOnClassesThat().areAssignableTo(OrdenMazo.class);

    @ArchTest // FF-06: el gateway no contiene reglas
    static final ArchRule prueba2_ff06_gateway_sin_reglas = noClasses()
            .that().resideInAPackage("..infrastructure.realtime..")
            .should().dependOnClassesThat().resideInAnyPackage("..domain.rules.evaluacion..", "..domain.rules.modelo..");

    @ArchTest // FF-07: la entrada (presentacion y tiempo real) no accede a la persistencia
    static final ArchRule prueba2_ff07_entrada_sin_persistencia = noClasses()
            .that().resideInAPackage("..infrastructure.realtime..")
            .should().dependOnClassesThat().resideInAPackage("..infrastructure.persistence..");

    @ArchTest // FF-08b: la persistencia no depende de ningun dominio
    static final ArchRule prueba2_ff08b_persistencia_independiente = noClasses()
            .that().resideInAPackage("..infrastructure.persistence..")
            .should().dependOnClassesThat().resideInAnyPackage("..domain..", "..infrastructure.realtime..");

    @ArchTest // FF-04: entre componentes solo se usan interfaces (ningun *Component conoce a otro *Component concreto)
    static final ArchRule ff04_componentes_solo_por_interfaces = noClasses()
            .that().haveSimpleNameEndingWith("Component")
            .should().dependOnClassesThat().haveSimpleNameEndingWith("Component")
            .orShould().dependOnClassesThat().haveSimpleName("MatchStateRepository");

    private static ArchCondition<JavaClass> noDependerDeOtraVariante() {
        return new ArchCondition<>("no depender de otra variante de ReglaJuego") {
            @Override
            public void check(JavaClass clase, ConditionEvents eventos) {
                for (Dependency d : clase.getDirectDependenciesFromSelf()) {
                    JavaClass destino = d.getTargetClass();
                    boolean otraVariante = !destino.equals(clase) && destino.isAssignableTo(ReglaJuego.class)
                            && !destino.isEquivalentTo(ReglaJuego.class);
                    if (otraVariante) {
                        eventos.add(SimpleConditionEvent.violated(d, clase.getName() + " depende de " + destino.getName()));
                    }
                }
            }
        };
    }
}

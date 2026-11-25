# Métricas finales del MVP (25-nov-2026)

Medidas sobre el `main` final (`d52ae4d`, tras los PR #27 a #31 y #28). Reemplazan a la primera medición del mismo
día, hecha sobre `e5184bb` + `ajustes/s1-b`. Se corrió el 25-nov-2026 a las 12:55 (hora de Colombia) en Windows 11, Java 21.0.13 y
Docker 29.9.3. Solo se anotan cifras medidas; ninguna es una estimación.

Cómo se midió (desde la raíz del repositorio):

```powershell
mvn -B clean verify
java herramientas/Metricas.java src/main/java docs/informe/metricas-paquetes.csv
```

- Pruebas: `target/surefire-reports` y `target/failsafe-reports`.
- Complejidad ciclomática (CC): `herramientas/Metricas.java`, McCabe por método (1 + `if`, `for`, `while`, `do`,
  `case`, `catch`, `?:`, `&&`, `||`) sobre `src/main/java`. El umbral FF-09 lo vigila PMD (`config/pmd/complejidad.xml`).
- Cobertura de ramas: JaCoCo, `target/site/jacoco/jacoco.csv`, agregado por paquete.
- Acoplamiento (Martin, 2003): `herramientas/Metricas.java` a partir de los `import` entre paquetes de
  `co.edu.unal.apuntado`. Cuenta un tipo por archivo (el de nivel superior); los tipos anidados no suman.
- Ley de Deméter: PMD `LawOfDemeter` sobre `domain/**` (`target/pmd-demeter/pmd.xml`), sin romper el build.

## Pruebas

| Suite | Clases de prueba | Pruebas | Fallas | Errores | Omitidas |
|---|---|---|---|---|---|
| Unitarias (Surefire) | 30 | 187 | 0 | 0 | 0 |
| Integración (Failsafe, Testcontainers + PostgreSQL 16) | 3 | 6 | 0 | 0 | 0 |
| **Total** | **33** | **193** | **0** | **0** | **0** |

`mvn -B clean verify`: BUILD SUCCESS. La verificación de JaCoCo (FF-10) dice «All coverage checks have been met» y PMD
(FF-09) no reporta violaciones.

## Complejidad ciclomática (FF-09: CC ≤ 10)

| Medida | Valor |
|---|---|
| Métodos medidos | 333 |
| CC máxima | 7 (`TurnOrchestratorComponent.marcarConexion`) |
| CC media | 1,82 |
| Métodos con CC > 10 | 0 |
| Violaciones de PMD (FF-09) | 0 |
| CC máxima en `domain.rules.evaluacion` | 6 (`BuscadorCombinaciones.explorar`; 48 métodos, media 2,63) |

Por paquete:

| Paquete | Métodos | CC máx. | CC media | Método con la CC máxima |
|---|---|---|---|---|
| (raíz) | 1 | 1 | 1,00 | `ApuntadoApplication.main` |
| config | 18 | 2 | 1,11 | `ComposicionRaiz.ejecutar` |
| domain.gameplay | 88 | 7 | 1,60 | `TurnOrchestratorComponent.marcarConexion` |
| domain.gameplay.auditoria | 8 | 2 | 1,50 | `DealAuditComponent.sellar` |
| domain.gameplay.mazo | 14 | 6 | 2,00 | `DeckManagementComponent.nuevaBaraja` |
| domain.lobby | 11 | 4 | 2,09 | `LobbyPartyComponent.unirse` |
| domain.rules | 22 | 6 | 1,91 | `RoundScoringComponent.determinarFin` |
| domain.rules.evaluacion | 48 | 6 | 2,63 | `BuscadorCombinaciones.explorar` |
| domain.rules.modelo | 41 | 5 | 1,66 | `ConfiguracionReglas.<init>` |
| infrastructure.persistence | 20 | 3 | 1,35 | `MatchStateRepository.guardarPartida` |
| infrastructure.realtime | 62 | 6 | 1,89 | `PresenciaJugadores.cerrarSesion` |

Si hay empates en la CC máxima de un paquete, la tabla nombra uno solo de los métodos empatados.

## Cobertura de ramas (FF-10: ≥ 95 % en `domain.rules*`)

| Paquete | Ramas cubiertas | Cobertura de ramas | Líneas cubiertas |
|---|---|---|---|
| domain.rules | 47 / 47 | 100,0 % | 87 / 87 (100,0 %) |
| domain.rules.evaluacion | 175 / 176 | 99,4 % | 248 / 248 (100,0 %) |
| domain.rules.modelo | 80 / 80 | 100,0 % | 127 / 128 (99,2 %) |

La rama sin cubrir de `domain.rules.evaluacion` es `ternasQuedan == 0` en `BuscadorCombinaciones` (línea 210), la que la bitácora explica como inalcanzable (E3-10, entonces en la línea 184).

Resto de paquetes, como referencia (FF-10 no los cubre):

| Paquete | Ramas | Cobertura de ramas |
|---|---|---|
| domain.gameplay | 93 / 112 | 83,0 % |
| domain.gameplay.mazo | 27 / 28 | 96,4 % |
| domain.gameplay.auditoria | 4 / 8 | 50,0 % |
| domain.lobby | 22 / 24 | 91,7 % |
| infrastructure.persistence | 11 / 14 | 78,6 % |
| infrastructure.realtime | 82 / 102 | 80,4 % |
| config | 1 / 2 | 50,0 % |

## Acoplamiento: Ca, Ce, I, A y D

Estas son las cifras completas de [`metricas-paquetes.csv`](metricas-paquetes.csv). I = Ce / (Ca + Ce),
A = tipos abstractos / tipos y D = |A + I − 1|. «Componente» es el dominio de ADR-01: agrupa los paquetes por sus dos
primeros segmentos (por ejemplo, `domain.rules` reúne `domain.rules`, `domain.rules.evaluacion` y `domain.rules.modelo`).

Por paquete:

| Paquete | Tipos | Abstractos | Ca | Ce | I | A | D |
|---|---|---|---|---|---|---|---|
| (raíz) | 1 | 0 | 0 | 0 | 0,00 | 0,00 | 1,00 |
| config | 3 | 0 | 0 | 6 | 1,00 | 0,00 | 0,00 |
| domain.gameplay | 15 | 6 | 3 | 5 | 0,63 | 0,40 | 0,02 |
| domain.gameplay.auditoria | 4 | 1 | 3 | 0 | 0,00 | 0,25 | 0,75 |
| domain.gameplay.mazo | 4 | 1 | 2 | 2 | 0,50 | 0,25 | 0,25 |
| domain.lobby | 5 | 1 | 2 | 3 | 0,60 | 0,20 | 0,20 |
| domain.rules | 8 | 4 | 4 | 1 | 0,20 | 0,50 | 0,30 |
| domain.rules.evaluacion | 5 | 0 | 0 | 2 | 1,00 | 0,00 | 0,00 |
| domain.rules.modelo | 14 | 0 | 5 | 0 | 0,00 | 0,00 | 1,00 |
| infrastructure.persistence | 4 | 1 | 2 | 0 | 0,00 | 0,25 | 0,75 |
| infrastructure.realtime | 12 | 0 | 0 | 2 | 1,00 | 0,00 | 0,00 |

Por componente:

| Componente | Tipos | Abstractos | Ca | Ce | I | A | D |
|---|---|---|---|---|---|---|---|
| (raíz) | 1 | 0 | 0 | 0 | 0,00 | 0,00 | 1,00 |
| config | 3 | 0 | 0 | 4 | 1,00 | 0,00 | 0,00 |
| domain.gameplay | 23 | 8 | 3 | 2 | 0,40 | 0,35 | 0,25 |
| domain.lobby | 5 | 1 | 2 | 2 | 0,50 | 0,20 | 0,30 |
| domain.rules | 27 | 4 | 3 | 0 | 0,00 | 0,15 | 0,85 |
| infrastructure.persistence | 4 | 1 | 2 | 0 | 0,00 | 0,25 | 0,75 |
| infrastructure.realtime | 12 | 0 | 0 | 2 | 1,00 | 0,00 | 0,00 |

Ciclos entre paquetes: ninguno. Las comprobaciones de la herramienta sobre los `import` (equivalentes a FF-01, FF-01b,
FF-05, FF-06, FF-07 y FF-08b) dan OK. Al medir se corrigió un falso positivo de FF-05 en Windows: la herramienta
comparaba rutas con `/`.

## Ley de Deméter (`domain/**`)

| Paquete | Violaciones |
|---|---|
| domain.gameplay | 34 (`TurnOrchestratorComponent`) |
| domain.gameplay.mazo | 14 (`DeckManagementComponent`) |
| domain.lobby | 13 (`LobbyPartyComponent`) |
| domain.rules.evaluacion | 1 (`BuscadorCombinaciones`) |
| domain.gameplay.auditoria | 0 |
| domain.rules | 0 |
| domain.rules.modelo | 0 |
| **Total** | **62** (en 4 archivos) |

Es una medición y no una barrera: la regla de PMD también marca cadenas inocuas sobre records y streams
(`config/pmd/demeter.xml`). Las 62 violaciones no se revisaron una por una.

# ADR-05b: Recuperación tras una caída del servidor (enmienda del ADR-05)

## Estado

Propuesto (25-nov-2026). Enmienda: [ADR-05](./ADR-05-persistencia-postgresql.md). Bitácora: E3-16.

## Contexto

- El ADR-05 deja el estado vivo de cada mesa en memoria y escribe en la base solo al iniciar y al liquidar cada ronda. Aceptó que una caída a mitad de ronda la anulara (R3), pero no dijo qué pasa con lo que queda en la base ni qué ve el jugador.
- Tras un reinicio quedaban rondas `EN_CURSO` huérfanas: ninguna partida en memoria podía liquidarlas y la SPA, al reanudar, recibía `PARTIDA_INEXISTENTE` y mostraba un error sin salida (retroalimentación del E2, 2.3).
- La ronda no se puede reconstruir desde la base: el orden del mazo no se persiste antes de revelarse (ADR-03, ADR-05) y las manos viven solo en memoria. Repartir de nuevo rompería el commit-reveal de la ronda anunciada.
- D9: si la liquidación se confirmaba pero fallaba el registro de la ronda siguiente (`registrarInicioRonda`), el cliente recibía un error por un cierre que sí había quedado guardado, y la partida se quedaba sin ronda.

## Decisión

1. **Estados explícitos en la base** (migración Flyway V4): la ronda admite `ANULADA` (con `anulada_en`, coherente por `CHECK`) y la partida admite `INTERRUMPIDA`. `LIQUIDADA` y sus puntajes no se tocan.
2. **Al arrancar** (`ApplicationReadyEvent`), `RecuperacionTrasCaida` llama a `IMatchState.anularPartidasEnCurso()`: en **una** transacción, las rondas `EN_CURSO` pasan a `ANULADA` y sus partidas a `INTERRUMPIDA`. El resultado queda en el logger `auditoria` como `{"tipo":"RECUPERACION", rondasAnuladas, partidasInterrumpidas}`.
3. **La SPA explica lo que pasó**: si al reanudar la partida ya no está en memoria (`PARTIDA_INEXISTENTE`), vuelve al vestíbulo con el aviso de `mensajes.ts` en las dos pieles: la ronda en curso se anuló y los puntos de las rondas liquidadas quedaron guardados.
4. **D9**: un fallo al abrir la ronda siguiente ya no se propaga al cierre confirmado. La partida queda `ENTRE_RONDAS`, se publica `RondaPendiente` y el comando idempotente `reanudarRonda` (`/app/partidas/{id}/reanudar`) la abre sin saltarse al abridor.
5. La liquidación sigue siendo el `UPDATE ... WHERE estado = 'EN_CURSO'` que debe afectar exactamente 1 fila: una ronda anulada ya no se puede liquidar.

### Alternativas descartadas

- **Persistir el estado vivo (manos, mazo, turno) en cada jugada** para reanudar la ronda. Es la opción (e) que el ADR-05 ya descartó: una escritura por comando y el orden del mazo en la base antes de revelarlo (ADR-03).
- **Volver a repartir la ronda interrumpida con un mazo nuevo.** Cambia la huella que la mesa ya vio y deja a los jugadores sin forma de verificar el reparto (RF18).
- **Borrar las rondas `EN_CURSO`.** Pierde la huella publicada y el rastro de auditoría; `ANULADA` conserva ambos.
- **Dejar la recuperación a un operador.** Con despliegue continuo (ADR-09b) cada merge reinicia el servidor: tiene que ser automática.

## Consecuencias

- Un reinicio deja la base coherente: ninguna ronda queda `EN_CURSO` sin dueño, y el historial liquidado (RF13) se conserva.
- El jugador entiende qué pasó en vez de ver un error genérico.
- *Trade-off*: la ronda en curso se pierde (sigue valiendo R3 del ADR-05; las fichas son virtuales, RD3). Las partidas interrumpidas no se reanudan.
- *Trade-off*: un merge a main durante una sesión con usuarios interrumpe las mesas abiertas; por eso no se fusiona mientras haya pruebas en curso.

## Cumplimiento (Compliance)

- `RecuperacionTrasCaidaIT` (Testcontainers, PostgreSQL 16): ronda 1 liquidada, ronda 2 en curso y contexto nuevo → ronda 2 `ANULADA`, partida `INTERRUMPIDA` y puntajes de la ronda 1 idénticos.
- `ReaperturaRondaTest` (7): D9, `RondaPendiente` y `reanudarRonda` idempotente.
- FF-16 (`LiquidacionTransaccionalIT`) y FF-17 siguen en verde.

## Notas

- Autor: Jose Mauricio Toscano Aguas. Fecha: 25 de noviembre de 2026. Pendiente de revisión del equipo.
- ADR relacionados: [ADR-03](./ADR-03-reparto-verificable-commit-reveal.md), [ADR-05](./ADR-05-persistencia-postgresql.md), [ADR-06](./ADR-06-sincronizacion-stomp.md), [ADR-09b](./ADR-09b-despliegue-aws.md).

# ADR-08: Temporizador

## Estado

Accepted (Aceptado). Enmiendas: [ADR-08b](./ADR-08b-presencia-y-turno-ausente.md) (presencia y turno del ausente); aclaración del 25-nov-2026 sobre BotEngine (bitácora E3-15).

## Contexto

- Una partida, un hilo lógico: un candado por partida (`ReentrantLock`) serializa comandos, temporizador y bots (los bots quedan para la Fase 2, ver E3-15); las partidas no comparten estado mutable, así que corren en paralelo sin contención. (E2, §6.2)
- Temporizador: el planificador (`TaskScheduler` en el E3) dispara `vencerTurno(partida, numeroTurno)` con el mismo candado. (E2, §6.2)
- Corte de red de un jugador (30 s) en pleno turno: `desconectar(token)` retira el canal; la mesa sigue en memoria. (E2, Figura 11)

## Decisión

La hora límite la fija el servidor; al vencer, `vencerTurno(numeroTurno)` roba del mazo y descarta la carta que propone BotEngine; nunca cierra por el jugador; un vencimiento viejo se ignora.

**Aclaración (25-nov-2026, bitácora E3-15).** En el MVP no existe BotEngine: el componente y WagerAndEconomy pasan a la Fase 2, sin stubs. La jugada por defecto descarta la carta recién robada (o la última de la mano si el turno empezó sin robo, como el del abridor). La decisión no cambia: el servidor juega por el ausente con una regla fija y nunca cierra por él.

### Alternativas descartadas

- Temporizador en el cliente (manipulable).
- Saltar el turno (rompe el invariante robar-descartar).

## Consecuencias

- Si el turno ya cambió, el vencimiento no hace nada. (E2, §6.2)
- Los bots juegan a lo sumo una vuelta por comando, así que nunca retienen el candado indefinidamente. (E2, §6.2; Fase 2, E3-15)
- Si vence el turno de un jugador desconectado: jugada por defecto. (E2, Figura 11)
- Un comando con un número de turno viejo se rechaza sin efectos. (E2, Figura 11)

## Cumplimiento (Compliance)

FF-17: `elTemporizadorObsoletoNoTieneEfecto`.

## Notas

- Autor: Jose Mauricio Toscano Aguas. Fecha de aprobación: octubre de 2026. Revisores: Juan Pablo Mazo Berrío, Jose Mauricio Toscano Aguas, Duvan Steven Calderón Taborda (consenso unánime, 3 de 3).
- Fuente: Entregable 2, Tabla 8 (resumen); contexto y consecuencias tomados de §6.2 y la Figura 11.
- ADR relacionados: [ADR-06](./ADR-06-sincronizacion-stomp.md) (candado por partida, `numeroTurno` y hora límite en `TurnoAsignado`).

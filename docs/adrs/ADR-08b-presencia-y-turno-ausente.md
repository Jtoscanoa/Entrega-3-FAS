# ADR-08b: Presencia y temporizador corto para jugadores ausentes (enmienda del ADR-08)

## Estado

Propuesto (24-nov-2026). Enmienda: [ADR-08](./ADR-08-temporizador.md).

## Contexto

- RF17 pide mostrar a la mesa quién está conectado. Hasta ahora la mesa solo sabía de la conexión propia: si un rival cerraba la pestaña o perdía la red, los demás no lo veían.
- Con el ADR-08, el turno de un jugador desconectado se jugaba por defecto, pero solo al cumplirse el plazo completo de la sala (30 a 60 s). Con varios ausentes, la mesa quedaba esperando minutos a nadie.
- Si todos los jugadores se van, el temporizador seguía jugando turnos por defecto sin que nadie mirara.
- Un mismo jugador puede tener varias pestañas, y una reconexión STOMP abre una sesión nueva antes de que el servidor detecte la caída de la anterior (latidos de 10 s, ADR-06).

## Decisión

1. **Presencia en `infrastructure.realtime`** (`PresenciaJugadores`, sin reglas ni persistencia, FF-06 y FF-07). Escucha `SessionSubscribeEvent` sobre `/topic/partidas/{id}` y `SessionDisconnectEvent`, y cuenta las sesiones abiertas por partida y jugador (`sub`). Un jugador queda conectado con su primera sesión y desconectado al cerrar la última. Cada cambio:
   - se audita en el logger `auditoria` (`{"tipo":"PRESENCIA", ...}`);
   - se publica a la mesa como `{tipo:"Presencia", datos:{partidaId, jugadorId, conectado}}`;
   - se avisa al dominio con `ITurno.marcarConexion(partidaId, jugadorId, conectado)`.
2. **Plazo del turno** (`PlazoTurno`, función pura; el orquestador sigue siendo mediador, FF-01c):
   - jugador conectado: inicio del turno + `segundosPorTurno`;
   - jugador ausente: lo que llegue antes entre ahora + `segundosTurnoAusente` (configurable, `apuntado.turno.segundos-ausente`, 10 s por defecto) y el límite normal. Desconectarse nunca alarga el turno;
   - si se desconecta en su turno, se reprograma con el plazo corto; si vuelve antes, recupera el límite normal (no uno nuevo: desconectarse y volver no regala tiempo);
   - mesa vacía (ningún jugador conectado): no se programa ningún vencimiento (`venceEn` null) hasta que vuelva alguien; al reanudar, el turno empieza de nuevo.
3. **Cada programación tiene una generación.** El vencimiento programado solo actúa si su generación sigue vigente. Hace falta porque un turno reprogramado conserva su `numeroTurno`: el FF-17 (`numeroTurno` viejo) no alcanza para descartar el aviso anterior.
4. **Cuando el plazo cambia a mitad de turno se vuelve a publicar `TurnoAsignado`** con el mismo `numeroTurno` y el `venceEn` nuevo, para que el reloj de la SPA se ajuste. `VistaPartida` agrega `conectados`.
5. **Al iniciar la partida se presume que todos están conectados.** El primer turno se asigna antes de que los clientes se suscriban; sin esta presunción el abridor tendría 10 s y la mesa arrancaría en pausa.

Sigue valiendo el ADR-08: al vencer, el servidor roba del mazo y descarta; nunca cierra por el jugador.

### Alternativas descartadas

- **Saltar el turno del ausente.** Rompe el invariante robar-descartar (ya descartada en el ADR-08).
- **Plazo corto desde la primera ausencia sin presunción inicial.** El primer turno de cada partida se jugaría solo.
- **Presencia por latidos en el dominio.** Mete infraestructura en el dominio; los eventos de sesión de Spring ya traen la información.
- **Comparar solo la hora límite al vencer.** Funciona, pero la generación expresa la intención ("esta programación ya no vale") y se prueba sin relojes.

## Consecuencias

- La mesa avanza en unos 10 s por cada ausente en vez de 30 a 60 s, y nadie juega por los demás mientras la mesa está vacía.
- Los clientes ven quién está sin conexión y por qué el turno va a jugarse solo.
- *Trade-off*: un jugador con una red inestable puede quedar marcado como ausente durante unos segundos y perder parte de su turno. Lo amortiguan dos cosas: el límite normal se restaura al volver, y una pestaña nueva cuenta antes de que caiga la vieja.
- *Trade-off*: un jugador que nunca llega a abrir la mesa sigue contando como presente (presunción inicial) hasta su primera desconexión; su turno usa el límite normal.
- La presencia vive en memoria, como la partida: un reinicio del servidor la pierde junto con la mesa (ADR-05, ADR-06).

## Cumplimiento (Compliance)

- `PresenciaTest`: varias pestañas del mismo jugador, desconexión de la última, evento publicado y auditado.
- `TurnosTest`: turno de ausente vence a los 10 s; reconexión restaura el límite y el aviso reprogramado no actúa; mesa vacía no programa vencimientos y se reanuda al volver alguien; presencia ajena no reprograma.
- FF-17 (`elTemporizadorObsoletoNoTieneEfecto...`) sigue en verde.
- FF-01c, FF-06 y FF-07 (ArchUnit) siguen en verde.

## Notas

- Autor: Jose Mauricio Toscano Aguas. Fecha: 24 de noviembre de 2026. Pendiente de revisión del equipo.
- ADR relacionados: [ADR-06](./ADR-06-sincronizacion-stomp.md) (STOMP, latidos, `TurnoAsignado`), [ADR-08](./ADR-08-temporizador.md).

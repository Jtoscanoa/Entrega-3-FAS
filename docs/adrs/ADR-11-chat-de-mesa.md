# ADR-11: Chat en vivo de la mesa

## Estado

Propuesto (25-nov-2026). Bitácora: E3-18.

## Contexto

- El chat **no está en el E1 ni en el E2**: ningún requisito funcional ni escenario de calidad lo pide. Es una deriva del E3: se agregó el 24-nov-2026 (fusionado a las 13:54), antes de la sesión S1 con usuarios (19:05), y se registra aquí para que no quede como cambio implícito. En S1 se usó 9 veces y los usuarios lo valoraron en un comentario verbal.
- La mesa no tenía forma de conversar entre jugadores remotos.
- Cualquier texto que el servidor reenvía es una superficie de abuso: mensajes en ráfaga, caracteres de control, textos muy largos, contenido que no debe quedar en los registros.
- El dominio no debe aprender de chat: el orquestador es mediador estricto (FF-01c) y las reglas no conocen la red (FF-06). Tampoco hay persistencia para esto (FF-07).

## Decisión

1. **Adaptador en `infrastructure.realtime`** (`ChatMesa`): recibe `/app/partidas/{id}/chat` y difunde a la mesa como `{tipo:"Chat", datos}` (sobre de ADR-06). El dominio solo aporta `ITurno#participa` para saber si quien escribe tiene asiento.
2. **Límites en el servidor**: sin caracteres de control ni espacios repetidos; de 1 a 200 caracteres; como máximo 5 mensajes cada 10 s por jugador (`LimiteFrecuencia`). Los rechazos llegan al autor por la cola de errores (`CHAT_VACIO`, `CHAT_LARGO`, `CHAT_MUY_RAPIDO`, `CHAT_SIN_ASIENTO`).
3. **Sin persistencia ni historial**: el chat vive mientras la mesa está abierta. La SPA guarda los últimos 60 mensajes en memoria.
4. **La auditoría guarda solo quién escribió y la longitud** (`{"tipo":"CHAT", jugador, largo}` en el logger `auditoria`), nunca el contenido. El log de auditoría es la fuente de las métricas de validación (`scripts/resumen_auditoria.py`) y no debe contener texto libre de los participantes.
5. **Las dos pieles lo muestran** con lo que entrega `useMesa()` (FF-19): botón con contador y panel en la animada; en la ligera, sección del lateral en escritorio y hoja con contador en el teléfono.

### Alternativas descartadas

- **No tener chat** (lo que dice el E2). La mesa no tenía cómo conversar a distancia.
- **Guardar los mensajes en la base.** Requiere tabla, retención y moderación; no lo pide ningún requisito.
- **Auditar el contenido.** Mete datos personales en el log que se usa como evidencia del informe.
- **Chat como parte del dominio de la partida.** Rompe FF-06 y FF-07 sin ganar nada: no afecta las reglas.

## Consecuencias

- La mesa puede conversar sin tocar dominio, reglas ni persistencia.
- El log de auditoría sigue sirviendo para métricas sin datos personales: se puede contar la actividad del chat, no leerla.
- *Trade-off*: quien recarga la página pierde los mensajes anteriores (no hay historial).
- *Trade-off*: más tráfico STOMP por mesa; el límite de frecuencia lo acota.

## Cumplimiento (Compliance)

- `ChatMesaTest` (4): asiento obligatorio, limpieza y largo, límite de frecuencia, auditoría sin contenido.
- FF-06, FF-07 y FF-01c (ArchUnit) siguen en verde; FF-19 (dependency-cruiser) en las dos pieles.

## Notas

- Autor: Jose Mauricio Toscano Aguas. Fecha: 25 de noviembre de 2026. Pendiente de revisión del equipo.
- ADR relacionados: [ADR-06](./ADR-06-sincronizacion-stomp.md) (sobre `{tipo, datos}`), [ADR-10](./ADR-10-dos-presentaciones.md) (dos pieles).

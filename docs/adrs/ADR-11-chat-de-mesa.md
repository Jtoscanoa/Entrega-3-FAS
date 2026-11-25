# ADR-11: Capa social de la mesa (chat en vivo, reacciones, sonidos y avatares propios)

## Estado

Propuesto (25-nov-2026). Bitácora: E3-18 (chat) y E3-22 (Bloque B: reacciones, sonidos y avatares).

## Contexto

- Esta capa social **no está en el E1 ni en el E2**: ningún requisito funcional ni escenario de calidad la pide. El chat se agregó el 24-nov-2026 (fusionado a las 13:54), antes de la sesión S1 con usuarios (19:05); en S1 se usó 9 veces y recibió valoración verbal positiva. Después de S1 se sugirió ampliar la interacción de la mesa con reacciones hacia otros jugadores, efectos de sonido y avatares locales propios.
- La mesa no tenía forma de conversar, celebrar o bromear a distancia ni de personalizar su identidad visual.
- Cualquier mensaje o gesto que el servidor reenvía es una superficie de abuso: ráfagas, caracteres de control, textos largos o suplantación de identidad/asientos. Al ser un entregable académico desplegado en internet público, los avatares tampoco pueden reproducir personajes con derechos de autor ni personas reales.
- El dominio no debe aprender de lo social: el orquestador es mediador estricto (FF-01c) y las reglas no conocen la red (FF-06). Tampoco hay persistencia para esto (FF-07).

## Decisión

1. **Chat en `infrastructure.realtime` (`ChatMesa`):** recibe `/app/partidas/{id}/chat` y difunde a la mesa como `{tipo:"Chat", datos}` (sobre de ADR-06). El dominio solo aporta `ITurno#participa` para saber si quien escribe tiene asiento.
   - Límites en el servidor: sin caracteres de control ni espacios repetidos; de 1 a 200 caracteres; como máximo 5 mensajes cada 10 s por jugador (`LimiteFrecuencia`). Los rechazos llegan al autor por `/user/queue/errores` (`CHAT_VACIO`, `CHAT_LARGO`, `CHAT_MUY_RAPIDO`, `CHAT_SIN_ASIENTO`).
   - Sin persistencia ni historial: la SPA guarda los últimos 60 mensajes en memoria.
   - La auditoría guarda solo quién escribió y la longitud (`{"tipo":"CHAT", jugador, largo}` en `auditoria`), nunca el contenido.
   - Las dos pieles lo muestran con lo que entrega `useMesa()` (FF-19): botón con contador y panel en la animada; sección lateral en escritorio y hoja con contador en la ligera.
2. **Reacciones rápidas en `infrastructure.realtime` (`ReaccionesMesa`):** recibe `/app/partidas/{id}/reaccion` con `{para, tipo}` (catálogo cerrado: `tomate`, `burro`, `aplauso`, `risa`), exige que tanto el emisor como el destinatario tengan asiento (`ITurno#participa`), limita a **1 reacción cada 3 s por jugador** (`LimiteFrecuencia`; motivos `REACCION_INVALIDA`, `REACCION_DESTINO_INVALIDO`, `REACCION_SIN_ASIENTO`, `REACCION_MUY_RAPIDA`) y difunde `{tipo:"Reaccion", datos}` a `/topic/partidas/{id}`. La auditoría registra únicamente `{"tipo":"REACCION", partidaId, jugador, reaccion}`, sin destinatario ni texto libre. La piel animada lanza la reacción hacia el asiento destino; la ligera muestra solo un emoji temporal.
3. **Efectos de sonido cortos libres de derechos (CC0):** seis archivos WAV sintetizados desde cero (`robar`, `descartar`, `rechazo`, `turno`, `reaccion`, `liquidacion`) en `frontend/public/sonidos/` (bajo `CC0 1.0 Universal`), disparados desde `src/sonidos.ts` con interruptor de silencio guardado en `preferencias.ts`. En la piel ligera vienen desactivados por defecto (carga perezosa: no descarga archivos de audio mientras esté silenciado).
4. **Avatares vectoriales originales en SVG (`AvataresSvg.tsx` y `LobbyController`):** cinco personajes propios de caricatura cotidiana (`tendero`, `tia`, `taxista`, `abuela`, `galan`), elegidos por el jugador en el vestíbulo de ambas pieles (`localStorage`) y enviados al crear o unirse a una sala (`/api/salas`, campo opcional `avatar`). `LobbyController` valida el catálogo cerrado (`AVATAR_INVALIDO`) y expone el mapa en memoria dentro de `GET /api/salas/{codigo}`, sin tocar `ILobby`, dominio ni persistencia.

### Alternativas descartadas

- **No tener chat ni reacciones** (lo que dice el E2). La mesa no tenía interacción social a distancia.
- **Guardar chat, reacciones o avatares en la base.** Requiere tablas, migraciones y moderación; no lo pide ningún requisito y rompe el alcance de FF-07.
- **Auditar el contenido del chat o el destinatario completo como texto libre.** Mete datos innecesarios en el log que sirve de evidencia del informe.
- **Poner chat, reacciones o avatares dentro del dominio de la partida.** Rompe FF-06 y FF-07 sin ganar nada: no afecta las reglas.
- **Caricaturas de personajes de televisión protegidos o personas reales.** Aunque se exageren rasgos en caricatura, siguen siendo obras protegidas por derechos de autor o identidad de terceros en una aplicación pública en internet; se reemplazaron por cinco personajes propios inspirados en tipos cotidianos.
- **Activar sonido por defecto también en la piel ligera.** La piel ligera está pensada para teléfonos de pocos recursos y ahorro de datos (ADR-10); por eso inicia silenciada.

## Consecuencias

- La mesa conversa, reacciona con humor, da retroalimentación sonora opcional y muestra avatares propios sin tocar dominio, reglas ni persistencia.
- El log de auditoría sigue sirviendo para métricas sin contenido privado: se cuenta la actividad social (`CHAT` con largo, `REACCION` con tipo).
- *Trade-off*: quien recarga la página pierde mensajes y reacciones anteriores (sin persistencia); los avatares viven en memoria de `LobbyController` mientras dura el proceso.
- *Trade-off*: más tráfico STOMP por mesa; `LimiteFrecuencia` acota tanto ráfagas de chat (5 / 10 s) como de reacciones (1 / 3 s).

## Cumplimiento (Compliance)

- `ChatMesaTest` (4): asiento obligatorio, limpieza y largo, límite de frecuencia, auditoría sin contenido.
- `ReaccionesMesaTest` (3): difusión a la mesa con auditoría solo del tipo, límite de 1 cada 3 s por jugador, rechazo de tipos/asientos/partidas inválidas.
- `LobbyAvataresTest` (3): exposición de avatares en la sala, compatibilidad sin cuerpo y rechazo de avatares fuera del catálogo.
- FF-06, FF-07, FF-08 y FF-01c (ArchUnit) y FF-09 (PMD) en verde; FF-19 (`dependency-cruiser`) y `tsc -b && vite build` en ambas pieles en verde.

## Notas

- Autor: Jose Mauricio Toscano Aguas. Fecha: 25 de noviembre de 2026. Pendiente de revisión del equipo.
- ADR relacionados: [ADR-06](./ADR-06-sincronizacion-stomp.md) (sobre `{tipo, datos}`), [ADR-10](./ADR-10-dos-presentaciones.md) (dos pieles).

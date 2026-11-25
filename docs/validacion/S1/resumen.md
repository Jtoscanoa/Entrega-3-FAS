# Sesión S1 de validación con usuarios — 24-nov-2026

- **Participantes:** 3 usuarios ajenos al equipo (U01, U02, U03), cada uno desde su propio dispositivo, contra la instancia de producción (https://mesa101.duckdns.org).
- **Horario:** 19:05–19:35 (hora de Colombia). La actividad registrada en el servidor va de 19:14:45 a 19:36:52.
- **Fuente:** log de auditoría del contenedor `app` (353 líneas, logger `auditoria`), anonimizado en [`auditoria-anonima.jsonl`](auditoria-anonima.jsonl). El log original con los apodos no se versiona.
- **Cuestionario:** SUS + 3 ítems de 1 a 5 + 2 preguntas abiertas (Google Forms), respondido por los 3 al terminar; anonimizado en [`../sus.csv`](../sus.csv).
- Por tiempo, las dos partidas se dejaron a la mitad, de común acuerdo.

## Partidas

| Partida | Modalidad | Inicio–fin (hora de Colombia) | Tiempo de turno | Turnos asignados | Liquidaciones |
| --- | --- | --- | --- | --- | --- |
| 6 | Apuntado a 101 | 19:14:45–19:24:23 | 60 s | 24 | 0 |
| 7 | Clásica 4-3-3 | 19:25:02–19:36:52 | 35 s | 33 | 0 |

Ninguna de las dos partidas llegó a liquidar una ronda. La 6 terminó cuando los tres jugadores salieron (19:24:23). En la 7, desde las 19:29 la mayoría de los turnos vencieron sin acción y los jugadores fueron saliendo.

## Métricas por usuario

Para el tiempo por turno se cuentan solo los turnos que el jugador completó él mismo: desde `TurnoAsignado` hasta su comando `DESCARTAR`.

| Usuario | Turnos completados | Tiempo medio (mediana) | Rango | Turnos vencidos | Robos mazo / pozo | Intentos de cierre | Cierres válidos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| U01 | 12 | 20,7 s (18,7 s) | 7,3–45,0 s | 7 | 6 / 5 | 8 | 0 |
| U02 | 11 | 25,4 s (25,6 s) | 9,9–46,7 s | 7 | 8 / 3 | 1 | 0 |
| U03 | 12 | 22,4 s (21,0 s) | 9,2–39,8 s | 6 | 11 / 2 | 3 | 0 |
| **Total** | **35** | **22,7 s (22,6 s)** | | **20** | **25 / 10** | **12** | **0** |

De los 20 turnos vencidos, 9 eran de un jugador ausente, que vence a los 10 s (RF17, ADR-08b). De los otros 11, 10 vencieron al cumplirse los 35 s con el jugador conectado, y 1 cuando su jugador se acababa de desconectar (19:30:46) y aún no figuraba como ausente.

## Corrección de los rechazos

Se reconstruyó la mano de cada jugador en cada intento de cierre a partir de los eventos `ManoEntregada`, `CartaRecibida` y `CartaDescartada`. Cada mano se volvió a evaluar con el motor real (`BuscadorCombinaciones`), probando cada carta posible como descarte y las dos modalidades.

- **Los 12 rechazos fueron correctos.** Ninguna de esas manos cumplía Apuntado (3 ternas y sobrante < 5) ni Clásica (cuarta + 2 ternas). No hubo falsos rechazos.
- En los intentos de cierre, la mano con más ternas tenía 2; las demás, 0 o 1.
- En toda la sesión hubo **un solo momento con una mano cerrable**: U02 en la partida 7 a las 19:35:08. U02 estaba desconectado y el turno se jugó solo.
- U02 tuvo 3 ternas formadas varias veces, con sobrantes de 6, 7, 9 y 10 puntos (inválidos) y una vez de exactamente 5 (inválido, el caso borde de la guía). Ninguna de esas veces intentó cerrar.

## Cuestionario (SUS y satisfacción)

| Usuario | SUS | Satisfacción general | Respuesta rápida | Entendió los puntos | Lo más confuso | Qué cambiaría primero |
| --- | --- | --- | --- | --- | --- | --- |
| U01 | 87,5 | 5 | 5 | 5 | «nada» | El orden de las cartas |
| U02 | 87,5 | 4 | 5 | 5 | Al principio no sabía cómo se jugaba | Más guías en la interfaz |
| U03 | 97,5 | 5 | 5 | 3 | Algunas cartas no distinguen el número de símbolos del símbolo de la esquina | — |

SUS del grupo: media 90,8 y mediana 87,5 (rango 87,5–97,5). Con tres usuarios, la cifra es indicativa y no estadística. El ítem «entendió los puntos» se lee con cautela, porque ninguna ronda llegó a liquidarse.

## Hallazgos para el §3.3 y el §3.4

1. **El motivo de rechazo no orienta al jugador.** Los 12 rechazos mostraron el mismo texto genérico («Las cartas no forman la estructura que exige la modalidad.»). U01 repitió el cierre con la misma mano 3 veces en 11 s y luego 4 veces en 7 s. El mensaje no le decía qué le faltaba (tenía 2 ternas de 3).
2. **Los jugadores no reconocen cuándo están cerca de cerrar.** U02 tuvo 3 ternas formadas varias veces y nunca intentó cerrar.
3. **Tiempo de turno.** Con 35 s vencieron 10 turnos con el jugador conectado. La mediana de un turno completo fue 22,6 s y el máximo 46,7 s, más que esos 35 s.
4. **Legibilidad de las cartas** (U03) y **orden de la mano** (U01), además de la falta de guías al empezar (U02).
5. **Presencia y pausa funcionaron como se diseñó.** Las desconexiones y reconexiones de U02 entre 19:23:37 y 19:23:55 quedaron registradas. El turno de un ausente venció a los 10 s, y con la mesa vacía no se programó ningún vencimiento (`venceEn: null`) en las dos partidas.

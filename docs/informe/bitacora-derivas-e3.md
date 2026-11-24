# Bitácora de derivas y decisiones del E3 (insumo para el §5.1 y §5.2)

Registro de lo que cambió respecto al diseño del E2 mientras se implementaba el MVP, con su causa y su evidencia.

| # | Fecha | Qué cambió | Por qué | Evidencia | Ley / ADR |
|---|---|---|---|---|---|
| E3-1 | 23-nov | OIDC + PKCE reemplazado por token de invitado (JWT HS256 propio) | Plazo del E3 y fricción para usuarios de prueba; fichas virtuales (RD3) | `TokenInvitadoTest`, `AutenticacionStompTest` (FF-18 se mantiene) | ADR-07b; 1.ª ley (simplicidad de acceso vs. identidad verificable) |
| E3-2 | 23-nov | La regla ArchUnit FF-01c comprobaba **más** de lo que decía: `DescribedPredicate.and(...)` se resolvió al método estático y descartó el filtro por `Carta`/`Combinacion`; prohibía `puntos()` sobre cualquier clase | Defecto de la propia fitness function, invisible hasta ejecutarla contra el código real | `javap` muestra `invokestatic DescribedPredicate.and`; falla en `TurnOrchestratorComponent` al leer `Agrupacion.puntos()` | Se corrigió el **código**, no la regla: `SolicitudLiquidacion` recibe las agrupaciones y `RoundScoringComponent` extrae los puntos. El orquestador queda más estricto que en el E2. Pendiente: reescribir la expresión de FF-01c con su enmienda |
| E3-3 | 23-nov | Testcontainers 1.20.3 → 1.21.4 | Docker Engine 29 exige API ≥ 1.40 | `LiquidacionTransaccionalIT` (3/3) sobre PostgreSQL 16 real | FF-16 |
| E3-4 | 23-nov | `LiquidacionTransaccionalIT` obtiene el repositorio por la interfaz `IMatchState` | `@Transactional` publica un proxy de la interfaz | Build verde | ADR-05 |
| E3-5 | 23-nov | `VistaPartida` incluye fase, modalidad, umbral, robo del pozo y eliminados | La SPA debe reconstruir la mesa al reconectar sin haber visto los eventos (E7) | `vistaDe` en el orquestador | ADR-06, RF17 |
| E3-6 | 23-nov | Mensajes STOMP en sobre `{tipo, datos}` y `setPreservePublishOrder(true)` | La SPA distingue eventos sin inspeccionar campos; orden garantizado por sesión | `SessionGatewayComponent`, `WebSocketConfig` | ADR-06 |
| E3-7 | 23-nov | `GET /api/salas/{codigo}` (estado de sala) | Los invitados necesitan saber cuándo inicia la partida | `LobbyController` | RF01 |
| E3-8 | 23-nov | Tiempo de turno configurable (60 s por defecto en la SPA; el motor trae 30 s) y robo del pozo activado al crear la mesa | Usuarios novatos; el guion de la guía incluye robar del pozo | `OpcionesPartida`, `Sala.tsx` | ADR-08, E1 Configurability |
| E3-9 | 23-nov | Log de auditoría JSON por comando y por evento (logger `auditoria`) | Evidencia y métricas de las pruebas con usuarios (§3.2–3.3) | `scripts/resumen_auditoria.py` | — |
| E3-10 | 23-nov | Rama inalcanzable en `BuscadorCombinaciones:184` (`ternasQuedan == 0` siempre verdadero si `resto == 0`) | Consecuencia aritmética: sueltas = n − 3·ternas | JaCoCo `domain.rules.evaluacion` 129/130 = 99,2 % | FF-10 se cumple |
| E3-11 | 24-nov | La publicación de eventos sale del `SessionGatewayComponent` a `PublicadorEventosStomp` | Al arrancar Spring detectó el ciclo `turnos → sessionGateway → turnos`: el gateway era a la vez entrada (usa `ITurno`) y salida (`IEventosPartida`). Ninguna prueba unitaria lo veía porque el dominio se cablea a mano | Arranque con `docker compose up`; diagrama de clases §1.3 | ADR-06; separa entrada y salida, y deja la costura para un broker externo (escenario de 100.000 jugadores) |
| E3-12 | 24-nov | Despliegue movido de Render (PaaS) a AWS: EC2 con Docker Compose + Caddy y RDS PostgreSQL 16 | Consolidar la infraestructura en la cuenta de AWS del equipo; App Runner se descartó porque no soporta WebSocket | `deploy/aws/`, job *Desplegar en AWS EC2* | ADR-09b; 1.ª ley: control vs. operación |

**Lección para el §5 (2.ª ley y gobernanza):** una fitness function también puede tener defectos. FF-01c pasaba en el E2 sin
haberse ejecutado contra un orquestador real; al ejecutarla, era más amplia de lo que declaraba su comentario. Se
mantuvo la regla y se ajustó el código, lo que dejó al mediador más estricto (Richards y Ford, 2025, cap. 6).

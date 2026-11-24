# Mesa 101 — Apuntado a 101 y Clásica 4-3-3

MVP del **Entregable 3** de *Fundamentos de Arquitectura de Software* (UNAL Medellín, 2026-02).
Equipo **"4 menos 1"**: Juan Pablo Mazo Berrío · Jose Mauricio Toscano Aguas · Duvan Steven Calderón Taborda.

- **Aplicación desplegada:** `[URL de AWS (sslip.io) — completar tras el despliegue]`
- **Estilo:** monolito modular de un solo cuanto; el motor de reglas es un microkernel de compilación (`ReglaJuego` + `RegistroReglas` con ServiceLoader). Ver `docs/adrs/`.
- **Stack:** Java 21, Spring Boot 3.3, PostgreSQL 16 + Flyway, STOMP 1.2 sobre WebSocket; SPA en React + TypeScript (Vite).

## Ejecutar en local (un comando)

Requisito: Docker Desktop.

```bash
docker compose up --build
# abrir http://localhost:8080 en varias ventanas (una por jugador)
```

## Desarrollo

```bash
docker compose up -d db                      # PostgreSQL 16
mvn spring-boot:run                          # servidor en :8080 (Flyway aplica las migraciones)
cd frontend && npm install && npm run dev    # SPA en :5173 con proxy a :8080
```

## Fitness functions y build

```bash
mvn -B verify    # ArchUnit, JUnit (incluye Testcontainers: requiere Docker), PMD (CC <= 10), JaCoCo (>= 95 % ramas en domain.rules)
cd frontend && npm run build
```

El pipeline `.github/workflows/ci.yml` ejecuta lo mismo en cada push y PR. En `main`, si todo pasa, publica la imagen
en ghcr.io y la despliega en AWS EC2 por SSH (secretos `EC2_HOST` y `EC2_SSH_KEY`).

| FF | Qué protege | Dónde |
|---|---|---|
| FF-01, 01b, 01c | Reglas aisladas; núcleo `modelo` puro; orquestador sin cálculo | `ReglasArquitecturaTest` |
| FF-02 | Sin ciclos | `ReglasArquitecturaTest` |
| FF-03 | Variantes independientes entre sí | `ReglasArquitecturaTest` |
| FF-05 | Solo mazo y auditoría conocen el orden del mazo | `ReglasArquitecturaTest` |
| FF-06, FF-07 | Gateway sin reglas ni persistencia | `ReglasArquitecturaTest` |
| FF-08b | Persistencia sin dependencias del dominio | `ReglasArquitecturaTest` |
| FF-09 | CC ≤ 10 por método | PMD `config/pmd/complejidad.xml` |
| FF-10 | Cobertura de ramas ≥ 95 % en `domain.rules` | JaCoCo |
| FF-11 | Reparto verificable (1.000 mazos) | `MazoYAuditoriaTest` |
| FF-16 | Fallo en la liquidación → 0 filas (PostgreSQL real) | `LiquidacionTransaccionalIT`, `FalloTransaccionalTest` |
| FF-17 | Doble cierre y temporizador obsoleto | `ConcurrenciaCierreTest`, `TurnosTest` |
| FF-18 | CONNECT sin token, vencido o con firma ajena rechazado | `AutenticacionStompTest`, `TokenInvitadoTest` |
| FF-14, FF-15 | Latencia p95 < 300 ms y reconexión ≤ 5 s | k6 `tests/fitness/k6/` (job nocturno) |

## Despliegue en AWS

EC2 (Docker Compose con Caddy para HTTPS) + RDS PostgreSQL 16 privado (ADR-09b). Archivos y pasos en `deploy/aws/`.

## API

- `POST /api/sesion {apodo}` → token de invitado (ADR-07b).
- `POST /api/salas` · `POST /api/salas/{codigo}/unirse` · `GET /api/salas/{codigo}` · `POST /api/salas/{codigo}/iniciar {modalidad, robarDelDescarte, umbral, segundosPorTurno, …}` (con `Authorization: Bearer`).
- STOMP en `/ws` (CONNECT con `Authorization: Bearer …`): enviar a `/app/partidas/{id}/{robar|descartar|cerrar|reanudar}` con `numeroTurno`; suscribirse a `/topic/partidas/{id}`, `/user/queue/partida` y `/user/queue/errores`. Cada mensaje llega como `{tipo, datos}`.

## Evidencias de validación

- Log de auditoría: una línea JSON por comando y por evento (logger `auditoria`).
- `python scripts/resumen_auditoria.py logs.txt --csv docs/validacion/resumen.csv` → turnos, tiempo por turno, cierres válidos y rechazados por jugador.
- Evidencias de usuarios en `docs/validacion/`.

## Alcance del MVP

Incluido: salas privadas, Apuntado a 101 y Clásica 4-3-3 completas, turnos en tiempo real con temporizador,
persistencia transaccional, reconexión y reparto verificable (DealAudit). Fuera (Fase 2): bots, apuestas, reingreso,
OIDC completo. Ver `docs/reglas-obligatorias-vs-extras.md`.

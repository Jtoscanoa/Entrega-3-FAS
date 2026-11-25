# Fitness functions dinámicas: FF-14 y FF-15 (k6)

| Script | FF | Qué hace | Umbral |
|---|---|---|---|
| `latencia.js` | FF-14 | `SALAS` mesas de `JUGADORES` (50 × 4 = 200 VU). Cada jugador roba del mazo y descarta la carta robada en su turno, y pide `reanudar` ante cada `TurnoAsignado` y `CartaRobada`, igual que la SPA. Mide el tiempo desde el `SEND` hasta el evento propio en el canal público (`CartaRobada` / `CartaDescartada`) | `latencia_ms` p(95) < 300 ms |
| `reconexion.js` | FF-15 | `SALAS` mesas de `JUGADORES` (10 × 2). Cada jugador entra, corta `CORTE_S` s (30) y vuelve como la SPA: `CONNECT`, tres `SUBSCRIBE` y `reanudar`. Mide desde que abre el socket nuevo hasta su `VistaPartida` | `reconexion_ms` max ≤ 5000 ms y todas las reconexiones con vista |

- Los dos crean sus propios invitados (`POST /api/sesion`), salas y partidas por REST en `setup()`: no hace falta ningún token.
- STOMP va escrito a mano sobre `k6/ws` (`comun.js`).
- Variables: `BASE_URL` (URL HTTP(S) base, por defecto `http://localhost:8080`), `SALAS`, `JUGADORES`, `DURACION_S` (120) y `PENSAR_MS` (1000) en latencia, `CORTE_S` en reconexión, y `SALIDA` (archivo del resumen).
- Al final cada script imprime un resumen JSON (`cumple`, `p95Ms`, `maximoMs`, …) y guarda el detalle en `resumen-latencia.json` o `resumen-reconexion.json`. Esos archivos están en `.gitignore`: son evidencia local para el informe.

## Correr en Windows

Con k6 instalado (`winget install k6 --source winget`), desde la raíz del repositorio, en PowerShell:

```powershell
k6 run -e BASE_URL=http://localhost:8080 tests/fitness/k6/latencia.js
k6 run -e BASE_URL=http://localhost:8080 tests/fitness/k6/reconexion.js
```

Sin instalar k6, con Docker Desktop (el directorio se monta porque los scripts importan `comun.js`):

```powershell
docker run --rm -v "${PWD}/tests/fitness/k6:/scripts" -w /scripts -e BASE_URL=http://host.docker.internal:8080 grafana/k6 run latencia.js
```

Desde un contenedor, el servidor local se alcanza en `host.docker.internal`, no en `localhost`.

## Contra producción (`https://mesa101.duckdns.org`)

```powershell
k6 run -e BASE_URL=https://mesa101.duckdns.org -e SALIDA=resumen-latencia-prod.json tests/fitness/k6/latencia.js
k6 run -e BASE_URL=https://mesa101.duckdns.org -e SALIDA=resumen-reconexion-prod.json tests/fitness/k6/reconexion.js
```

Antes de correrlos contra producción:

- **No los corras durante una sesión con usuarios.** FF-14 abre 200 conexiones y juega 50 mesas a la vez en la misma instancia EC2.
- Cada corrida deja invitados, salas y partidas reales en RDS. Las partidas quedan `EN_CURSO` hasta el siguiente reinicio, que las pasa a `INTERRUMPIDA` (recuperación tras una caída, bitácora E3-16).
- Empieza con una carga pequeña para comprobar la conexión, por ejemplo `-e SALAS=2 -e DURACION_S=30`, y después corre la carga completa.
- La latencia medida incluye la red entre tu PC y AWS. Anota desde dónde se midió.

En el job nocturno de `ci.yml`, el secreto `STAGING_URL` es la `BASE_URL`: una URL `https://`, ya no `wss://`. El secreto `STAGING_TOKEN` ya no se usa.

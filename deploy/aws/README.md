# Despliegue en AWS (ADR-09b)

| Archivo | Uso |
|---|---|
| `preparar-servidor.sh` | Instala Docker y Compose en Ubuntu 24.04, crea swap y `/opt/mesa101` |
| `docker-compose.yml` | App (imagen de ghcr.io) + Caddy con HTTPS automático; PostgreSQL está en RDS |
| `Caddyfile` | Proxy inverso al puerto 8080 (incluye WebSocket) |
| `env.ejemplo` | Plantilla de `/opt/mesa101/.env` (sin secretos reales) |

Resumen: RDS PostgreSQL 16 privado + EC2 con los grupos de seguridad `mesa101-web` (80, 443, 22) y `mesa101-db`
(5432 solo desde `mesa101-web`). En el servidor: copiar estos archivos a `/opt/mesa101`, completar `.env` y ejecutar
`docker compose up -d`. Desde ahí, cada merge a `main` con las fitness functions en verde se despliega solo
(secretos `EC2_HOST` y `EC2_SSH_KEY`).

Logs de auditoría de una sesión: `docker compose logs --no-color --since 2h app | grep auditoria > sesion.txt`.

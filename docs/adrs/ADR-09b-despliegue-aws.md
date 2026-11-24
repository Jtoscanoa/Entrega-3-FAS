# ADR-09b. Despliegue en AWS (EC2 + RDS) en lugar de un PaaS (enmienda del ADR-09)

**Estado:** Aceptado (24-nov-2026) · **Enmienda:** ADR-09 · **Autor:** equipo "4 menos 1"

## Contexto
El ADR-09 eligió una sola imagen Docker (Spring Boot sirve también la SPA) en un PaaS con WebSocket y PostgreSQL
gestionado, desplegada solo con el pipeline en verde. El MVP llegó a correr en un PaaS (Render, plan gratuito), pero el
equipo decidió consolidar la infraestructura en AWS, donde ya tiene cuenta y créditos. AWS App Runner se descartó porque
no soporta WebSocket, del que depende la sincronización (ADR-06).

## Decisión
- **Cómputo:** una instancia EC2 (Ubuntu 24.04) con Docker Compose: la imagen de la app (ghcr.io) y **Caddy** como proxy
  inverso con HTTPS automático (Let's Encrypt), que también reenvía el WebSocket. Dominio: `mesa101.duckdns.org`
  (DuckDNS, gratuito) apuntando a una Elastic IP.
- **Datos:** Amazon RDS for PostgreSQL 16 (db.t4g.micro), sin acceso público; solo el grupo de seguridad del servidor
  llega al puerto 5432, con TLS (`sslmode=require`).
- **Despliegue:** se conserva la regla del ADR-09: el job de GitHub Actions que publica la imagen depende de las fitness
  functions; después copia `deploy/aws/` al servidor por SSH y reinicia con la imagen nueva.
- **Secretos:** `.env` solo en el servidor; `EC2_HOST` y `EC2_SSH_KEY` como secretos del repositorio.

## Consecuencias
- Sigue siendo **un solo cuanto** (ADR-04): una instancia de la app, igual que en el PaaS.
- La base pasa a ser gestionada de verdad (copias automáticas, parches), coherente con el ADR-05.
- Más control a cambio de más operación: el equipo administra la instancia, Docker y el proxy.
- El puerto 22 queda abierto a Internet porque los runners de GitHub no tienen IP fija; el acceso es solo con llave.
  Alternativa más segura (Fase 2): desplegar con AWS Systems Manager y un rol OIDC de GitHub, sin abrir el 22.
- Sin dominio propio: DuckDNS da un nombre legible y un certificado válido sin costo, pero es un servicio de terceros
  sin garantía de disponibilidad. Respaldo inmediato: `3-233-175-115.sslip.io` (misma IP). Un dominio en Route 53
  queda como mejora.
- Costo estimado ~USD 33/mes (EC2 t3.small, RDS db.t4g.micro, IPv4 pública), cubierto por los créditos del plan
  gratuito, que termina el 5-dic-2026: antes de esa fecha hay que pasar a plan pagado o la app deja de estar disponible.
- Camino a escala (escenario de 100.000 jugadores, §5.3): ALB con WebSocket delante de varios gateways en ECS,
  núcleo de juego particionado por partida, RDS con réplicas de lectura y un broker (ElastiCache Redis) detrás de
  `PublicadorEventosStomp`.

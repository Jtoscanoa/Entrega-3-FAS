# Guion de la sustentación (10–15 min)

Requisito de la guía: jugar una ronda de Clásica y una de Apuntado en vivo y luego verificar la ejecución de las fitness functions.

## Antes de entrar (preparación, 10 min)

- [ ] `https://mesa101.duckdns.org/actuator/health` responde `{"status":"UP"}`.
- [ ] Tres navegadores o perfiles abiertos (o un portátil + dos teléfonos): Jugador A (pantalla compartida), B y C.
- [ ] Pestaña con GitHub Actions: último run en verde de `main`.
- [ ] Pestaña con el PR o la rama `demo-violacion` (run en rojo ya ejecutado; no esperar en vivo).
- [ ] Terminal con el repo en `main` limpio, por si piden correr `mvn -B test -Dtest=ReglasArquitecturaTest` (≈ 1 min).
- [ ] Respaldo: video corto de una partida completa por si falla la red.

## Desarrollo

| Min | Quién | Qué se muestra | Qué se dice (idea, no libreto) |
| --- | --- | --- | --- |
| 0–1 | JM | Diagrama de despliegue (Figura 1) | Un solo cuanto en EC2 detrás de Caddy, RDS privada, despliegue automático solo con las FF en verde |
| 1–2 | JM | Vestíbulo: crear mesa Clásica, B y C se unen con el código | Token de invitado (ADR-07b); cada pestaña es un jugador |
| 2–5 | JP | Ronda Clásica: robar del mazo y del pozo, intentar un cierre inválido (ver motivo), cerrar con 1 cuarta + 2 ternas + descarte | La validación vive en el plug-in `ReglaClasicaCuartaTerna`; la SPA no decide nada |
| 5–6 | JP | Pantalla de liquidación | Huella SHA-256 publicada al iniciar y orden revelado al liquidar (ADR-03) |
| 6–9 | DS | Mesa nueva en Apuntado; cerrar con 3 ternas y sobrante < 5; mostrar marcador acumulado | Sobrante de exactamente 5 se rechaza (`apuntadoResiduoExactoDeCincoEsDenegado`) |
| 9–10 | DS | Cerrar la pestaña de C: aparece «sin conexión» y su turno vence en 10 s | RF17 / ADR-08b; cambiar de piel ligera ↔ animada sin reconectar (ADR-10) |
| 10–12 | JM | Run en verde de Actions: pasos ArchUnit, PMD, JaCoCo, Testcontainers, despliegue | Pruebas 1, 2 y 3 de la guía por nombre (`prueba1_*`, `prueba2_*`, `prueba3_*`) |
| 12–13 | JM | Rama `demo-violacion`: una regla importa la persistencia → `prueba1_ff01` en rojo, sin despliegue | La arquitectura se protege por máquina, no por revisión |
| 13–15 | Todos | Preguntas | Tener a mano: Tabla 10 (zona del dolor de `persistence`), trade-off de estado en memoria (E3-16), escalado a 100.000 |

## Cómo armar la rama `demo-violacion` (una vez, antes de la demo)

```bash
git switch -c demo-violacion main
# en el plug-in ReglaApuntado101.java (paquete domain.rules) agregar
#   import co.edu.unal.apuntado.infrastructure.persistence.MatchStateRepository;
# y un campo privado de ese tipo: una regla que conoce la base de datos viola FF-01 (Prueba 1)
git commit -am "demo: violación deliberada de FF-01"
git push -u origin demo-violacion
```

El push dispara el pipeline; dejarlo terminar en rojo y **no** fusionarlo. Borrar la rama después de la sustentación.

## Si algo falla en vivo

- Partida colgada: recargar la pestaña; la SPA reanuda desde `VistaPartida`.
- Servidor caído: mostrar el video de respaldo y explicar la recuperación (E3-16: la ronda en curso queda `ANULADA`, los marcadores liquidados no cambian).

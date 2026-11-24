# ADR-07b. Token de invitado en lugar de OIDC + PKCE (enmienda del ADR-07)

**Estado:** Aceptado (23-nov-2026) · **Enmienda:** ADR-07 · **Autor:** equipo "4 menos 1"

## Contexto
El ADR-07 eligió OIDC con código + PKCE y validación del JWT también en el CONNECT de STOMP (FF-18). Para el MVP del
E3 eso exige operar un proveedor de identidad (Keycloak o Google) en el despliegue y que cada usuario de prueba cree o
use una cuenta. El plazo del E3 (26-nov) y las pruebas con usuarios ajenos al equipo hacen que esa fricción pese más
que el beneficio: las fichas son virtuales (RD3) y no hay datos personales que proteger.

## Decisión
El servidor emite sus propios **tokens de invitado**: `POST /api/sesion {apodo}` devuelve un JWT HS256 firmado con
`JWT_SECRET` (sub = UUID nuevo, claim `preferred_username` = apodo, vigencia 12 h). El mismo `JwtDecoder` valida el
token en REST (Spring Security resource server) y en el CONNECT de STOMP (`AutenticacionStompInterceptor`).

## Consecuencias
- Se mantiene FF-18: CONNECT sin token, con firma ajena o vencido se rechaza (`AutenticacionStompTest`, `TokenInvitadoTest`).
- Se mantiene la frontera: el resto del sistema solo ve un `sub` y un alias, igual que con OIDC.
- Se pierde la identidad persistente: un jugador que borra el almacenamiento del navegador es otro `sub`.
- OIDC + PKCE pasa a la Fase 2; el cambio queda acotado a `TokenInvitadoConfig` y `SesionController`.
- Trade-off registrado para la retrospectiva (§5): simplicidad de acceso frente a identidad verificable.

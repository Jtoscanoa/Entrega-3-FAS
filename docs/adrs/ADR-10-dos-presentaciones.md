# ADR-10. Dos presentaciones (animada y ligera) sobre un único estado de mesa

**Estado:** Aceptado (24-nov-2026) · **Relacionado:** RD1, RD4, ADR-06 · **Autor:** equipo "4 menos 1"

## Contexto
La primera SPA del MVP era funcional pero sobria. El equipo quería una interfaz más expresiva (reparto y vuelos de
cartas, reloj de turno, liquidación animada) sin dejar fuera a jugadores con teléfonos de pocos recursos o conexiones
lentas, y sin duplicar la lógica de la mesa ni romper la regla de que la SPA no valida jugadas (RD4).

## Decisión
- Todo el estado y la conexión de la mesa viven en un solo hook, `useMesa()` (`src/estado/`): mensajes `{tipo, datos}`,
  reconexión, acciones con `numeroTurno`, orden de la mano, liquidación y fin de partida.
- Dos presentaciones que solo dibujan lo que devuelve ese hook: **ligera** (`src/presentacion/ligera/`, la interfaz
  original) y **animada** (`src/presentacion/animada/`, con la librería `motion`).
- La animada se carga de forma diferida (`React.lazy` + `import()`): quien usa la ligera no descarga ni su código ni la
  librería de animación.
- Elección inicial automática (movimiento reducido, ahorro de datos, poca memoria o pocos núcleos → ligera) y un
  selector fijo al pie de la pantalla; la elección del jugador se guarda y manda sobre la detección. Cambiar de versión
  no reconecta ni pierde la partida, porque el hook vive por encima de ambas.
- **FF-19** (dependency-cruiser en el CI): nada en `src/presentacion/**` puede importar `src/api.ts`. Es la primera
  fitness function del frontend y protege que ninguna presentación hable directamente con el servidor.

## Consecuencias
- Experiencia frente a rendimiento deja de ser una decisión única: cada jugador elige su punto del trade-off.
- Una tercera presentación (por ejemplo, accesible o para torneo) se agrega sin tocar el estado ni el servidor.
- Hay más código de interfaz que mantener; FF-19 y el hook compartido evitan que las dos versiones diverjan en
  comportamiento.
- La SPA sigue sin reglas (RD4): ninguna presentación decide si una jugada es válida.

// Fitness functions del frontend (se ejecutan con `npm run fitness` y en el CI, job spa).
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      // FF-19: la presentacion no habla con el servidor. Las pieles (ligera y animada) solo reciben lo que
      // devuelven los hooks de src/estado; la conexion STOMP y el REST viven en src/api.ts (RD4: la SPA no
      // valida reglas y el servidor es la fuente de verdad). Incluye los imports de solo tipos.
      name: 'ff19-presentacion-sin-api',
      comment: 'FF-19: src/presentacion/** no puede importar src/api.ts; use los hooks y tipos de src/estado.',
      severity: 'error',
      from: { path: '^src/presentacion/' },
      to: { path: '^src/api\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    exclude: { path: '\\.css$' },
  },
};

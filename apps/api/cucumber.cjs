// Configuración de Cucumber.js para el backend (CommonJS explícito).
// El orden de `require` importa: env.ts debe cargarse ANTES de cualquier
// import de AppModule para fijar la BD de test y NODE_ENV.
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'features/support/env.ts',
      'features/support/world.ts',
      'features/support/app-holder.ts',
      'features/support/test-app.ts',
      'features/support/db.ts',
      'features/support/hooks.ts',
      'features/steps/**/*.ts',
    ],
    paths: ['features/**/*.feature'],
    format: ['progress-bar', ['html', 'cucumber-report.html']],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
  },
};

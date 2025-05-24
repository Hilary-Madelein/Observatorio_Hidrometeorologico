// cypress.config.js
const { defineConfig } = require('cypress');
const { execSync } = require('child_process');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',

    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',

    supportFile: false,

    env: {
      apiUrl: 'http://localhost:9006/api'
    },

    setupNodeEvents(on, config) {
      on('task', {
        resetDatabase() {
          execSync(
            'cd ../backend && npm run migrate:test && npm run seed:test',
            { stdio: 'inherit' }
          );
          return null;
        }
      });
    }
  }
});

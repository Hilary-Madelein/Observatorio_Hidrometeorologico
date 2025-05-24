
describe('Mapa y Zonas de Monitoreo – Integración frontend↔backend', () => {

    beforeEach(() => {
      cy.intercept('GET', '**/listar/microcuenca/operativas', {
        statusCode: 200,
        body: {
          code: 200,
          info: [
            { external_id: 'mc1', name: 'Microcuenca Uno', picture: 'mc1.jpg', description: 'Descripción uno' },
            { external_id: 'mc2', name: 'Microcuenca Dos', picture: 'mc2.jpg', description: 'Descripción dos' }
          ]
        }
      }).as('getMicrocuencas');
  
      cy.intercept('POST', '**/estaciones/operativas/microcuenca', {
        statusCode: 200,
        body: {
          code: 200,
          microcuenca_nombre: 'Microcuenca Uno',
          info: [
            { name: 'Estación A', latitude: -4.1, longitude: -79.2, picture: 'estacionA.jpg', description: 'Estación A Desc.' },
            { name: 'Estación B', latitude: -4.2, longitude: -79.3, picture: 'estacionB.jpg', description: 'Estación B Desc.' }
          ]
        }
      }).as('postEstacionesMicrocuenca');
  
      cy.visit('/principal/mapa');
  
      cy.wait('@getMicrocuencas');
    });
  
    it('muestra correctamente las microcuencas en la zona de monitoreo', () => {
      cy.contains('Zonas de Monitoreo').scrollIntoView().should('be.visible');
  
      cy.get('.modern-card').should('have.length', 2);
      cy.contains('Microcuenca Uno').should('be.visible');
      cy.contains('Microcuenca Dos').should('be.visible');
    });
  
    it('permite seleccionar una microcuenca y mostrar sus estaciones', () => {
      cy.contains('Microcuenca Uno').parent().within(() => {
        cy.contains('Ver Estaciones').click();
      });
  
      cy.wait('@postEstacionesMicrocuenca');
  
      cy.get('.titulo-principal').should('contain', 'Microcuenca Uno');
      cy.get('.modern-card').should('have.length', 2);
      cy.contains('Estación A').should('be.visible');
      cy.contains('Estación B').should('be.visible');
    });
  
    it('permite volver a la vista inicial desde estaciones', () => {
      cy.contains('Microcuenca Uno').parent().within(() => {
        cy.contains('Ver Estaciones').click();
      });
  
      cy.wait('@postEstacionesMicrocuenca');
  
      cy.get('.btn-back').click();
  
      cy.contains('Zonas de Monitoreo').should('be.visible');
      cy.get('.modern-card').should('have.length', 2);
    });
  
    it('muestra mensaje cuando no existen estaciones registradas', () => {
      cy.intercept('POST', '**/estaciones/operativas/microcuenca', {
        statusCode: 200,
        body: { code: 200, microcuenca_nombre: 'Microcuenca Dos', info: [] }
      }).as('postEstacionesVacias');
  
      cy.contains('Microcuenca Dos').parent().within(() => {
        cy.contains('Ver Estaciones').click();
      });
  
      cy.wait('@postEstacionesVacias');
  
      cy.contains('No existen estaciones registradas').should('be.visible');
    });
  
    it('permite cambiar el estilo del mapa', () => {
      cy.get('.map-select').select('Oscuro').should('have.value', 'mapbox://styles/mapbox/dark-v10');
    });
  
    it('permite obtener la ubicación actual', () => {
      cy.window().then((win) => {
        cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((cb) => {
          cb({ coords: { latitude: -4.0, longitude: -79.2 } });
        });
  
        cy.contains('Ubicación actual').click();
  
        cy.contains('Lat: -4.00000').should('be.visible');
        cy.contains('Lng: -79.20000').should('be.visible');
      });
    });
  
  });
  
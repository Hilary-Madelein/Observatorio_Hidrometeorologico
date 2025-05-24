describe('Filtro – Integración frontend↔backend', () => {

  beforeEach(() => {
    cy.intercept({
      method: 'GET',
      url: '**/listar/estacion/operativas*'
    }, {
      statusCode: 200,
      body: {
        code: 200,
        info: [
          { id: 1, external_id: 'E1', name: 'Estación Uno' },
          { id: 2, external_id: 'E2', name: 'Estación Dos' }
        ]
      }
    }).as('getEstaciones');

    cy.visit('/principal/monitorizacion');
    cy.wait('@getEstaciones');
  });

  it('advierte si pulsa sin elegir escala', () => {
    cy.contains('Consultar datos').click();
    cy.get('.swal2-popup')
      .should('be.visible')
      .and('contain', 'Debe seleccionar una escala temporal');
  });

  it('valida rangoFechas sin fechas', () => {
    cy.get('#filtro').select('rangoFechas');
    cy.contains('Consultar datos').click();

    cy.get('.swal2-popup')
      .should('be.visible')
      .and('contain', 'Debe proporcionar un rango de fechas completo.');
  });

  it('valida rangoFechas con fecha inicio > fin', () => {
    cy.get('#filtro').select('rangoFechas');
    cy.get('#fecha-inicio').type('2025-05-10');
    cy.get('#fecha-fin').type('2025-05-01');
    cy.contains('Consultar datos').click();

    cy.get('.swal2-popup')
      .should('be.visible')
      .and('contain', 'La fecha de inicio no puede ser mayor que la fecha de fin.');
  });

  it('muestra mensaje de "sin datos" para 15min cuando no hay mediciones', () => {
    cy.get('#filtro').select('15min');

    cy.intercept({
      method: 'GET',
      url: '**/mediciones/por-tiempo*'
    }, {
      statusCode: 200,
      body: {
        code: 200,
        info: [] 
      }
    }).as('getEmptyCrudos');

    cy.contains('Consultar datos').click();
    cy.wait('@getEmptyCrudos');

    cy.get('.swal2-popup')
      .should('be.visible')
      .and('contain', 'No existen datos registrados');
  });

  it('renderiza gráfica agregada (mensual)', () => {
    cy.get('#filtro')
      .scrollIntoView()
      .should('be.visible')
      .select('mensual');
  
    cy.intercept(
      'GET',
      `**/mediciones/historicas?rango=mensual*`,
      {
        statusCode: 200,
        body: {
          code: 200,
          info: [{
            hora: '2025-05-01T00:00:00.000Z',
            estacion: 'Estación Uno',
            medidas: {
              Temperatura: {
                PROMEDIO: 20,
                MAX: 30,
                MIN: 10,
                SUMA: 620,
                icon: 'temp.png',
                unidad: '°C'
              }
            }
          }]
        }
      }
    ).as('getHist');
  
    cy.contains('Consultar datos').click();
    cy.wait('@getHist');
  
    cy.get('canvas', { timeout: 10000 }).should('have.length.greaterThan', 0);
  
    cy.get('.estacion-text').should('contain', 'Estación Uno');
  });
  

});

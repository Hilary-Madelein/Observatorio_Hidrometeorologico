describe('Medidas – Integración frontend↔backend', () => {

    beforeEach(() => {
        cy.intercept({
            method: 'GET',
            url: '**/listar/ultima/medida'
        }, {
            statusCode: 200,
            body: {
                code: 200,
                info: [
                    { tipo_medida: 'Temperatura', valor: 23.5, unidad: '°C', estacion: 'Estación Uno' },
                    { tipo_medida: 'Humedad', valor: 55, unidad: '%', estacion: 'Estación Dos' }
                ]
            }
        }).as('getUltimaMedida');

        cy.intercept({
            method: 'GET',
            url: '**/listar/tipo_medida'
        }, {
            statusCode: 200,
            body: {
                code: 200,
                info: [
                    { nombre: 'Temperatura', icono: 'temp.png', unidad: '°C' },
                    { nombre: 'Humedad', icono: 'hum.png', unidad: '%' }
                ]
            }
        }).as('getTipoMedida');

        cy.visit('/principal/medidas');

        cy.wait('@getUltimaMedida');
        cy.wait('@getTipoMedida');
    });

    it('muestra medidas correctamente', () => {
        cy.contains('Medidas en tiempo real')
            .scrollIntoView()
            .should('be.visible');

        cy.get('.custom-card').contains('Temperatura').parent().within(() => {
            cy.contains('Estación Uno:').should('be.visible');
            cy.contains('23.5 °C').should('be.visible');
        });

        cy.get('.custom-card').contains('Humedad').parent().within(() => {
            cy.contains('Estación Dos:').should('be.visible');
            cy.contains('55 %').should('be.visible');
        });
    });

    it('maneja errores del backend mostrando mensaje apropiado', () => {
        cy.intercept('GET', '**/listar/ultima/medida', {
            statusCode: 500,
            body: {
                code: 500,
                msg: 'Error interno del servidor'
            }
        }).as('getErrorUltimaMedida');

        cy.visit('/principal/medidas');
        cy.wait('@getErrorUltimaMedida');

        cy.get('.no-data-message').should('be.visible').and('contain', 'Sucedió un problema al cargar los datos');
    });

    it('muestra spinner mientras carga', () => {
        cy.intercept('GET', '**/listar/ultima/medida', (req) => {
            req.reply((res) => {
                res.delay = 1000;
                res.send({
                    statusCode: 200,
                    body: {
                        code: 200,
                        info: []
                    }
                });
            });
        }).as('getDelayedMedidas');

        cy.visit('/principal/medidas');

        cy.get('.spinner-border').should('be.visible');
        cy.contains('Cargando datos...').should('be.visible');

        cy.wait('@getDelayedMedidas');

        cy.get('.spinner-border').should('not.exist');
    });

});

describe('Gestionar Estaciones – Integración frontend↔backend', () => {
    beforeEach(() => {
        cy.intercept('POST', '**/sesion', {
            statusCode: 200,
            body: {
                code: 200,
                info: {
                    token: 'stub-token',
                    user: { name: 'admin', rol: 'ADMINISTRADOR' },
                    infoAux: { rol: 'ADMINISTRADOR', permisos: [] }
                }
            }
        }).as('login');

        cy.visit('/admin');
        cy.get('input[name="correo"]').type('hilary.calva@unl.edu.ec');
        cy.get('input[name="clave"]').type('kiara27');
        cy.get('button[type="submit"]').click();
        cy.wait('@login');
        cy.location('pathname', { timeout: 10000 }).should('include', '/principal/admin');

        cy.intercept('GET', '**/listar/microcuenca/operativas', {
            statusCode: 200,
            body: {
                code: 200,
                info: [
                    {
                        external_id: 'mc1',
                        name: 'Microcuenca Uno',
                        picture: 'mc1.jpg',
                        description: 'Descripción uno'
                    }
                ]
            }
        }).as('getMicrocuencas');

        cy.intercept('GET', '**/listar/estacion/OPERATIVA/mc1', {
            statusCode: 200,
            body: {
                code: 200,
                info: [
                    {
                        external_id: 'est1',
                        name: 'Estación Uno',
                        picture: 'est1.jpg',
                        longitude: '-79.21',
                        latitude: '-3.98',
                        altitude: '2100',
                        status: 'OPERATIVA',
                        type: 'METEOROLOGICA',
                        id_device: 'dev001',
                        description: 'Descripción estación uno'
                    }
                ]
            }
        }).as('getEstaciones');

        cy.contains('Microcuencas').click();
        cy.wait('@getMicrocuencas');
        cy.contains('Acceder a estaciones').click();
        cy.wait('@getEstaciones');
    });

    it('carga y muestra correctamente estaciones activas', () => {
        cy.contains('Estaciones Registradas').should('be.visible');
        cy.get('.card-estacion-horizontal').should('have.length', 1);
        cy.contains('Estación Uno').should('be.visible');
    });

    it('registra estación correctamente con foto simulada', () => {
        cy.contains('Agregar Estación').click();

        cy.get('input[placeholder="Ingrese el nombre"]').type('Estación Dos');
        cy.get('input[placeholder="Ingrese el ID del dispositivo"]').type('disp-002');
        cy.get('textarea[placeholder="Ingrese la descripción"]').type('Descripción estación dos');
        cy.get('input[placeholder="Ingrese la longitud"]').type('-79.300');
        cy.get('input[placeholder="Ingrese la latitud"]').type('-3.900');
        cy.get('input[placeholder="Ingrese la altitud"]').type('2000');
        cy.get('select').eq(0).select('METEOROLOGICA');
        cy.get('select').eq(1).select('OPERATIVA');

        const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8HwQACfsD/QEopjwAAAAASUVORK5CYII=';
        cy.writeFile('cypress/fixtures/estacion.jpg', base64Image, 'base64');

        cy.get('input[type="file"]').selectFile('cypress/fixtures/estacion.jpg', { force: true }).trigger('change', { force: true });

        cy.intercept('POST', '**/guardar/estacion', {
            statusCode: 200,
            body: { code: 200, msg: 'SE HAN REGISTRADO LOS DATOS CON ÉXITO' }
        }).as('guardarEstacion');

        cy.get('.btn-registrar-modal').click();
        cy.wait('@guardarEstacion');

        cy.contains('SE HAN REGISTRADO LOS DATOS CON ÉXITO').should('be.visible');
    });

    it('valida error al registrar estación sin campos obligatorios', () => {
        cy.contains('Agregar Estación').click();
        cy.get('.btn-registrar-modal').click();
        cy.get('.alert-danger').should('have.length.at.least', 1);
        cy.contains('Ingrese un nombre').should('exist');
        cy.contains('Seleccione una foto').should('exist');
    });

    it('valida error al registrar estación con coordenadas inválidas', () => {
        cy.contains('Agregar Estación').click();

        cy.get('input[placeholder="Ingrese el nombre"]').type('Estación Inválida');
        cy.get('input[placeholder="Ingrese el ID del dispositivo"]').type('disp-999');
        cy.get('textarea[placeholder="Ingrese la descripción"]').type('Sin coordenadas');
        cy.get('input[placeholder="Ingrese la longitud"]').type('abc');
        cy.get('input[placeholder="Ingrese la latitud"]').type('xyz');
        cy.get('input[placeholder="Ingrese la altitud"]').type('---');
        cy.get('select').eq(0).select('HIDROLOGICA');
        cy.get('select').eq(1).select('NO OPERATIVA');

        const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8HwQACfsD/QEopjwAAAAASUVORK5CYII=';
        cy.writeFile('cypress/fixtures/invalid.jpg', base64Image, 'base64');
        cy.get('input[type="file"]').selectFile('cypress/fixtures/invalid.jpg', { force: true });

        cy.get('.btn-registrar-modal').click();
        cy.get('.alert-danger').should('exist');
    });

    it('edita una estación correctamente', () => {
        cy.intercept('GET', '**/get/estacion/est1', {
            statusCode: 200,
            body: {
                code: 200,
                info: {
                    name: 'Estación Uno',
                    description: 'Descripción estación uno',
                    external_id: 'est1',
                    picture: 'est1.jpg',
                    longitude: '-79.21',
                    latitude: '-3.98',
                    altitude: '2100',
                    status: 'OPERATIVA',
                    type: 'METEOROLOGICA',
                    id_device: 'dev001'
                }
            }
        }).as('getEstacion');

        cy.get('.card-estacion-horizontal').first().within(() => {
            cy.get('.bi-sliders').click();
            cy.contains('Editar').click();
        });
        cy.wait('@getEstacion');

        cy.get('input[placeholder="Ingrese el nombre"]').clear().type('Estación Uno Editada');

        cy.intercept('POST', '**/modificar/estacion', {
            statusCode: 200,
            body: { code: 200, msg: 'SE HAN MODIFICADO LOS DATOS CON ÉXITO' }
        }).as('editarEstacion');

        cy.get('.btn-registrar-modal').click();
        cy.wait('@editarEstacion');

        cy.contains('SE HAN MODIFICADO LOS DATOS CON ÉXITO').should('be.visible');
    });

    it('cambia el estado de una estación correctamente', () => {
        cy.get('.card-estacion-horizontal').first().within(() => {
            cy.get('.bi-sliders').click();
            cy.contains('Cambiar estado').click();
        });

        cy.get('select').select('MANTENIMIENTO');

        cy.intercept('POST', '**/estacion/cambiar_estado', {
            statusCode: 200,
            body: { code: 200, msg: 'Estado actualizado correctamente. Nuevo estado: MANTENIMIENTO' }
        }).as('cambiarEstado');

        cy.get('.btn-registrar-modal').click();
        cy.wait('@cambiarEstado');

        cy.contains('Estado actualizado correctamente').should('be.visible');
    });

    it('muestra mensaje de error si el backend falla al cargar estaciones', () => {
        cy.intercept('GET', '**/listar/estacion/operativas', {
            statusCode: 500,
            body: { code: 500, msg: 'Error en el servidor' }
        }).as('failEstaciones');

        cy.contains('Microcuencas').click();
        cy.wait('@getMicrocuencas');
        cy.contains('Acceder a estaciones').click();
        cy.wait('@failEstaciones');

        cy.contains('Error cargando estaciones').should('exist');
    });
});

/// <reference types="cypress" />

describe('Gestionar Microcuencas – Integración frontend↔backend', () => {

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
          { external_id: 'mc1', name: 'Microcuenca Uno', picture: 'mc1.jpg', description: 'Descripción uno' },
          { external_id: 'mc2', name: 'Microcuenca Dos', picture: 'mc2.jpg', description: 'Descripción dos' }
        ]
      }
    }).as('getMicrocuencasActivas');

    cy.contains('Microcuencas').click();
    cy.wait('@getMicrocuencasActivas');
  });

  it('carga y muestra correctamente microcuencas activas', () => {
    cy.contains('Microcuencas Registradas (Activas)').should('be.visible');
    cy.get('.card-microcuenca').should('have.length', 2);
    cy.contains('Microcuenca Uno').should('be.visible');
    cy.contains('Microcuenca Dos').should('be.visible');
  });

  it('busca correctamente una microcuenca por nombre', () => {
    cy.get('input[placeholder="Buscar por: Nombre"]').type('Uno');
    cy.get('.card-microcuenca').should('have.length', 1);
    cy.contains('Microcuenca Uno').should('be.visible');
  });

  it('muestra mensaje si no hay coincidencias en la búsqueda', () => {
    cy.get('input[placeholder="Buscar por: Nombre"]').type('Inexistente');
    cy.contains('No existen registros').should('be.visible');
  });

  it('valida error al intentar agregar microcuenca sin completar campos', () => {
    cy.contains('Agregar Microcuenca').click();
    cy.get('.btn-registrar-modal').click();
    cy.get('.alert-danger').should('have.length.at.least', 1);
    cy.contains('Ingrese el nombre').should('be.visible');
    cy.contains('Seleccione una foto').should('be.visible');
  });

  it('agrega una nueva microcuenca correctamente', () => {
    cy.contains('Agregar Microcuenca').click();
    cy.get('input[placeholder="Ingrese el nombre"]').type('Microcuenca Tres');
    cy.get('textarea[placeholder="Ingrese la descripción"]').type('Descripcion tres');

    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8HwQACfsD/QEopjwAAAAASUVORK5CYII=';
    cy.writeFile('cypress/fixtures/microcuenca.jpg', base64Image, 'base64');
    cy.get('input[type="file"]').selectFile('cypress/fixtures/microcuenca.jpg', { force: true }).trigger('change', { force: true });

    cy.intercept('POST', '**/guardar/microcuenca', {
      statusCode: 200,
      body: { code: 200, msg: 'Microcuenca registrada con éxito' }
    }).as('guardarMicrocuenca');

    cy.get('.btn-registrar-modal').click();
    cy.wait('@guardarMicrocuenca');

    cy.contains('Microcuenca registrada con éxito').should('be.visible');
  });

  it('abre modal para editar microcuenca', () => {
    cy.get('.card-microcuenca').first().within(() => {
      cy.get('.bi-sliders').click();
      cy.contains('Editar').click();
    });
    cy.get('.modal').should('be.visible');
    cy.contains('Editar Microcuenca').should('be.visible');
  });

  it('edita una microcuenca correctamente', () => {
    cy.intercept('GET', '**/obtener/microcuenca/mc1', {
      statusCode: 200,
      body: {
        code: 200,
        info: {
          name: 'Microcuenca Uno',
          description: 'Descripcion uno',
          external_id: '4cd5cc85-3bb0-4494-8ad0-7a5a855ed13f',
          picture: 'mc1.jpg'
        }
      }
    }).as('getMicrocuenca');

    cy.get('.card-microcuenca').first().within(() => {
      cy.get('.bi-sliders').click();
      cy.contains('Editar').click();
    });
    cy.wait('@getMicrocuenca');

    cy.get('input[placeholder="Ingrese el nombre"]').clear().type('Microcuenca Uno Editada');

    cy.intercept('POST', '**/modificar/microcuenca', {
      statusCode: 200,
      body: { code: 200, msg: 'Microcuenca actualizada con éxito' }
    }).as('editarMicrocuenca');

    cy.get('.btn-registrar-modal').click();
    cy.wait('@editarMicrocuenca');

    cy.contains('Microcuenca actualizada con éxito').should('be.visible');
  });

  it('cambia estado de microcuenca a inactivo', () => {
    cy.intercept('GET', '**/desactivar/microcuenca/mc1', {
      statusCode: 200,
      body: { code: 200, msg: 'Desactivada con éxito' }
    }).as('toggleEstado');

    cy.get('.card-microcuenca').first().within(() => {
      cy.get('.bi-sliders').click();
      cy.contains('Desactivar').click();
    });

    cy.get('.swal-button--danger').click();
    cy.wait('@toggleEstado');

    cy.contains('Desactivada con éxito').should('be.visible');
  });

  it('muestra error si falla el backend al listar microcuencas', () => {
    cy.intercept('GET', '**/listar/microcuenca/operativas', {
      statusCode: 500,
      body: { code: 500, msg: 'Error interno del servidor' }
    }).as('getMicrocuencasFail');

    cy.visit('/principal/admin');
    cy.contains('Microcuencas').click();
    cy.wait('@getMicrocuencasFail');
    cy.contains('Error interno del servidor').should('be.visible');
  });

});

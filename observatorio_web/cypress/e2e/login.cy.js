/// <reference types="cypress" />

describe('Login – Integración frontend↔backend', () => {
    const api = Cypress.env('apiUrl')
  
    beforeEach(() => {
      // stub por defecto para que no navegue ni haga reload
      cy.intercept('POST', `${api}/sesion`, {
        statusCode: 200,
        body: { code: 200, info: { token: 'stub', user: {} } }
      }).as('loginStub')
  
      cy.visit('/admin')
    })
  
    it('muestra errores de validación si los campos quedan vacíos', () => {
      cy.get('button[type=submit]').click()
  
      cy.get('.mensajeerror')
        .should('contain', 'Ingrese un correo')
        .and('contain', 'Ingrese una contraseña')
    })
  
    it('muestra error de formato de email inválido', () => {
      cy.get('#email').type('usuario@@dominio')
      cy.get('#password').type('cualquiera')
      cy.get('button[type=submit]').click()
  
      // ahora sí debe aparecer tu mensaje
      cy.get('.mensajeerror').should('contain', 'Ingrese un correo válido')
    })
  
    it('muestra error si password está vacío pero email válido', () => {
      cy.get('#email').type('test@usuario.com')
      cy.get('#password').clear()
      cy.get('button[type=submit]').click()
  
      cy.get('.mensajeerror')
        .should('not.contain', 'Ingrese un correo')
        .and('contain', 'Ingrese una contraseña')
    })
  
    it('maneja credenciales inválidas (401) y no redirige', () => {
      // re-mock distinto sólo para este caso
      cy.intercept('POST', `${api}/sesion`, {
        statusCode: 401,
        body: { code: 401, msg: 'CLAVE INCORRECTA' }
      }).as('loginBad')
  
      cy.get('#email').type('hilary.calva@unl.edu.ec')
      cy.get('#password').type('contraseñaErrónea')
      cy.get('button[type=submit]').click()
  
      cy.wait('@loginBad').its('response.statusCode').should('eq', 401)
      cy.url().should('include', '/admin')
      cy.get('.swal2-popup').should('contain', 'CLAVE INCORRECTA')
    })
  
    it('login exitoso con datos reales y redirige', () => {
      // quito el stub global y dejo pasar al back real
      cy.intercept('POST', `${api}/sesion`).as('loginReal')
  
      cy.get('#email').type('hilary.calva@unl.edu.ec')
      cy.get('#password').type('kiara27')
      cy.get('button[type=submit]').click()
  
      cy.wait('@loginReal').its('response.statusCode').should('eq', 200)
      cy.url().should('include', '/principal/admin')
  
      cy.window().its('localStorage.token').should('exist')
      cy.window().its('localStorage.correo')
        .should('equal', 'hilary.calva@unl.edu.ec')
    })
  
    it('puede mostrar y ocultar la contraseña', () => {
      cy.get('#password').should('have.attr', 'type', 'password')
      cy.get('.btn-outline-secondary').click()
      cy.get('#password').should('have.attr', 'type', 'text')
      cy.get('.btn-outline-secondary').click()
      cy.get('#password').should('have.attr', 'type', 'password')
    })
  })
  
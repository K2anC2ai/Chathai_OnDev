describe('Simple Todo App', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000')
  })

  it.skip('Loads the app and adds a todo', () => {
    cy.get('input[name="task"]')
      .type('Learn Cypress')
    cy.get('button[type="submit"]')
      .click()
    cy.contains('Learn Cypress')
  })
})

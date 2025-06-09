describe('Simple Todo App', () => {
  before(() => {
    cy.visit('http://localhost:3000');
  });

  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('Add todo from list', () => {
    cy.readFile('xlsxtemplate/chathaiddt/testData.json').then((data) => {
      data.forEach((testData) => {
        cy.get('input[name="task"]')
          .type(`${testData.task}`)
        cy.get('button[type="submit"]')
          .click()
      });
    });
  });
});
describe('Test email for App', () => {
  before(() => {
    cy.visit('http://localhost:3000');
  });

  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('Submit email form', () => {
    cy.readFile('xlsxtemplate/chathaiddt/testData.json').then((data) => {
      data.forEach((testData) => {
        cy.get('input[name="email"]')
          .type(`${testData.email}`)
        cy.get('button[type="submit"]')
          .click()
      });
    });
  });
});

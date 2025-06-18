describe('Simple Todo App', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('try ddt', () => {
    cy.fixture('pie.json').then((pie) => {
      pie.forEach((pie) => {
        cy.get('input[name="username"]').clear().type(pie.email);
        cy.get('input[name="email"]').clear().type(pie.password);
        cy.get('button[type="submit"]').click();
        cy.contains(pie.expected);
      });
    });
  });
});

describe('Simple Todo App', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('try ddt', () => {
    cy.fixture('users.json').then((users) => {
      users.forEach((user) => {
        cy.get('input[name="username"]').clear().type(user.username);
        cy.get('input[name="password"]').clear().type(user.password);
        cy.get('button[type="submit"]').click();
        cy.contains(user.expected);
        cy.go('back');
      });
    });
  });
});

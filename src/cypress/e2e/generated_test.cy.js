describe('แบบทดสอบหน้าเว็บ', () => {
  it('กรอกชื่อแล้วกดส่ง', () => {
    cy.visit('http://localhost:8080')
    cy.get('#name').type('ขรรค์ชัย')
    cy.get('button').click()
    cy.get('#result').should('contain', 'สวัสดี ขรรชัย')
  })
})

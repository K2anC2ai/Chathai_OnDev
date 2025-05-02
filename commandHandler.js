function generateStepCode({ command, value, chaining, chained }) {
    let code = '';
    let isChained = false;
  
    if (command === 'visit') {
      code += `    cy.visit('${value}')\n`;
    }
  
    else if (command === 'get') {
      code += `    cy.get('${value}')`;
      isChained = true;
    }
  
    else if (chained && ['type', 'click', 'check', 'uncheck', 'select'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
    }
  
    else if (chained && command === 'should') {
      code += `.should(${formatValue(value)})\n`;
    }
  
    else if (chained && command === 'contains') {
      code += `.contains(${formatValue(value)})\n`;
    }
  
    else {
      code += `    cy.${command}(${formatValue(value)})\n`;
    }
  
    return { code, isChained };
  }
  
  function formatValue(val) {
    if (!val) return '';
    if (val.trim().startsWith('{') && val.trim().endsWith('}')) {
      return val; // เช่น {enter}
    }
    if (val.includes(',') && !val.includes('contain')) {
      const parts = val.split(',').map(v => `'${v.trim()}'`);
      return parts.join(', ');
    }
    return `'${val.trim()}'`;
  }
  
  module.exports = { generateStepCode };
  
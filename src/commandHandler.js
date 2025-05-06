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
  
    else if (chained && ['type', 'click', 'check', 'uncheck', 'select', 'focus', 'blur', 'clear', 'dblclick', 'rightclick', 'trigger', 'scrollIntoView', 'scrollTo'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
    }
  
    else if (chained && command === 'should') {
      code += `.should(${formatValue(value)})\n`;
    }
  
    else if (chained && command === 'contains') {
      code += `.contains(${formatValue(value)})\n`;
    }

    else if (chained && ['find', 'parent', 'parents', 'children', 'siblings', 'next', 'prev', 'first', 'last', 'eq', 'filter', 'not'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
      isChained = true;
    }

    else if (chained && ['wait', 'timeout'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
    }

    else if (chained && ['invoke', 'its'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
      isChained = true;
    }

    else if (chained && ['as', 'then'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
      isChained = true;
    }

    else if (chained && ['within', 'each'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
      isChained = true;
    }

    else if (chained && ['submit', 'reset'].includes(command)) {
      code += `.${command}()\n`;
    }

    else if (chained && ['selectFile', 'attachFile'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
    }

    else if (chained && ['drag', 'drop'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
    }

    else if (chained && ['hover', 'mouseover', 'mouseout'].includes(command)) {
      code += `.${command}()\n`;
    }

    else if (chained && ['screenshot'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
    }

    else if (chained && ['debug', 'pause'].includes(command)) {
      code += `.${command}()\n`;
    }

    else if (chained && ['reload', 'go'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
    }

    else if (chained && ['viewport'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
    }

    else if (chained && ['scrollTo'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
    }

    else if (chained && ['clearCookie', 'clearCookies', 'clearLocalStorage'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
    }

    else if (chained && ['getCookie', 'getCookies'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
      isChained = true;
    }

    else if (chained && ['setCookie'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
    }

    else if (chained && ['log'].includes(command)) {
      code += `.${command}(${formatValue(value)})\n`;
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
  //หัวควย
  module.exports = { generateStepCode };
  
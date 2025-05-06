function generateStepCode({ command, value, chaining, chained }) {
  let code = '';
  let isChained = false;

  const chainableCommands = [
    'type', 'click', 'check', 'uncheck', 'select', 'focus', 'blur', 'clear', 'dblclick',
    'rightclick', 'trigger', 'scrollIntoView', 'scrollTo', 'contains', 'wait', 'timeout',
    'invoke', 'its', 'as', 'then', 'within', 'each', 'submit', 'reset', 'selectFile',
    'attachFile', 'drag', 'drop', 'hover', 'mouseover', 'mouseout', 'screenshot', 'debug',
    'pause', 'reload', 'go', 'viewport', 'clearCookie', 'clearCookies', 'clearLocalStorage',
    'getCookie', 'getCookies', 'setCookie', 'log'
  ];

  const traversalCommands = [
    'find', 'parent', 'parents', 'children', 'siblings', 'next', 'prev', 'first',
    'last', 'eq', 'filter', 'not'
  ];

  if (command === 'visit') {
    code += `    cy.visit(${formatValue(value)})\n`;
  }

  else if (command === 'get') {
    code += `    cy.get(${formatValue(value)})`;
    isChained = true;
  }

  else if (chained && command === 'should') {
    code += `.should(${formatMultipleArgs(value)})\n`;
  }

  else if (chained && [...chainableCommands, ...traversalCommands].includes(command)) {
    code += `.${command}(${formatValue(value)})\n`;
    if (traversalCommands.includes(command)) isChained = true;
  }

  else if (chained && ['hover', 'mouseover', 'mouseout', 'debug', 'pause'].includes(command)) {
    code += `.${command}()\n`;
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
  return `'${val.trim()}'`;
}

function formatMultipleArgs(val) {
  if (!val) return '';
  const parts = val.split(',').map(p => `'${p.trim()}'`);
  return parts.join(', ');
}

module.exports = { generateStepCode };

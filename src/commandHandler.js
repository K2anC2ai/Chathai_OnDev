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
    code += formatShould(value);
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

// ฟังก์ชันใหม่สำหรับ should
function formatShould(val) {
  if (!val) return `.should()\n`;
  // แยก assertion กับ args
  const [assertion, ...args] = splitAssertionArgs(val);
  if (args.length === 0) {
    return `.should('${assertion}')\n`;
  }
  // Special case: if the only arg is ...args, output without quotes
  if (args.length === 1 && args[0].trim().replace(/^['"]|['"]$/g, '') === '...args') {
    return `.should('${assertion}', ...args)\n`;
  }
  // ถ้า arg เป็น function, array, object, number, boolean, regex, ไม่ต้องใส่ ''
  const formattedArgs = args.map(formatArg).join(', ');
  return `.should('${assertion}', ${formattedArgs})\n`;
}

// แยก assertion กับ args (รองรับ comma ใน object/array/function)
function splitAssertionArgs(val) {
  // ใช้ regex แยก assertion กับ args
  const match = val.match(/^([^,]+)(?:,(.*))?$/s);
  if (!match) return [val];
  const assertion = match[1].trim();
  if (!match[2]) return [assertion];
  // แยก args โดยไม่ตัด comma ใน [] {} ()
  const args = smartSplit(match[2]);
  return [assertion, ...args];
}

// แยก args โดยไม่ตัด comma ใน [] {} ()
function smartSplit(str) {
  const result = [];
  let buf = '', depth = 0, inQuote = false, quoteChar = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if ((c === "'" || c === '"') && (i === 0 || str[i-1] !== '\\')) {
      if (!inQuote) { inQuote = true; quoteChar = c; }
      else if (c === quoteChar) { inQuote = false; }
      buf += c;
    } else if (!inQuote && (c === '[' || c === '{' || c === '(')) {
      depth++;
      buf += c;
    } else if (!inQuote && (c === ']' || c === '}' || c === ')')) {
      depth--;
      buf += c;
    } else if (!inQuote && c === ',' && depth === 0) {
      result.push(buf.trim());
      buf = '';
    } else {
      buf += c;
    }
  }
  if (buf.trim()) result.push(buf.trim());
  return result;
}

// ฟอร์แมต argument
function formatArg(arg) {
  if (!arg) return '';
  const trimmed = arg.trim();
  // Special case: ...args (spread)
  if (trimmed === '...args') return '...args';
  // ถ้าเป็น function, array, object, number, boolean, regex, ไม่ต้องใส่ ''
  if (/^(\[.*\]|\{.*\}|(\(\s*.*\s*\)\s*=>)|\/.*\/[gimsuy]*|true|false|null|undefined|[0-9.]+)$/.test(trimmed)) {
    return trimmed;
  }
  // ถ้าเป็น string ที่ล้อมด้วย '' หรือ ""
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed;
  }
  // อื่นๆ ใส่ ''
  return `'${trimmed}'`;
}

function formatValue(val) {
  if (!val) return '';
  if (val.trim().startsWith('{') && val.trim().endsWith('}')) {
    return val; // เช่น {enter}
  }
  return `'${val.trim()}'`;
}

module.exports = { generateStepCode };

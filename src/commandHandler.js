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

  else if (command === 'contains') {
    // Support one or two args: e.g., "button, ใช้คูปอง" or "button/ใช้คูปอง"
    let raw = String(value || '');
    if (raw.includes('/') && !raw.includes(',')) {
      raw = raw.replace('/', ',');
    }
    const parts = raw ? smartSplit(String(raw)) : [];
    const args = parts.length > 0
      ? parts.map((p, idx) => idx === 0 ? forceStringArg(p) : formatArg(p)).join(', ')
      : '';
    // Always start a new cy.contains to avoid invalid chaining after input commands
    code += `    cy.contains(${args})\n`;
    isChained = true; // allow further chaining like .click()
  }

  else if (command === 'should') {
    // Always format should correctly, whether chained or not
    if (chained) {
      code += formatShould(value);
      // keep chain alive after should to allow subsequent chained commands like .click()
      isChained = true;
    } else {
      code += `    cy.should${formatShould(value, true)}`;
      // even when not previously chained, allow continuing chain semantics
      isChained = true;
    }
  }

  else if (chained && [...chainableCommands, ...traversalCommands].includes(command)) {
    code += `.${command}(${formatValue(value)})\n`;
    // Keep chain alive after any chainable/traversal command
    isChained = true;
  }

  // commands like hover/mouseover/mouseout are already handled by the generic chainable path

  else {
    code += `    cy.${command}(${formatValue(value)})\n`;
  }

  return { code, isChained };
}

// ฟังก์ชันใหม่สำหรับ should
function formatShould(val, forceParen = false) {
  if (!val) return forceParen ? '()\n' : `.should()\n`;
  // แยก assertion กับ args
  const [assertion, ...args] = splitAssertionArgs(val);
  if (args.length === 0) {
    return forceParen ? `('${assertion}')\n` : `.should('${assertion}')\n`;
  }
  if (args.length === 1 && args[0].trim().replace(/^['"]|['"]$/g, '') === '...args') {
    return forceParen ? `('${assertion}', ...args)\n` : `.should('${assertion}', ...args)\n`;
  }
  const formattedArgs = args.map(formatArg).join(', ');
  return forceParen
    ? `('${assertion}', ${formattedArgs})\n`
    : `.should('${assertion}', ${formattedArgs})\n`;
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
  // If it's a function, array, object, number, boolean, regex, don't quote
  if (/^(\[.*\]|\{.*\}|(\(\s*.*\s*\)\s*=>)|\/.*\/[gimsuy]*|true|false|null|undefined|[0-9.]+)$/.test(trimmed)) {
    return trimmed;
  }
  // If it's a string already quoted
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed;
  }
  // If it's a valid JS identifier (variable name), don't quote
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
    return trimmed;
  }
  // Otherwise, quote as string
  return `'${trimmed}'`;
}

function formatValue(val) {
  if (!val) return '';
  const trimmed = val.trim();
  // Support DDT placeholders like {{field}}
  // If the whole value is a single placeholder, return row.field
  const singlePlaceholder = trimmed.match(/^\{\{\s*([\w.$]+)\s*\}\}$/);
  if (singlePlaceholder) {
    return `row.${singlePlaceholder[1]}`;
  }
  // If contains placeholders mixed with text, use template string
  if (trimmed.includes('{{')) {
    const tplInner = trimmed.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, '${row.$1}');
    const escaped = tplInner.replace(/`/g, '\\`');
    return `\`${escaped}\``;
  }
  // If already a template or contains interpolation for row, respect as-is
  if ((trimmed.startsWith('`') && trimmed.endsWith('`')) || trimmed.includes('${row.')) {
    return trimmed;
  }
  // Keep special key braces e.g., {enter}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }
  return `'${trimmed}'`;
}

// Force first contains argument to be a quoted string selector when not already quoted
function forceStringArg(arg) {
  if (!arg) return "''";
  const trimmed = String(arg).trim();
  // If already quoted or template/backtick, keep as-is
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith('`') && trimmed.endsWith('`'))) {
    return trimmed;
  }
  // If looks like a valid JS identifier (variable), still force string for selector semantics
  const escaped = trimmed.replace(/'/g, "\\'");
  return `'${escaped}'`;
}

module.exports = { generateStepCode };

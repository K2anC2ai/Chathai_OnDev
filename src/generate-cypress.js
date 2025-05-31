const fs = require('fs');
const xlsx = require('xlsx');
const { generateStepCode } = require('./commandHandler'); // <-- ใช้ handler แยกไฟล์
const path = require('path');

function generateCypressTests(excelPath, outputDir) {
  const dir = path.join(process.cwd(), outputDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // อ่าน Excel
  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  // Group test cases
  const grouped = {};
  data.forEach(row => {
    const scenario = row['TestScenario(des)'];
    const testCase = row['Test case(IT)'];
    if (!grouped[scenario]) grouped[scenario] = {};
    if (!grouped[scenario][testCase]) grouped[scenario][testCase] = [];
    grouped[scenario][testCase].push(row);
  });

  // Generate script
  let output = '';
  for (const [scenario, testCases] of Object.entries(grouped)) {
    output += `describe('${scenario}', () => {\n`;
    
    // Handle hooks for each scenario
    const hooks = {
      before: [],
      beforeEach: [],
      after: [],
      afterEach: []
    };

    // Collect hooks from all test cases
    for (const testCase of Object.values(testCases)) {
      for (const step of testCase) {
        const hook = step.hook?.toLowerCase();
        // Only process if hook is not 'none' and is a valid hook type
        if (hook && hook !== 'none' && ['before', 'beforeeach', 'after', 'aftereach'].includes(hook)) {
          const { command, value, chaining } = parseStep(step);
          const { code } = generateStepCode({ command, value, chaining, chained: false, hook });
          const hookKey = hook === 'beforeeach' ? 'beforeEach' : hook;
          if (hooks[hookKey]) {
            hooks[hookKey].push(code);
          }
        }
      }
    }

    // Add hooks to output
    if (hooks.before.length > 0) {
      output += '  before(() => {\n';
      output += hooks.before.join('');
      output += '  })\n\n';
    }
    if (hooks.beforeEach.length > 0) {
      output += '  beforeEach(() => {\n';
      output += hooks.beforeEach.join('');
      output += '  })\n\n';
    }

    // Generate test cases
    for (const [testCase, steps] of Object.entries(testCases)) {
      // Get the only value from the first step of the test case
      const onlyValue = steps[0]?.only?.toLowerCase();
      let testPrefix = '  it';
      
      // Handle only options - only add .only or .skip if value is 'yes' or 'skip'
      if (onlyValue === 'yes') {
        testPrefix = '  it.only';
      } else if (onlyValue === 'skip') {
        testPrefix = '  it.skip';
      }

      output += `${testPrefix}('${testCase}', () => {\n`;
      let chained = false;
      let currentLine = '';

      // Filter out hook steps and sort by order
      const testSteps = steps
        .filter(step => !step.hook || step.hook.toLowerCase() === 'none')
        .sort((a, b) => {
          const aOrder = a.order || 0;
          const bOrder = b.order || 0;
          return aOrder - bOrder;
        });
      
      for (const step of testSteps) {
        const { command, value, chaining } = parseStep(step);
        const { code, isChained } = generateStepCode({ command, value, chaining, chained });
        
        if (chained) {
          currentLine += code;
        } else {
          if (currentLine) {
            output += currentLine + '\n';
            currentLine = '';
          }
          output += code;
        }
        chained = isChained;
      }

      // Add any remaining chained commands
      if (currentLine) {
        output += currentLine + '\n';
      }

      output += `  })\n`;
    }

    // Add after hooks
    if (hooks.after.length > 0) {
      output += '\n  after(() => {\n';
      output += hooks.after.join('');
      output += '  })\n';
    }
    if (hooks.afterEach.length > 0) {
      output += '\n  afterEach(() => {\n';
      output += hooks.afterEach.join('');
      output += '  })\n';
    }

    output += `})\n`;
  }

  // Save file
  const outputPath = path.join(dir, 'generated_test.cy.js');
  fs.writeFileSync(outputPath, output, 'utf-8');
  console.log('✅ Complete generate test script', outputPath);
}

function parseStep(step) {
  return {
    command: step.command?.trim(),
    value: step['value/target'],
    chaining: step['chaining?']?.toUpperCase() === 'YES',
    hook: step.hook?.trim(),
    only: step.only?.trim(),
    order: step.order || 0
  };
}

module.exports = { generateCypressTests };
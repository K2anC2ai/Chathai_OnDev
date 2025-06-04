const fs = require('fs');
const xlsx = require('xlsx');
const { generateStepCode } = require('./commandHandler');
const path = require('path');

function generateCypressTests(excelPath, outputDir, projectDir) {
  console.log('Chathai CLI: process.cwd() =', process.cwd());
  console.log('Chathai CLI: outputDir =', outputDir);
  console.log('Chathai CLI: projectDir =', projectDir);

  // Always resolve outputDir relative to projectDir
  const dir = path.isAbsolute(outputDir) ? outputDir : path.join(projectDir, outputDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Read Excel
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

    // Collect hooks at describe level
    const describeHooks = { before: [], beforeEach: [], after: [], afterEach: [] };

    // Collect test cases
    for (const [testCase, steps] of Object.entries(testCases)) {
      // Split steps by hook and main test
      const hooks = { before: [], beforeEach: [], after: [], afterEach: [] };
      const mainSteps = [];
      let onlyFlag = false, skipFlag = false;

      for (const step of steps) {
        const hookRaw = (step.hook || '').toLowerCase();
        const only = (step.only || '').toLowerCase();
        const skip = (step.only || '').toLowerCase();

        // Map hook names to camelCase keys
        const hookKeyMap = {
          before: 'before',
          beforeeach: 'beforeEach',
          after: 'after',
          aftereach: 'afterEach'
        };
        const hook = hookKeyMap[hookRaw];

        // Mark only/skip for this test
        if (only === 'yes' || only === 'only') onlyFlag = true;
        if (skip === 'skip') skipFlag = true;

        if (hook) {
          hooks[hook].push(step);
        } else {
          mainSteps.push(step);
        }
      }

      // Add hooks to describe-level if not already present
      for (const hookType of ['before', 'beforeEach', 'after', 'afterEach']) {
        if (hooks[hookType] && hooks[hookType].length > 0) {
          describeHooks[hookType].push(...hooks[hookType]);
        }
      }

      // Generate test case
      let itType = 'it';
      if (onlyFlag) itType = 'it.only';
      if (skipFlag) itType = 'it.skip';

      output += `  ${itType}('${testCase}', () => {\n`;
      let chained = false;
      for (const step of mainSteps) {
        const { command, value, chaining } = parseStep(step);
        const { code, isChained } = generateStepCode({ command, value, chaining, chained });
        output += code;
        chained = isChained;
      }
      if (chained) output += '\n';
      output += `  })\n`;
    }

    // Generate hooks at describe level (after all test cases)
    for (const hookType of ['before', 'beforeEach', 'after', 'afterEach']) {
      if (describeHooks[hookType].length > 0) {
        output = insertHookBlock(output, hookType, describeHooks[hookType]);
      }
    }

    output += `})\n`;
  }

  // Save file
  const excelBaseName = path.basename(excelPath, path.extname(excelPath));
  const outputFileName = `${excelBaseName}.cy.js`;
  const outputPath = path.join(dir, outputFileName);
  fs.writeFileSync(outputPath, output, 'utf-8');
  console.log('✅ Complete generate test script', outputPath);
}

function insertHookBlock(output, hookType, steps) {
  // Find the position after describe('...', () => {
  const lines = output.split('\n');
  let insertIdx = 1;
  // Insert after the first line (describe)
  let hookBlock = `  ${hookType}(() => {\n`;
  let chained = false;
  for (const step of steps) {
    // Force chaining for should commands
    const isShould = (step.command || '').trim() === 'should';
    const { command, value, chaining } = {
      command: step.command?.trim(),
      value: step['value/target'],
      chaining: isShould ? true : (step['chaining?']?.toUpperCase() === 'YES')
    };
    const { code, isChained } = generateStepCode({ command, value, chaining, chained });
    hookBlock += code;
    chained = isChained;
  }
  if (chained) hookBlock += '\n';
  hookBlock += `  })\n`;
  lines.splice(insertIdx, 0, hookBlock);
  return lines.join('\n');
}

function parseStep(step) {
  return {
    command: step.command?.trim(),
    value: step['value/target'],
    chaining: step['chaining?']?.toUpperCase() === 'YES'
  };
}

module.exports = { generateCypressTests };
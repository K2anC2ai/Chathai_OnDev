const fs = require('fs');
const xlsx = require('xlsx');
const { generateStepCode } = require('./commandHandler');
const { generateDDTCode, isDDTTest } = require('./ddtHandler');
const path = require('path');
const Papa = require('papaparse');

function generateCypressTests(excelPath, outputDir, projectDir) {
  console.log('Chathai CLI: process.cwd() =', process.cwd());
  console.log('Chathai CLI: outputDir =', outputDir);
  console.log('Chathai CLI: projectDir =', projectDir);

  // Always resolve outputDir relative to projectDir
  const dir = path.isAbsolute(outputDir) ? outputDir : path.join(projectDir, outputDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create empty fixtures folder
  const fixturesDir = path.join(projectDir, 'cypress', 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
    console.log('✅ Created empty fixtures folder:', fixturesDir);
  }

  // --- Auto-convert CSV/XLSX fixtures to JSON ---
  // Scan for all .csv and .xlsx files in fixturesDir
  const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.csv') || f.endsWith('.xlsx'));
  fixtureFiles.forEach(fixtureFile => {
    const ext = path.extname(fixtureFile).toLowerCase();
    const base = path.basename(fixtureFile, ext);
    const jsonPath = path.join(fixturesDir, base + '.json');
    if (fs.existsSync(jsonPath)) return; // Already converted
    if (ext === '.csv') {
      const csvString = fs.readFileSync(path.join(fixturesDir, fixtureFile), 'utf-8');
      const parsed = Papa.parse(csvString, { header: true });
      fs.writeFileSync(jsonPath, JSON.stringify(parsed.data, null, 2), 'utf-8');
      console.log('✅ Converted CSV to JSON:', fixtureFile, '->', base + '.json');
    } else if (ext === '.xlsx') {
      const wb = xlsx.readFile(path.join(fixturesDir, fixtureFile));
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(ws);
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log('✅ Converted XLSX to JSON:', fixtureFile, '->', base + '.json');
    }
  });
  // --- End auto-convert ---

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
    // Check if any test case in this scenario is a DDT test
    const hasDDTTest = Object.values(testCases).some(steps => isDDTTest(steps));
    
    if (hasDDTTest) {
      // For DDT tests, use the DDT code generator
      const ddtSteps = Object.values(testCases)[0]; // Take the first test case
      const ddtCode = generateDDTCode(ddtSteps);
      if (ddtCode) {
        output += ddtCode;
        continue;
      }
    }

    // For non-DDT tests, use the regular code generator
    output += `describe('${scenario}', () => {\n`;

    // Add fixture import comment
    output += `  // Import your test data from fixtures folder\n`;
    output += `  // Example: const testData = require('../fixtures/your-data-file.json');\n\n`;

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
const fs = require('fs');
const xlsx = require('xlsx');
const { generateStepCode } = require('./commandHandler');
const path = require('path');

function readDataFile(filePath) {
  const fileExt = path.extname(filePath).toLowerCase();
  
  try {
    switch (fileExt) {
      case '.csv':
        const workbook = xlsx.readFile(filePath, { raw: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        return xlsx.utils.sheet_to_json(sheet);
      
      case '.json':
        const jsonContent = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(jsonContent);
      
      case '.xlsx':
        const xlsxWorkbook = xlsx.readFile(filePath);
        const xlsxSheet = xlsxWorkbook.Sheets[xlsxWorkbook.SheetNames[0]];
        return xlsx.utils.sheet_to_json(xlsxSheet);
      
      default:
        console.warn(`⚠️ Unsupported file type: ${fileExt} for file: ${filePath}`);
        return [];
    }
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message);
    return [];
  }
}

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

  // Read DDT data if exists
  const ddtData = {};
  const ddtPath = path.join(projectDir, 'xlsxtemplate/chathaiddt');
  if (fs.existsSync(ddtPath)) {
    const ddtFiles = fs.readdirSync(ddtPath).filter(file => 
      file.endsWith('.csv') || 
      file.endsWith('.json') || 
      file.endsWith('.xlsx')
    );
    
    for (const file of ddtFiles) {
      const filePath = path.join(ddtPath, file);
      const records = readDataFile(filePath);
      if (records && records.length > 0) {
        const baseName = path.basename(file, path.extname(file));
        ddtData[baseName] = records;
      }
    }
  }

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

    // Add before hook for initial visit
    output += `  before(() => {\n`;
    output += `    cy.visit('http://localhost:3000');\n`;
    output += `  });\n\n`;

    // Add beforeEach hook for visit
    output += `  beforeEach(() => {\n`;
    output += `    cy.visit('http://localhost:3000');\n`;
    output += `  });\n\n`;

    // Collect test cases
    for (const [testCase, steps] of Object.entries(testCases)) {
      // Split steps by hook and main test
      const mainSteps = [];
      let onlyFlag = false, skipFlag = false;
      let ddtFile = null;

      for (const step of steps) {
        const only = (step.only || '').toLowerCase();
        const skip = (step.skip || '').toLowerCase();
        const ddt = step['ddt_file'];

        // Mark only/skip for this test
        if (only === 'yes' || only === 'only') onlyFlag = true;
        if (skip === 'skip') skipFlag = true;
        if (ddt) ddtFile = ddt;

        if (step.command !== 'visit') { // Skip visit in main steps
          mainSteps.push(step);
        }
      }

      // Generate test case
      let itType = 'it';
      if (onlyFlag) itType = 'it.only';
      if (skipFlag) itType = 'it.skip';

      if (ddtFile && ddtData[ddtFile]) {
        // Generate DDT test case using cy.readFile
        output += `  ${itType}('${testCase}', () => {\n`;
        const fileExt = Object.keys(ddtData).find(key => key === ddtFile) ? 
          path.extname(fs.readdirSync(ddtPath).find(file => 
            path.basename(file, path.extname(file)) === ddtFile
          )) : '.json';
        output += `    cy.readFile('xlsxtemplate/chathaiddt/${ddtFile}${fileExt}').then((data) => {\n`;
        output += `      data.forEach((testData) => {\n`;
        
        // Process each step with proper command chaining
        for (const step of mainSteps) {
          const { command, value, chaining } = parseStep(step);
          const processedValue = processValueWithTestData(value, 'testData');
          
          // Generate proper Cypress command with chaining
          if (command === 'get') {
            output += `        cy.get(${formatValue(processedValue)})\n`;
          } else if (command === 'type') {
            output += `          .type(\`\${testData.${processedValue}}\`)\n`;
          } else if (command === 'click') {
            output += `          .click()\n`;
          } else if (command === 'contains') {
            output += `        cy.contains(\`\${testData.${processedValue}}\`)\n`;
          }
        }
        
        output += `      });\n`;
        output += `    });\n`;
        output += `  });\n`;
      } else {
        // Generate regular test case
        output += `  ${itType}('${testCase}', () => {\n`;
        for (const step of mainSteps) {
          const { command, value, chaining } = parseStep(step);
          if (command === 'get') {
            output += `    cy.get(${formatValue(value)})\n`;
          } else if (command === 'type') {
            output += `      .type(${formatValue(value)})\n`;
          } else if (command === 'click') {
            output += `      .click()\n`;
          } else if (command === 'contains') {
            output += `    cy.contains(${formatValue(value)})\n`;
          }
        }
        output += `  });\n`;
      }
    }

    output += `});\n`;
  }

  // Save file
  const excelBaseName = path.basename(excelPath, path.extname(excelPath));
  const outputFileName = `${excelBaseName}.cy.js`;
  const outputPath = path.join(dir, outputFileName);
  fs.writeFileSync(outputPath, output, 'utf-8');
  console.log('✅ Complete generate test script', outputPath);
}

function processValueWithTestData(value, testDataVar) {
  if (!value) return value;
  // Extract the key from ${key} format
  const match = value.match(/\${([^}]+)}/);
  return match ? match[1] : value;
}

function formatValue(val) {
  if (!val) return '';
  if (val.trim().startsWith('{') && val.trim().endsWith('}')) {
    return val; // เช่น {enter}
  }
  return `'${val.trim()}'`;
}

function parseStep(step) {
  return {
    command: step.command?.trim(),
    value: step['value/target'],
    chaining: step['chaining?']?.toUpperCase() === 'YES'
  };
}

module.exports = { generateCypressTests };
const fs = require('fs');
const path = require('path');
const { generateStepCode } = require('./commandHandler');

function generateDDTCode(steps) {
  // Find all DDT steps to identify fixture files
  const ddtSteps = steps.filter(step => 
    (step.command === 'type' || step.command === 'contains') && 
    step['value/target']?.startsWith('ddt,')
  );

  if (ddtSteps.length === 0) {
    return null; // Not a DDT test
  }

  // Extract unique fixture files
  const fixtureFiles = [...new Set(ddtSteps.map(step => {
    let [_, fixtureFile] = step['value/target'].split(',');
    // Remove extension if present, always use .json
    fixtureFile = fixtureFile.replace(/\.(xlsx|csv|json)$/i, '');
    return fixtureFile + '.json';
  }))];

  // Generate the DDT code
  let code = `describe('${steps[0]['TestScenario(des)']}', () => {\n`;
  
  // Add beforeEach hooks
  const beforeEachSteps = steps.filter(step => step.hook?.toLowerCase() === 'beforeeach');
  if (beforeEachSteps.length > 0) {
    code += '  beforeEach(() => {\n';
    beforeEachSteps.forEach(step => {
      if (step.command === 'visit') {
        code += `    cy.visit('${step['value/target']}');\n`;
      }
    });
    code += '  });\n\n';
  }

  // Add the test case
  code += `  it('${steps[0]['Test case(IT)']}', () => {\n`;

  if (fixtureFiles.length === 1) {
    // Single fixture file - simple case
    const fixtureFile = fixtureFiles[0];
    const fixtureName = path.basename(fixtureFile, path.extname(fixtureFile));
    const itemName = fixtureName.replace(/s$/, '');
    
    code += `    cy.fixture('${fixtureFile}').then((${fixtureName}) => {\n`;
    code += `      ${fixtureName}.forEach((${itemName}) => {\n`;
    
    // Add the test steps
    const testSteps = steps.filter(step => !step.hook);
    let currentSelector = '';
    let chained = false;
    let prevCommand = null;

    testSteps.forEach(step => {
      const command = step.command?.trim();
      const value = step['value/target'];
      const chaining = step['chaining?']?.toUpperCase() === 'YES';

      if (command === 'get') {
        currentSelector = value;
        code += `        cy.get('${value}')`;
        chained = true;
      } else if (command === 'type' && value?.startsWith('ddt,')) {
        let [_, fixtureFile, dataPath] = value.split(',');
        fixtureFile = fixtureFile.replace(/\.(xlsx|csv|json)$/i, '');
        // Always use .json for fixture
        const fixtureName = fixtureFile;
        const itemName = fixtureName.replace(/s$/, '');
        if (prevCommand === 'clear' && chained) {
          code += `.type(${itemName}.${dataPath});\n`;
        } else {
          code += `.clear().type(${itemName}.${dataPath});\n`;
        }
        chained = false;
      } else if (command === 'contains' && value?.startsWith('ddt,')) {
        let [_, fixtureFile, dataPath] = value.split(',');
        fixtureFile = fixtureFile.replace(/\.(xlsx|csv|json)$/i, '');
        const fixtureName = fixtureFile;
        const itemName = fixtureName.replace(/s$/, '');
        code += `        cy.contains(${itemName}.${dataPath});\n`;
        chained = false;
      } else if (command === 'clear' && chaining) {
        code += `.clear()`;
        chained = true;
      } else if (command === 'click' && chaining) {
        code += `.click();\n`;
        chained = false;
      } else if (command === 'go') {
        code += `        cy.go('${value}');\n`;
        chained = false;
      } else {
        // Use the general command handler for other commands
        const { code: stepCode, isChained } = generateStepCode({ 
          command, 
          value, 
          chaining, 
          chained 
        });
        code += stepCode.replace(/^    /, '        '); // Adjust indentation
        chained = isChained;
      }
      prevCommand = command;
    });

    code += `      });\n`;
    code += `    });\n`;
  } else {
    // Multiple fixture files - need to handle data combination
    code += `    // Load multiple fixture files\n`;
    fixtureFiles.forEach((fixtureFile, index) => {
      const fixtureName = path.basename(fixtureFile, path.extname(fixtureFile));
      code += `    cy.fixture('${fixtureFile}').as('${fixtureName}');\n`;
    });
    
    code += `    cy.get('@${path.basename(fixtureFiles[0], path.extname(fixtureFiles[0]))}').then((${path.basename(fixtureFiles[0], path.extname(fixtureFiles[0])).replace(/s$/, '')}) => {\n`;
    code += `      ${path.basename(fixtureFiles[0], path.extname(fixtureFiles[0])).replace(/s$/, '')}.forEach((user, index) => {\n`;
    
    // Add the test steps
    const testSteps = steps.filter(step => !step.hook);
    let currentSelector = '';
    let chained = false;
    let prevCommand = null;

    testSteps.forEach(step => {
      const command = step.command?.trim();
      const value = step['value/target'];
      const chaining = step['chaining?']?.toUpperCase() === 'YES';

      if (command === 'get') {
        currentSelector = value;
        code += `        cy.get('${value}')`;
        chained = true;
      } else if (command === 'type' && value?.startsWith('ddt,')) {
        let [_, fixtureFile, dataPath] = value.split(',');
        fixtureFile = fixtureFile.replace(/\.(xlsx|csv|json)$/i, '');
        const fixtureName = fixtureFile;
        const itemName = fixtureName.replace(/s$/, '');
        if (prevCommand === 'clear' && chained) {
          code += `.type(${itemName}.${dataPath});\n`;
        } else {
          code += `.clear().type(${itemName}.${dataPath});\n`;
        }
        chained = false;
      } else if (command === 'contains' && value?.startsWith('ddt,')) {
        let [_, fixtureFile, dataPath] = value.split(',');
        fixtureFile = fixtureFile.replace(/\.(xlsx|csv|json)$/i, '');
        const fixtureName = fixtureFile;
        const itemName = fixtureName.replace(/s$/, '');
        code += `        cy.get('@${fixtureName}').then((${fixtureName}) => {\n`;
        code += `          cy.contains(${fixtureName}[index].${dataPath});\n`;
        code += `        });\n`;
        chained = false;
      } else if (command === 'clear' && chaining) {
        code += `.clear()`;
        chained = true;
      } else if (command === 'click' && chaining) {
        code += `.click();\n`;
        chained = false;
      } else if (command === 'go') {
        code += `        cy.go('${value}');\n`;
        chained = false;
      } else {
        // Use the general command handler for other commands
        const { code: stepCode, isChained } = generateStepCode({ 
          command, 
          value, 
          chaining, 
          chained 
        });
        code += stepCode.replace(/^    /, '        '); // Adjust indentation
        chained = isChained;
      }
      prevCommand = command;
    });

    code += `      });\n`;
    code += `    });\n`;
  }

  code += `  });\n`;
  code += `});\n`;

  return code;
}

function isDDTTest(steps) {
  return steps.some(step => 
    (step.command === 'type' || step.command === 'contains') && 
    step['value/target']?.startsWith('ddt,')
  );
}

module.exports = {
  generateDDTCode,
  isDDTTest
}; 
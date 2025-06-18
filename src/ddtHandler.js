const fs = require('fs');
const path = require('path');

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
    const [_, fixtureFile] = step['value/target'].split(',');
    return fixtureFile;
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

    testSteps.forEach(step => {
      if (step.command === 'get') {
        currentSelector = step['value/target'];
      } else if (step.command === 'type' && step['value/target']?.startsWith('ddt,')) {
        const [_, __, dataPath] = step['value/target'].split(',');
        code += `        cy.get('${currentSelector}').clear().type(${itemName}.${dataPath});\n`;
      } else if (step.command === 'contains' && step['value/target']?.startsWith('ddt,')) {
        const [_, __, dataPath] = step['value/target'].split(',');
        code += `        cy.contains(${itemName}.${dataPath});\n`;
      } else if (step.command === 'click') {
        code += `        cy.get('${currentSelector}').click();\n`;
      }
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

    testSteps.forEach(step => {
      if (step.command === 'get') {
        currentSelector = step['value/target'];
      } else if (step.command === 'type' && step['value/target']?.startsWith('ddt,')) {
        const [_, fixtureFile, dataPath] = step['value/target'].split(',');
        const fixtureName = path.basename(fixtureFile, path.extname(fixtureFile));
        const itemName = fixtureName.replace(/s$/, '');
        code += `        cy.get('${currentSelector}').clear().type(${itemName}.${dataPath});\n`;
      } else if (step.command === 'contains' && step['value/target']?.startsWith('ddt,')) {
        const [_, fixtureFile, dataPath] = step['value/target'].split(',');
        const fixtureName = path.basename(fixtureFile, path.extname(fixtureFile));
        const itemName = fixtureName.replace(/s$/, '');
        code += `        cy.get('@${fixtureName}').then((${fixtureName}) => {\n`;
        code += `          cy.contains(${fixtureName}[index].${dataPath});\n`;
        code += `        });\n`;
      } else if (step.command === 'click') {
        code += `        cy.get('${currentSelector}').click();\n`;
      }
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
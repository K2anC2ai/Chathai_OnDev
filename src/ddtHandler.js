const fs = require('fs');
const path = require('path');

function generateDDTCode(steps) {
  // Find the fixture file from the steps
  const fixtureStep = steps.find(step => 
    step.command === 'type' && 
    step['value/target']?.startsWith('ddt,')
  );

  if (!fixtureStep) {
    return null; // Not a DDT test
  }

  const [_, fixtureFile] = fixtureStep['value/target'].split(',');
  // Get the base name of the fixture file without extension
  const fixtureName = path.basename(fixtureFile, path.extname(fixtureFile));
  // Convert to singular form for the item variable
  const itemName = fixtureName.replace(/s$/, '');
  
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
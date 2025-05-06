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
    for (const [testCase, steps] of Object.entries(testCases)) {
      output += `  it('${testCase}', () => {\n`;
      let chained = false;

      for (const step of steps) {
        const { command, value, chaining } = parseStep(step);
        const { code, isChained } = generateStepCode({ command, value, chaining, chained });
        output += code;
        chained = isChained;
      }

      if (chained) output += '\n'; // จบบรรทัดที่ยังไม่ขึ้นบรรทัดใหม่
      output += `  })\n`;
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
    chaining: step['chaining?']?.toUpperCase() === 'YES'
  };
}

module.exports = { generateCypressTests };
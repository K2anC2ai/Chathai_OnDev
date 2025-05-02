const fs = require('fs');
const xlsx = require('xlsx');
const { generateStepCode } = require('./commandHandler'); // <-- ใช้ handler แยกไฟล์
const path = require('path');


const dir = path.join(__dirname, 'cypress', 'e2e');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}





// อ่าน Excel
const workbook = xlsx.readFile('xlsxtemplate/chathai-templateV.1.0.0.xlsx');
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
fs.writeFileSync('cypress/e2e/generated_test.cy.js', output, 'utf-8');
console.log('✅ สร้าง Cypress test แล้ว');

function parseStep(step) {
  return {
    command: step.command?.trim(),
    value: step['value/target'],
    chaining: step['chaining?']?.toUpperCase() === 'YES'
  };
}


fs.writeFileSync(path.join(dir, 'generated_test.cy.js'), output, 'utf-8');
console.log('✅ สร้าง Cypress test แล้วที่ cypress/e2e/generated_test.cy.js');
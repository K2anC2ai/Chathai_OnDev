const fs = require('fs');
const xlsx = require('xlsx');
const { generateStepCode } = require('./commandHandler');
const path = require('path');

function generateCypressTests(excelPath, outputDir, projectDir, options = {}) {
  // แสดงบริบทการรัน CLI (debug)
  console.log('Chathai CLI: process.cwd() =', process.cwd());
  console.log('Chathai CLI: outputDir =', outputDir);
  console.log('Chathai CLI: projectDir =', projectDir);
  // รับค่า option จาก CLI: โหมด DDT, ชื่อ fixture และกล่องสะสมคำเตือน
  const { ddt = false, fixture = null, warnings = [] } = options;

  // ตัวช่วยบันทึกคำเตือนจากขั้นตอน generate
  function warn(message) {
    if (warnings && Array.isArray(warnings)) warnings.push(message);
  }

  // สร้างโฟลเดอร์เป้าหมาย (outputDir) แบบอิงจาก projectDir เสมอ
  const dir = path.isAbsolute(outputDir) ? outputDir : path.join(projectDir, outputDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // อ่านไฟล์ Excel จากชีตแรกและแปลงเป็น JSON
  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  // ตรวจสอบคอลัมน์ที่จำเป็นต้องมีใน Excel
  const requiredColumns = ['TestScenario(des)', 'Test case(IT)', 'command'];
  const headerRow = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0] || [];
  for (const col of requiredColumns) {
    if (!headerRow.includes(col)) {
      warn(`Missing required column: ${col}`);
    }
  }

  // จัดกลุ่มข้อมูลเป็น Scenario -> Test case -> Steps
  const grouped = {};
  data.forEach(row => {
    const scenario = row['TestScenario(des)'];
    const testCase = row['Test case(IT)'];
    const command = (row.command || '').trim();
    const value = row['value/target'];
    const hookName = (row.hook || '').trim();

    // เตือนเมื่อมีการใช้ชื่อ hook ที่ไม่รู้จัก
    const validHooks = ['before', 'beforeEach', 'after', 'afterEach', '', null, undefined];
    if (!validHooks.includes(hookName.toLowerCase())) {
      warn(`Unknown hook: "${hookName}" (allowed: before, beforeEach, after, afterEach)`);
    }

    // เตือนเมื่อมี {{placeholder}} แต่ไม่ได้เปิดโหมด DDT
    if (!ddt && typeof value === 'string' && /\{\{.+?\}\}/.test(value)) {
      warn(`Found placeholder {{...}} without DDT enabled at test "${testCase}"`);
    }

    // เตือนเมื่อรูปแบบ contains ไม่น่าใช้งาน (ไม่มีคั่นด้วย , หรือ /)
    if (command === 'contains' && typeof value === 'string') {
      if (!value.includes(',') && !value.includes('/')) {
        warn(`"contains" value should be two args separated by comma or slash: got "${value}"`);
      }
    }

    if (!grouped[scenario]) grouped[scenario] = {};
    if (!grouped[scenario][testCase]) grouped[scenario][testCase] = [];
    grouped[scenario][testCase].push(row);
  });

  // เริ่มสร้างสคริปต์ Cypress
  let output = '';
  for (const [scenario, testCases] of Object.entries(grouped)) {
    // ตั้งชื่อ describe: ใช้ชื่อตาม Excel เสมอเพื่อให้ตรงกับ TestScenario(des)
    const scenarioTitle = scenario;
    output += `describe('${scenarioTitle}', () => {\n`;
    // If DDT enabled, preload fixture rows in beforeEach
    if (ddt && fixture) {
      // โหลด fixture และเก็บเป็น this.rows สำหรับใช้ในแต่ละแถวข้อมูล
      output += `  beforeEach(() => {\n    cy.fixture('${fixture}.json').as('rows');\n  });\n`;
    }

    // เก็บ hooks ระดับ describe (ถ้าเป็น DDT จะไม่นำมาใช้ตรงนี้)
    const describeHooks = { before: [], beforeEach: [], after: [], afterEach: [] };

    // วนสร้างแต่ละ Test case ภายใต้ Scenario
    for (const [testCase, steps] of Object.entries(testCases)) {
      // แยกขั้นตอนเป็น hooks และ main steps
      const hooks = { before: [], beforeEach: [], after: [], afterEach: [] };
      const mainSteps = [];
      let onlyFlag = false, skipFlag = false;

      for (const step of steps) {
        const hookRaw = (step.hook || '').toLowerCase();
        const only = (step.only || '').toLowerCase();
        const skip = (step.only || '').toLowerCase();

        // map ชื่อ hook ให้เป็น key ที่ Cypress ใช้
        const hookKeyMap = {
          before: 'before',
          beforeeach: 'beforeEach',
          after: 'after',
          aftereach: 'afterEach'
        };
        const hook = hookKeyMap[hookRaw];

        // จัดการ only/skip ในระดับ it
        if (only === 'yes' || only === 'only') onlyFlag = true;
        if (skip === 'skip') skipFlag = true;

        if (hook) {
          hooks[hook].push(step);
        } else {
          mainSteps.push(step);
        }
      }

      // เก็บ hooks ไว้ระดับ describe (จะถูกใช้เมื่อไม่ใช่โหมด DDT)
      for (const hookType of ['before', 'beforeEach', 'after', 'afterEach']) {
        if (hooks[hookType] && hooks[hookType].length > 0) {
          describeHooks[hookType].push(...hooks[hookType]);
        }
      }

      // เริ่มสร้างบล็อก it ของแต่ละ Test case
      let itType = 'it';
      if (onlyFlag) itType = 'it.only';
      if (skipFlag) itType = 'it.skip';

      // ตั้งชื่อ it: ใช้ชื่อตาม Excel เสมอเพื่อให้ตรงกับ Test case(IT)
      const itTitle = testCase;
      output += `  ${itType}('${itTitle}', function () {\n`;
      if (ddt && fixture) {
        // ในโหมด DDT: ใช้ alias @rows แบบ async เพื่อให้แน่ใจว่าโหลดเสร็จแล้ว
        output += `    cy.get('@@rows').then((rows) => {\n`.replace('@@','@');
        output += `      rows.forEach((row) => {\n`;
        // แทรก per-row hooks (beforeEach) ภายใน loop ของแต่ละ row
        if (describeHooks.beforeEach.length > 0) {
          let chainedHook = false;
          for (const step of describeHooks.beforeEach) {
            const isShould = (step.command || '').trim() === 'should';
            const { command, value, chaining } = {
              command: step.command?.trim(),
              value: step['value/target'],
              chaining: isShould ? true : (step['chaining?']?.toUpperCase() === 'YES')
            };
            const { code, isChained } = generateStepCode({ command, value, chaining, chained: chainedHook });
            output += code;
            chainedHook = isChained;
          }
          if (chainedHook) output += `\n`;
        }
        // main steps ภายใน loop ต่อแถว
        let chained = false;
        for (const step of mainSteps) {
          const { command, value, chaining } = parseStep(step);
          if (chaining && !chained && command !== 'get') {
            warn(`"chaining?=YES" used without prior chain at command "${command}" in test "${testCase}"`);
          }
          const { code, isChained } = generateStepCode({ command, value, chaining, chained });
          output += code;
          chained = isChained;
        }
        if (chained) output += '\n';
        output += `      })\n`;
        output += `    })\n`;
        output += `  })\n`;
      } else {
        let chained = false;
        for (const step of mainSteps) {
          const { command, value, chaining } = parseStep(step);
          if (chaining && !chained && command !== 'get') {
            warn(`"chaining?=YES" used without prior chain at command "${command}" in test "${testCase}"`);
          }
          const { code, isChained } = generateStepCode({ command, value, chaining, chained });
          output += code;
          chained = isChained;
        }
        if (chained) output += '\n';
        output += `  })\n`;
      }
    }

    // แทรก hooks ระดับ describe (ข้ามเมื่อเป็น DDT เพื่อให้ hook อยู่ในแต่ละแถวแทน)
    if (!ddt) {
      for (const hookType of ['before', 'beforeEach', 'after', 'afterEach']) {
        if (describeHooks[hookType].length > 0) {
          output = insertHookBlock(output, hookType, describeHooks[hookType]);
        }
      }
    } else {
      // โหมด DDT: แจ้งเตือนว่ามีการย้าย beforeEach hooks ไปทำใน runStep ต่อแถว
      if (Object.values(describeHooks).some(arr => arr.length > 0)) {
        warn(`DDT mode: moved hooks into per-row execution for scenario "${scenario}"`);
      }
    }

    output += `})\n`;
  }

  // บันทึกไฟล์ที่สร้าง และทำ post-format ง่าย ๆ ให้โค้ดอ่านง่ายขึ้น
  const excelBaseName = path.basename(excelPath, path.extname(excelPath));
  const outputFileName = `${excelBaseName}.cy.js`;
  const outputPath = path.join(dir, outputFileName);
  // Post-format: keep chain on same line and add semicolons at end of statements
  let formatted = output.replace(/\n\./g, '.');
  formatted = formatted.replace(/\)(\n)/g, ');$1');
  fs.writeFileSync(outputPath, formatted, 'utf-8');
  console.log('✅ Complete generate test script', outputPath);
}

function insertHookBlock(output, hookType, steps) {
  // สร้างบล็อก hook (before/beforeEach/after/afterEach) และแทรกเข้าไปใน describe
  // Find the position after describe('...', () => {
  const lines = output.split('\n');
  let insertIdx = 1;
  // Insert after the first line (describe)
  let hookBlock = `  ${hookType}(() => {\n`;
  let chained = false;
  for (const step of steps) {
    // บังคับ chain สำหรับ should เพื่อให้โค้ดถูกต้อง
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
  // แปลง row ของ Excel ให้เป็นโครงสร้าง step ที่ generator ใช้
  return {
    command: step.command?.trim(),
    value: step['value/target'],
    chaining: step['chaining?']?.toUpperCase() === 'YES'
  };
}

module.exports = { generateCypressTests };
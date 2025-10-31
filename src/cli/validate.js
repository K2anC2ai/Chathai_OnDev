const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

module.exports = function(args) {
  const excelPath = args[1];
  if (!excelPath || !fs.existsSync(excelPath)) {
    console.error('Please provide a valid Excel file path.');
    process.exit(1);
  }

  const warnings = [];
  const errors = [];

  // Helper to get first available field value by candidate keys (case-insensitive headers)
  function getField(row, candidates) {
    for (const key of candidates) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return '';
  }

  // Helper to record warnings
  function warn(message) {
    warnings.push(message);
  }

  // Helper to record errors
  function error(message) {
    errors.push(message);
  }

  try {
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    const headerRow = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] || [];

    // ตรวจสอบคอลัมน์ที่จำเป็น
    const requiredColumns = ['TestScenario(des)', 'Test case(IT)', 'command'];
    for (const col of requiredColumns) {
      if (!headerRow.includes(col)) {
        error(`Missing required column: ${col}`);
      }
    }

    // ถ้ามี errors หลักๆ แสดงและออก
    if (errors.length > 0) {
      console.error('\n❌ Validation Errors:');
      errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    // ตรวจสอบ warnings ต่างๆ
    let placeholderFound = false;

    data.forEach((row, index) => {
      const scenario = row['TestScenario(des)'];
      const testCase = row['Test case(IT)'];
      const command = (row.command || '').trim();
      const value = row['value/target'];
      const hookName = String(getField(row, ['hook', 'Hook'])).trim();
      const chaining = (row['chaining?'] || '').toUpperCase() === 'YES';

      // ตรวจสอบ hook ที่ไม่รู้จัก
      const validHooks = ['before', 'beforeeach', 'after', 'aftereach', ''];
      if (hookName && !validHooks.includes(hookName.toLowerCase())) {
        warn(`Row ${index + 2}: Unknown hook: "${hookName}" (allowed: before, beforeEach, after, afterEach) in scenario "${scenario}", test "${testCase}"`);
      }

      // ตรวจพบ placeholder
      if (typeof value === 'string' && /\{\{.+?\}\}/.test(value)) {
        placeholderFound = true;
        warn(`Row ${index + 2}: Found placeholder {{...}} without DDT enabled at test "${testCase}" in scenario "${scenario}"`);
      }

      // ตรวจสอบรูปแบบ contains
      if (command === 'contains' && typeof value === 'string') {
        if (!value.includes(',') && !value.includes('/')) {
          warn(`Row ${index + 2}: contains: usually 2 args (selector, text). For single-arg usage, prefix with ',' e.g., ", ${value}" or use '/' as separator in scenario "${scenario}", test "${testCase}"`);
        }
      }

      // ตรวจสอบ chain commands ที่ผิดพลาด (ต้องมี get, contains, หรือ command ที่ chainable ก่อน)
      if (chaining && command) {
        const chainableCommands = [
          'type', 'click', 'check', 'uncheck', 'select', 'focus', 'blur', 'clear',
          'contains', 'wait', 'should', 'then', 'within', 'each',
          'find', 'parent', 'children', 'siblings', 'next', 'first', 'last', 'eq', 'filter'
        ];
        
        // หา row ก่อนหน้าใน test case เดียวกัน
        let hasPriorChain = false;
        for (let i = index - 1; i >= 0; i--) {
          if (data[i]['Test case(IT)'] === testCase) {
            const prevCommand = (data[i].command || '').trim();
            if (prevCommand === 'get' || prevCommand === 'contains' || chainableCommands.includes(prevCommand)) {
              hasPriorChain = true;
              break;
            }
            if (data[i]['chaining?']?.toUpperCase() === 'YES') {
              hasPriorChain = true;
              break;
            }
          } else {
            break;
          }
        }

        if (!hasPriorChain && command !== 'get' && command !== 'contains') {
          warn(`Row ${index + 2}: "chaining?=YES" used without prior chain at command "${command}" in test "${testCase}" in scenario "${scenario}"`);
        }
      }
    });

    // แสดงผลลัพธ์
    console.log('\n📋 Validation Results:\n');
    
    if (errors.length > 0) {
      console.error('❌ Errors:');
      errors.forEach(err => console.error(`  - ${err}`));
    }

    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      warnings.forEach(warn => console.log(`  - ${warn}`));
      console.log(`\nTotal warnings: ${warnings.length}`);
    } else {
      console.log('✅ No warnings found.');
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log('\n✅ Excel file is valid with no issues.');
    } else if (errors.length === 0) {
      console.log('\n⚠️  Excel file structure is valid but has warnings. Please review and fix them before generating tests.');
    }

  } catch (error) {
    console.error('❌ Invalid Excel file:', error.message);
    process.exit(1);
  }
};
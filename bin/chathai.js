#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// หา path ของ package ที่ติดตั้ง
const packagePath = path.dirname(require.resolve('chathai'));
const { generateCypressTests } = require(path.join(packagePath, 'src/generate-cypress'));

const args = process.argv.slice(2);
const command = args[0];

const DEFAULT_TEMPLATE_PATH = 'xlsxtemplate/chathai-templateV.1.0.0.xlsx';

function createTemplateFile(templatePath) {
  const templateDir = path.dirname(templatePath);

  // สร้าง directory ถ้ายังไม่มี
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  // สร้าง workbook ใหม่
  const wb = XLSX.utils.book_new();
  
  // สร้าง sheet สำหรับ test cases
  const ws = XLSX.utils.aoa_to_sheet([
    ['Test Case ID', 'Test Case Name', 'Description', 'Steps', 'Expected Result', 'Actual Result', 'Status'],
    ['TC001', 'Sample Test Case', 'This is a sample test case', '1. Step 1\n2. Step 2', 'Expected result', '', ''],
  ]);

  // เพิ่ม sheet ลงใน workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');

  // บันทึกไฟล์
  XLSX.writeFile(wb, templatePath);
  console.log(`✅ สร้างไฟล์ template สำเร็จ: ${templatePath}`);
}

if (command === 'generate') {
  // ถ้าไม่ระบุ path จะใช้ path เริ่มต้น
  const excelPath = args[1] || DEFAULT_TEMPLATE_PATH;
  const outputDir = args[2] || 'cypress/e2e';

  // ตรวจสอบว่าไฟล์ template มีอยู่หรือไม่
  if (!fs.existsSync(excelPath)) {
    console.log('⚠️ ไม่พบไฟล์ template จะทำการสร้างให้ใหม่');
    createTemplateFile(excelPath);
  }

  generateCypressTests(excelPath, outputDir);
} else {
  console.log('Unknown command');
  console.log('\nตัวอย่างการใช้งาน:');
  console.log('chathai generate                    // ใช้ template เริ่มต้น');
  console.log('chathai generate myexcel/excel.xlsx // ใช้ไฟล์ Excel ที่ระบุ');
}
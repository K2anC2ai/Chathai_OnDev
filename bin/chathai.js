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
const SOURCE_TEMPLATE_PATH = path.join(packagePath, 'xlsxtemplate/chathai-templateV.1.0.0.xlsx');

function createTemplateFile(templatePath) {
  const templateDir = path.dirname(templatePath);

  // สร้าง directory ถ้ายังไม่มี
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  // คัดลอกไฟล์ template จาก package
  try {
    fs.copyFileSync(SOURCE_TEMPLATE_PATH, templatePath);
    console.log(` Create Template File successful: ${templatePath}`);
  } catch (error) {
    console.error(' Can not create template file:', error.message);
    process.exit(1);
  }
}

if (command === 'generate') {
  // ถ้าไม่ระบุ path จะใช้ path เริ่มต้น
  const excelPath = args[1] || DEFAULT_TEMPLATE_PATH;
  const outputDir = args[2] || 'cypress/e2e';

  // ตรวจสอบว่าไฟล์ template มีอยู่หรือไม่
  if (!fs.existsSync(excelPath)) {
    console.log('⚠️ Template file not found, creating new');
    createTemplateFile(excelPath);
  }

  generateCypressTests(excelPath, outputDir);
} else {
  console.log('Unknown command');
  console.log('\nตัวอย่างการใช้งาน:');
  console.log('chathai generate');
  console.log('chathai generate myexcel/excel.xlsx ');
}
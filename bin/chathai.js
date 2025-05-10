#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { https } = require('follow-redirects'); // Use follow-redirects for handling redirects
const { exec } = require('child_process');
const XLSX = require('xlsx');
const packageJson = require('../package.json'); // Import package.json to access the version

// Path of the package
const packagePath = __dirname; // Use the current directory as the package path
const { generateCypressTests } = require(path.join(packagePath, '../src/generate-cypress'));

const args = process.argv.slice(2);
const command = args[0];

const DEFAULT_TEMPLATE_PATH = 'xlsxtemplate/chathai-templateV.1.0.0.xlsx';
const SOURCE_TEMPLATE_PATH = path.join(packagePath, 'xlsxtemplate/chathai-templateV.1.0.0.xlsx');

const ELECTRON_APP_URL = 'https://github.com/K2anC2ai/chathai-ui-electron/releases/latest/download/my-electron-app-1.0.0.Setup.exe'; // Replace with your actual GitHub release URL
const ELECTRON_APP_PATH = path.join(require('os').homedir(), '.chathai', 'my-electron-app.exe');

function createTemplateFile(templatePath) {
  const templateDir = path.dirname(templatePath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  // Copy the template file from the package
  try {
    fs.copyFileSync(SOURCE_TEMPLATE_PATH, templatePath);
    console.log(` Create Template File successful: ${templatePath}`);
  } catch (error) {
    console.error(' Can not create template file:', error.message);
    process.exit(1);
  }
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download file: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => reject(err));
    });
  });
}

if (command === 'install-ui') {
  console.log('Installing Chathai UI...');

  // Ensure the directory exists
  const uiDir = path.dirname(ELECTRON_APP_PATH);
  if (!fs.existsSync(uiDir)) {
    fs.mkdirSync(uiDir, { recursive: true });
  }

  // Download the Electron app
  downloadFile(ELECTRON_APP_URL, ELECTRON_APP_PATH)
    .then(() => {
      console.log('✅ Chathai UI downloaded successfully.');
      console.log('Launching Chathai UI...');
      exec(`"${ELECTRON_APP_PATH}"`, (err) => {
        if (err) {
          console.error('❌ Failed to launch Chathai UI:', err.message);
        }
      });
    })
    .catch((err) => {
      console.error('❌ Failed to download Chathai UI:', err.message);
    });
} else if (command === 'open-ui') {
  console.log('Opening Chathai UI...');

  // Path to the installed app
  const INSTALLED_APP_PATH = path.join(require('os').homedir(), 'AppData', 'Local', 'my_electron_app', 'my-electron-app.exe');

  // Check if the installed app exists
  if (!fs.existsSync(INSTALLED_APP_PATH)) {
    console.error('❌ Chathai UI is not installed. Please run "chathai install-ui" first.');
    process.exit(1);
  }

  // Launch the installed app
  exec(`"${INSTALLED_APP_PATH}"`, (err) => {
    if (err) {
      console.error('❌ Failed to open Chathai UI:', err.message);
    }
  });
} else if (command === 'generate') {
  const configPath = path.join(packagePath, 'config.json');
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {};
  const excelPath = args[1] || DEFAULT_TEMPLATE_PATH;
  const outputDir = args[2] || config.defaultOutputDir || 'cypress/e2e';

  if (!fs.existsSync(excelPath)) {
    console.log('⚠️ Template file not found, creating new');
    createTemplateFile(excelPath);
  }

  generateCypressTests(excelPath, outputDir);
} else if (command === '--version' || command === '-v') {
  console.log(`Chathai version: ${packageJson.version}`);
} else if (command === '--help' || command === '-h') {
  console.log('Chathai CLI Help');
  console.log('\nAvailable commands:');
  console.log('  generate [excelPath] [outputDir]   Generate Cypress test scripts');
  console.log('  install-ui                         Install and launch the Chathai UI');
  console.log('  open-ui                            Open the installed Chathai UI');
  console.log('  --version, -v                      Show the current version');
  console.log('  --help, -h                         Show this help message');
  console.log('  --output-dir [directory]           Set the default output directory');
  console.log('  --validate [excelPath]             Validate the structure of an Excel file');
  console.log('  --create-template [templateName]   Create a new Excel template');
  console.log('  --list-templates                   List all available templates');
} else if (command === '--output-dir') {
  const outputDir = args[1];
  if (!outputDir) {
    console.error('Please specify an output directory.');
    process.exit(1);
  }

  const configPath = path.join(packagePath, 'config.json');
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {};
  config.defaultOutputDir = outputDir;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  console.log(`Default output directory set to: ${outputDir}`);
} else if (command === '--validate') {
  const excelPath = args[1];
  if (!excelPath || !fs.existsSync(excelPath)) {
    console.error('Please provide a valid Excel file path.');
    process.exit(1);
  }

  try {
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const requiredColumns = ['TestScenario(des)', 'Test case(IT)', 'command', 'value/target'];
    const missingColumns = requiredColumns.filter(col => !Object.keys(data[0] || {}).includes(col));
    if (missingColumns.length > 0) {
      console.error(`❌ Missing required columns: ${missingColumns.join(', ')}`);
      process.exit(1);
    }

    console.log('✅ Excel file is valid.');
  } catch (error) {
    console.error('❌ Invalid Excel file:', error.message);
  }
} else if (command === '--create-template') {
  const templateName = args[1] || 'new-template.xlsx';
  const templatePath = path.join('xlsxtemplate', templateName);

  if (fs.existsSync(templatePath)) {
    console.error(`❌ Template file already exists: ${templatePath}`);
    process.exit(1);
  }

  createTemplateFile(templatePath);
} else if (command === '--list-templates') {
  const templateDir = path.join(packagePath, 'xlsxtemplate');
  if (!fs.existsSync(templateDir)) {
    console.log('No templates found.');
    process.exit(1);
  }

  const templates = fs.readdirSync(templateDir);
  if (templates.length === 0) {
    console.log('No templates found.');
  } else {
    console.log('Available templates:');
    templates.forEach(template => console.log(`  - ${template}`));
  }
} else {
  console.log(`Unknown command: ${command}`);
  console.log('Use "chathai --help" to see available commands.');
}
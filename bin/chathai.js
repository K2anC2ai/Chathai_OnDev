#!/usr/bin/env node

const path = require('path');
const packageJson = require('../package.json');
const { generateCypressTests } = require('../src/generate-cypress');
const { createTemplateFile, downloadFile } = require('../src/cli/utils');

const args = process.argv.slice(2);
const command = args[0];

const packagePath = __dirname;
const packageRoot = path.resolve(__dirname, '..');
const DEFAULT_TEMPLATE_PATH = 'xlsxtemplate/chathai-templateV.1.0.0.xlsx';
const SOURCE_TEMPLATE_PATH = path.join(packageRoot, 'xlsxtemplate/chathai-templateV.1.0.0.xlsx');
const ELECTRON_APP_URL = 'https://github.com/K2anC2ai/chathai-ui/releases/latest/download/chathai-ui-1.0.0.Setup.exe';
const ELECTRON_APP_PATH = path.join(require('os').homedir(), '.chathai', 'chathai-ui-1.0.0.Setup.exe');

const context = {
  packagePath,
  packageRoot,
  DEFAULT_TEMPLATE_PATH,
  SOURCE_TEMPLATE_PATH,
  ELECTRON_APP_URL,
  ELECTRON_APP_PATH,
  packageJson,
  createTemplateFile,
  downloadFile,
  generateCypressTests
};

const commands = {
  'install-ui': require('../src/cli/install-ui'),
  'open-ui': require('../src/cli/open-ui'),
  'generate': require('../src/cli/generate'),
  '--output-dir': require('../src/cli/output-dir'),
  '--validate': require('../src/cli/validate'),
  '--create-template': require('../src/cli/create-template'),
  '--list-templates': require('../src/cli/list-templates'),
  '--help': require('../src/cli/help'),
  '-h': require('../src/cli/help'),
  '--version': require('../src/cli/version'),
  '-v': require('../src/cli/version'),
  '--template-dir': require('../src/cli/template-dir'),
};

if (commands[command]) {
  commands[command](args, context);
} else {
  require('../src/cli/help')();
  if (command) {
    console.log(`\nUnknown command: ${command}`);
  }
}
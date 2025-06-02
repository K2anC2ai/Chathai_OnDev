const fs = require('fs');
const path = require('path');

module.exports = function(args, context) {
  const { packagePath, DEFAULT_TEMPLATE_PATH, createTemplateFile, SOURCE_TEMPLATE_PATH, generateCypressTests } = context;
  const configPath = path.join(packagePath, 'config.json');
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {};
  const excelPath = args[1] || DEFAULT_TEMPLATE_PATH;
  const outputDir = args[2] || config.defaultOutputDir || 'cypress/e2e';

  if (!fs.existsSync(excelPath)) {
    console.log('⚠️ Template file not found, creating new');
    createTemplateFile(excelPath, SOURCE_TEMPLATE_PATH);
  }

  generateCypressTests(excelPath, outputDir);
};
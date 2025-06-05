const fs = require('fs');
const path = require('path');

module.exports = function(args, context) {
  const { DEFAULT_TEMPLATE_PATH, createTemplateFile, SOURCE_TEMPLATE_PATH, generateCypressTests } = context;
  // Read config from project directory
  let projectDir = process.cwd();
  const configPath = path.join(projectDir, '.chathai-config.json');
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {};
  let arg1 = args[1];
  if (arg1 && arg1.startsWith('-')) {
    arg1 = null;
  }
  // Helper to get named argument value
  function getArgValue(flag) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('-')) {
      return args[idx + 1];
    }
    return null;
  }

  // Only use args[2] as outputDir if it exists and does not start with '-'
  let outputDir =
    getArgValue('--output-dir') ||
    (args[2] && !args[2].startsWith('-') ? args[2] : null) ||
    config.defaultOutputDir ||
    'cypress/e2e';

  // Parse --project-dir argument
  const projectDirIndex = args.indexOf('--project-dir');
  if (projectDirIndex !== -1 && args[projectDirIndex + 1]) {
    projectDir = args[projectDirIndex + 1];
  }

  // Always resolve outputDir relative to projectDir unless already absolute
  outputDir = path.isAbsolute(outputDir) ? outputDir : path.join(projectDir, outputDir);

  // Helper to check if path is a directory
  function isDirectory(p) {
    try {
      return fs.existsSync(p) && fs.lstatSync(p).isDirectory();
    } catch {
      return false;
    }
  }

  // Always resolve arg1 to absolute path if present and not already absolute
  let resolvedArg1 = arg1
    ? (path.isAbsolute(arg1) ? arg1 : path.join(projectDir, arg1))
    : null;

  // Debug prints
  console.log('[Chathai CLI] projectDir:', projectDir);
  console.log('[Chathai CLI] arg1:', arg1);
  console.log('[Chathai CLI] resolvedArg1:', resolvedArg1);
  console.log('[Chathai CLI] outputDir:', outputDir);

  // Batch mode: custom or default template directory
  let templateDirToUse = null;
  if (!arg1) {
    // No argument: use config.defaultTemplateDir if set, else xlsxtemplate
    templateDirToUse = config.defaultTemplateDir || 'xlsxtemplate';
  } else if (resolvedArg1 && isDirectory(resolvedArg1)) {
    templateDirToUse = path.isAbsolute(arg1) ? arg1 : path.join(projectDir, arg1);
  }

  if (templateDirToUse) {
    // Only join if not absolute
    const templateDir = path.isAbsolute(templateDirToUse)
      ? templateDirToUse
      : path.join(projectDir, templateDirToUse);
    console.log('[Chathai CLI] Batch mode, templateDir:', templateDir);
    if (!fs.existsSync(templateDir)) {
      // Create template directory and copy default template
      fs.mkdirSync(templateDir, { recursive: true });
      const defaultTemplateName = 'chathai-templateV.1.0.0.xlsx';
      const defaultTemplatePath = path.join(templateDir, defaultTemplateName);
      if (!fs.existsSync(defaultTemplatePath)) {
        createTemplateFile(defaultTemplatePath, SOURCE_TEMPLATE_PATH);
      }
    }
    const files = fs.readdirSync(templateDir).filter(f => f.endsWith('.xlsx'));
    if (files.length === 0) {
      console.log(`No .xlsx files found in ${templateDir}.`);
      return;
    }
    files.forEach(file => {
      const filePath = path.join(templateDir, file);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Template file not found: ${filePath}`);
        createTemplateFile(filePath, SOURCE_TEMPLATE_PATH);
      }
      generateCypressTests(filePath, outputDir, projectDir);
    });
  } else {
    // Single file mode
    const excelPath = resolvedArg1;
    console.log('[Chathai CLI] Single file mode, excelPath:', excelPath);
    if (!fs.existsSync(excelPath)) {
      console.log('⚠️ Template file not found, creating new');
      createTemplateFile(excelPath, SOURCE_TEMPLATE_PATH);
    }
    generateCypressTests(excelPath, outputDir, projectDir);
  }
};
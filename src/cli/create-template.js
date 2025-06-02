const path = require('path');
const fs = require('fs');

module.exports = function(args, context) {
  const { createTemplateFile, SOURCE_TEMPLATE_PATH } = context;
  const templateName = args[1] || 'new-template.xlsx';
  const templatePath = path.join('xlsxtemplate', templateName);

  if (fs.existsSync(templatePath)) {
    console.error(`❌ Template file already exists: ${templatePath}`);
    process.exit(1);
  }
  createTemplateFile(templatePath, SOURCE_TEMPLATE_PATH);
};
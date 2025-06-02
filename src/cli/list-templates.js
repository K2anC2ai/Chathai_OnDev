const path = require('path');
const fs = require('fs');

module.exports = function(args, context) {
  const { packagePath } = context;
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
};
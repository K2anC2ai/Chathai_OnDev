const fs = require('fs');
const path = require('path');

module.exports = function(args, context) {
  const { packagePath } = context;
  const templateDir = args[1];
  if (!templateDir) {
    console.error('Please specify a template directory.');
    process.exit(1);
  }
  const configPath = path.join(packagePath, 'config.json');
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {};
  config.defaultTemplateDir = templateDir;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`Default template directory set to: ${templateDir}`);
}; 
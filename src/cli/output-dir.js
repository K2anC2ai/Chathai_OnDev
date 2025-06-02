const fs = require('fs');
const path = require('path');

module.exports = function(args, context) {
  const { packagePath } = context;
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
};
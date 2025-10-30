const fs = require('fs');
const path = require('path');

module.exports = function(args, context) {
  const outputDir = args[1];
  if (!outputDir) {
    console.error('Please specify an output directory.');
    process.exit(1);
  }
  // Save config in the project directory, same place generate reads from
  const projectDir = process.cwd();
  const configPath = path.join(projectDir, '.chathai-config.json');
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {};
  config.defaultOutputDir = outputDir;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`Default output directory set to: ${outputDir}`);
};
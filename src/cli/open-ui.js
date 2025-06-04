const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

module.exports = function(args, context) {
  const INSTALLED_APP_PATH = path.join(require('os').homedir(), 'AppData', 'Local', 'chathai_ui', 'chathai-ui.exe');
  if (!fs.existsSync(INSTALLED_APP_PATH)) {
    console.error('❌ Chathai UI is not installed. Please run "chathai install-ui" first.');
    process.exit(1);
  }
  // Pass current working directory as argument and set cwd
  const projectDir = process.cwd();
  exec(`"${INSTALLED_APP_PATH}" "${projectDir}"`, { cwd: projectDir }, (err) => {
    if (err) {
      console.error('❌ Failed to open Chathai UI:', err.message);
    }
  });
};
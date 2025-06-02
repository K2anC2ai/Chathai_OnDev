const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

module.exports = function(args, context) {
  const INSTALLED_APP_PATH = path.join(require('os').homedir(), 'AppData', 'Local', 'my_electron_app', 'my-electron-app.exe');
  if (!fs.existsSync(INSTALLED_APP_PATH)) {
    console.error('❌ Chathai UI is not installed. Please run "chathai install-ui" first.');
    process.exit(1);
  }
  exec(`"${INSTALLED_APP_PATH}"`, (err) => {
    if (err) {
      console.error('❌ Failed to open Chathai UI:', err.message);
    }
  });
};
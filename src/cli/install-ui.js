const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { downloadFile } = require('./utils');

module.exports = async function(args, context) {
  const { ELECTRON_APP_URL, ELECTRON_APP_PATH } = context;
  console.log('Installing Chathai UI...');
  const uiDir = path.dirname(ELECTRON_APP_PATH);
  if (!fs.existsSync(uiDir)) {
    fs.mkdirSync(uiDir, { recursive: true });
  }
  try {
    await downloadFile(ELECTRON_APP_URL, ELECTRON_APP_PATH);
    console.log('✅ Chathai UI downloaded successfully.');
    console.log('Launching Chathai UI...');
    exec(`"${ELECTRON_APP_PATH}"`, (err) => {
      if (err) {
        console.error('❌ Failed to launch Chathai UI:', err.message);
      }
    });
  } catch (err) {
    console.error('❌ Failed to download Chathai UI:', err.message);
  }
};
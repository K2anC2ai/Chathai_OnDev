const fs = require('fs');
const path = require('path');
const { https } = require('follow-redirects');

function createTemplateFile(templatePath, sourceTemplatePath) {
  const templateDir = path.dirname(templatePath);
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }
  try {
    fs.copyFileSync(sourceTemplatePath, templatePath);
    console.log(` Create Template File successful: ${templatePath}`);
  } catch (error) {
    console.error(' Can not create template file:', error.message);
    process.exit(1);
  }
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download file: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => reject(err));
    });
  });
}

module.exports = { createTemplateFile, downloadFile };
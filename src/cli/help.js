module.exports = function() {
  console.log('Chathai CLI Help');
  console.log('\nAvailable commands:');
  console.log('  generate [excelPath] [outputDir]   Generate Cypress test scripts');
  console.log('  --template-dir [directory]         Set the default template directory');
  console.log('  --output-dir [directory]           Set the default output directory');
  console.log('  install-ui                         Install and launch the Chathai UI');
  console.log('  open-ui                            Open the installed Chathai UI');
  console.log('  --version, -v                      Show the current version');
  console.log('  --help, -h                         Show this help message');
  console.log('  --validate [excelPath]             Validate the structure of an Excel file');
  console.log('  --create-template [templateName]   Create a new Excel template');
  console.log('  --list-templates                   List all available templates');
};
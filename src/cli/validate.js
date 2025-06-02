const fs = require('fs');
const XLSX = require('xlsx');

module.exports = function(args) {
  const excelPath = args[1];
  if (!excelPath || !fs.existsSync(excelPath)) {
    console.error('Please provide a valid Excel file path.');
    process.exit(1);
  }
  try {
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    const requiredColumns = ['TestScenario(des)', 'Test case(IT)', 'command', 'value/target'];
    const missingColumns = requiredColumns.filter(col => !Object.keys(data[0] || {}).includes(col));
    if (missingColumns.length > 0) {
      console.error(`❌ Missing required columns: ${missingColumns.join(', ')}`);
      process.exit(1);
    }
    console.log('✅ Excel file is valid.');
  } catch (error) {
    console.error('❌ Invalid Excel file:', error.message);
  }
};
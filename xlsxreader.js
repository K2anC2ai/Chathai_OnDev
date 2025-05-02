var xlsx = require("xlsx");
var dataPathExcel = "xlsxtemplate/test.xlsx";
var wb = xlsx.readFile(dataPathExcel);
var sheetName = wb.SheetNames[0];
var sheetValue = wb.Sheets[sheetName];
//console.log(sheetValue);
var excelData = xlsx.utils.sheet_to_json(sheetValue);
console.log(excelData);
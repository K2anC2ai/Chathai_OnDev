# Chathai

[![npm version](https://badge.fury.io/js/chathai.svg)](https://badge.fury.io/js/chathai)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

> A powerful tool for generating Cypress test scripts from Excel test cases

## Quick Start

```bash
npm install chathai --save-dev
npx chathai generate
```

## Installation

```bash
npm install chathai --save-dev
# Or install globally
npm install -g chathai
```

## Features

- Generate Cypress test scripts from Excel test cases
- Automatic template creation
- Support for custom Excel file paths
- Easy to use command-line interface
- Validate Excel file structure
- List available templates
- Data-Driven Testing (DDT) generation via fixtures and placeholders

## Usage

### Basic Usage
```bash
npx chathai generate
```
This will create test scripts in the default `cypress/e2e` directory using the default template.

### Using Custom Excel File
```bash
npx chathai generate path/to/your/excel.xlsx
```

### Specifying Custom Output Directory
```bash
npx chathai generate path/to/your/excel.xlsx --output-dir cypress/e2e
```
Default output directory is `cypress/e2e` (unless overridden by `--output-dir` or `.chathai-config.json`).

### Generate with DDT
```bash
npx chathai generate path/to/your/excel.xlsx --ddt ecommerce_ddt
# or
npx chathai generate -ddt ecommerce_ddt
# If you omit the name: defaults to ecommerce_ddt
npx chathai generate -ddt
```
This generates tests that:
- Load fixture `cypress/fixtures/ecommerce_ddt.json` in `beforeEach`
- Use `{{field}}` placeholders inside Excel `value/target` cells (resolved to `row.field`)

Example Excel values:
- `type` with `value/target`: `{{email}}`
- `type` with `value/target`: `{{phone}}`
- `select` with `value/target`: `ไทย` or `DE`

Generated pattern:
```js
describe('Your Scenario', () => {
  beforeEach(() => {
    cy.fixture('ecommerce_ddt.json').as('rows');
  });

  it('Your Test', function () {
    const runStep = (row) => {
      // steps here using row.*
    };
    this.rows.forEach(row => runStep(row));
  });
});
```

```bash
npx chathai generate path/to/your/excel.xlsx custom/output/directory
```

### List Available Templates
```bash
npx chathai --list-templates
```
This will display all available templates in the `xlsxtemplate` directory.

### Create a New Template
```bash
npx chathai --create-template my-template.xlsx
```
This will create a new template file named `my-template.xlsx` in the `xlsxtemplate` directory.

### Validate an Excel File
```bash
npx chathai --validate path/to/your/excel.xlsx
```
This will check if the specified Excel file has a valid structure.

### CLI warnings summary
After generation, CLI prints a warnings summary if needed, for example:
- Missing required columns (e.g., `TestScenario(des)`, `Test case(IT)`, `command`)
- Found `{{placeholder}}` without `-ddt`
- Suspicious `contains` value (expect two args separated by comma or slash)
- "chaining?=YES" used without prior chain
- Unknown hook name

### Set Default Output Directory
```bash
npx chathai --output-dir custom/output/directory
```
This will set the default output directory for generated test scripts.

You can also set `defaultOutputDir` or a default fixture in `.chathai-config.json`:
```json
{
  "defaultOutputDir": "cypress/e2e",
  "defaultFixture": "ecommerce_ddt"
}
```

## Excel Template Structure

The default template includes the following columns:
- Test Case ID
- Test Case Name
- Description
- Steps
- Expected Result
- Actual Result
- Status

## Example

1. Create a new project:
```bash
mkdir my-test-project
cd my-test-project
npm init -y
npm install chathai --save-dev
```

2. Generate test scripts:
```bash
npx chathai generate
```

3. The generated test scripts will be available in the `cypress/e2e` directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/K2anC2ai) on GitHub.
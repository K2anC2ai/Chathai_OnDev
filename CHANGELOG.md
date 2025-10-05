# Changelog

## 1.1.0

- Add Data-Driven Testing (DDT)
  - `-ddt/--ddt [fixtureName]` flags
  - Default fixture when omitted (ecommerce_ddt)
  - Generated tests use `cy.get('@rows').then(rows => rows.forEach(...))`
  - Support `{{field}}` placeholders (also inside selectors)
- Cypress command generation improvements
  - Robust chaining behavior; prevent broken chains
  - `contains` supports two args (comma or slash separated) and safe quoting
  - Post-format output: keep chains on one line; add semicolons
- Hooks and DDT
  - Move `beforeEach` steps into per-row execution in DDT mode
- CLI & UX
  - Prevent interpreting DDT fixture name as outputDir
  - Warnings summary after generate (missing columns, placeholder without DDT, invalid contains, invalid hooks, suspicious chaining)
- Docs
  - Update Getting Started, CLI Reference, Excel Template for DDT and warnings

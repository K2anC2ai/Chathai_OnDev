const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

module.exports = function(args, context) {
  const { packageJson } = context;
  let projectDir = process.cwd();
  
  // Read config
  const configPath = path.join(projectDir, '.chathai-config.json');
  const config = fs.existsSync(configPath) 
    ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) 
    : {};
  
  // Parse arguments
  // specPath is the first non-flag argument after 'run'
  let specPath = null;
  for (let i = 1; i < args.length; i++) {
    if (!args[i].startsWith('--') && args[i] !== 'run' && args[i] !== 'test') {
      specPath = args[i];
      break;
    }
  }
  
  // Parse output-dir flag (where Cypress specs are located)
  const outputDirIndex = args.indexOf('--output-dir');
  const outputDirFromFlag = outputDirIndex !== -1 && args[outputDirIndex + 1] && !args[outputDirIndex + 1].startsWith('--')
    ? args[outputDirIndex + 1]
    : args.find(arg => arg.startsWith('--output-dir='))?.split('=')[1];
  
  const outputDir = outputDirFromFlag || config.defaultOutputDir || 'cypress/e2e';
  
  // Results folder (where to save results)
  const resultsDirIndex = args.indexOf('--results-dir');
  const resultsDirFromFlag = resultsDirIndex !== -1 && args[resultsDirIndex + 1] && !args[resultsDirIndex + 1].startsWith('--')
    ? args[resultsDirIndex + 1]
    : args.find(arg => arg.startsWith('--results-dir='))?.split('=')[1];
  
  const resultsDirArg = resultsDirFromFlag || 'chathai-results';
  const resultsDir = path.isAbsolute(resultsDirArg) 
    ? resultsDirArg 
    : path.join(projectDir, resultsDirArg);
  
  // Create results directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const sessionDir = path.join(resultsDir, `run-${timestamp}`);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  console.log('Chathai CLI: Running Cypress tests...');
  console.log('Chathai CLI: Project directory:', projectDir);
  console.log('Chathai CLI: Output directory (specs):', outputDir);
  console.log('Chathai CLI: Results will be saved to:', sessionDir);
  
  // Build Cypress command
  // Cypress requires forward slashes for glob patterns
  const cypressArgs = ['cypress', 'run'];
  if (specPath) {
    // Convert to forward slashes for glob pattern
    const normalizedSpec = path.isAbsolute(specPath)
      ? path.relative(projectDir, specPath)
      : specPath;
    cypressArgs.push('--spec', normalizedSpec.replace(/\\/g, '/'));
  } else {
    // Use forward slashes for glob pattern
    const normalizedOutputDir = path.isAbsolute(outputDir)
      ? path.relative(projectDir, outputDir)
      : outputDir;
    const specPattern = `${normalizedOutputDir.replace(/\\/g, '/')}/**/*.cy.js`;
    cypressArgs.push('--spec', specPattern);
  }
  cypressArgs.push('--config', 'video=true');
  
  console.log('Chathai CLI: Spec pattern:', cypressArgs.find(arg => arg !== '--spec' && cypressArgs.indexOf(arg) === cypressArgs.indexOf('--spec') + 1));
  
  // Run Cypress
  const cypress = spawn('npx', cypressArgs, {
    cwd: projectDir,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
  });
  
  let stdout = '';
  let stderr = '';
  
  cypress.stdout.on('data', (data) => {
    const text = data.toString();
    stdout += text;
    process.stdout.write(text);
  });
  
  cypress.stderr.on('data', (data) => {
    const text = data.toString();
    stderr += text;
    process.stderr.write(text);
  });
  
  cypress.on('close', (code) => {
    console.log(`\nChathai CLI: Cypress process exited with code ${code}`);
    
    // Save console output
    fs.writeFileSync(
      path.join(sessionDir, 'console-output.txt'),
      stdout + '\n\n=== STDERR ===\n\n' + stderr,
      'utf-8'
    );
    
    // Copy screenshots
    const screenshotsSource = path.join(projectDir, 'cypress', 'screenshots');
    const screenshotsDest = path.join(sessionDir, 'screenshots');
    if (fs.existsSync(screenshotsSource)) {
      copyDirSync(screenshotsSource, screenshotsDest);
      console.log('Chathai CLI: Screenshots copied to:', screenshotsDest);
    }
    
    // Copy videos
    const videosSource = path.join(projectDir, 'cypress', 'videos');
    const videosDest = path.join(sessionDir, 'videos');
    if (fs.existsSync(videosSource)) {
      copyDirSync(videosSource, videosDest);
      console.log('Chathai CLI: Videos copied to:', videosDest);
    }
    
    // Generate summary report (use destination directories for report)
    const summary = generateSummary(stdout, stderr, screenshotsDest, videosDest);
    fs.writeFileSync(
      path.join(sessionDir, 'summary.json'),
      JSON.stringify(summary, null, 2),
      'utf-8'
    );
    
    // Generate HTML report
    const htmlReport = generateHTMLReport(summary, sessionDir);
    fs.writeFileSync(
      path.join(sessionDir, 'report.html'),
      htmlReport,
      'utf-8'
    );
    
    console.log('Chathai CLI: ✅ Results saved to:', sessionDir);
    console.log('Chathai CLI: 📄 Report: report.html');
    console.log('Chathai CLI: 📊 Summary: summary.json');
  });
  
  cypress.on('error', (err) => {
    console.error('Chathai CLI: ❌ Error running Cypress:', err.message);
    process.exit(1);
  });
};

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function findAllFiles(dir, ext) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      results = results.concat(findAllFiles(full, ext));
    } else if (file.endsWith(ext)) {
      results.push(path.relative(dir, full).replace(/\\/g, '/'));
    }
  }
  return results;
}

function generateSummary(stdout, stderr, screenshotsDir, videosDir) {
  const summary = {
    timestamp: new Date().toISOString(),
    exitCode: null,
    specs: [],
    totals: { tests: 0, passing: 0, failing: 0, pending: 0, skipped: 0 },
    screenshots: findAllFiles(screenshotsDir || '', '.png'),
    videos: findAllFiles(videosDir || '', '.mp4'),
    duration: null
  };
  
  // Parse summary table
  const summaryMatch = stdout.match(/Tests:\s+(\d+).*?Passing:\s+(\d+).*?Failing:\s+(\d+).*?Pending:\s+(\d+).*?Skipped:\s+(\d+)/s);
  if (summaryMatch) {
    summary.totals.tests = parseInt(summaryMatch[1]) || 0;
    summary.totals.passing = parseInt(summaryMatch[2]) || 0;
    summary.totals.failing = parseInt(summaryMatch[3]) || 0;
    summary.totals.pending = parseInt(summaryMatch[4]) || 0;
    summary.totals.skipped = parseInt(summaryMatch[5]) || 0;
  }
  
  // Parse spec files
  const specRegex = /Running:\s+([^\s]+\.cy\.js)[\s\S]+?(?=Running:|^\s*\(Run Finished\))/gm;
  let match;
  while ((match = specRegex.exec(stdout)) !== null) {
    const specName = match[1].trim();
    const specBlock = match[0];
    const tests = [];
    
    // Parse tests with symbols
    const symRe = /^\s{4}([√×\-✓✖])\s(.+?)(?:\s+\(([\d.]+m?s)\))?\s*$/gm;
    let t;
    while ((t = symRe.exec(specBlock)) !== null) {
      const [, icon, name, dur] = t;
      let status = 'unknown';
      if (icon === '√' || icon === '✓') status = 'pass';
      else if (icon === '×' || icon === '✖') status = 'fail';
      else if (icon === '-') status = 'skip';
      tests.push({ name: name.trim(), status, duration: dur || '' });
    }
    
    // Parse numbered failures
    const numFailRe = /^\s+\d+\)\s(.+?)\s*$/gm;
    let nf;
    while ((nf = numFailRe.exec(specBlock)) !== null) {
      const name = nf[1].trim();
      if (!tests.find(x => x.name === name)) {
        tests.push({ name, status: 'fail', duration: '' });
      }
    }
    
    summary.specs.push({ specName, tests });
  }
  
  // Parse duration
  const durMatch = stdout.match(/Duration:\s+([^\n]+)/);
  if (durMatch) summary.duration = durMatch[1].trim();
  
  return summary;
}

function generateHTMLReport(summary, sessionDir) {
  const screenshotPaths = summary.screenshots.map(s => {
    const relPath = path.join('screenshots', s).replace(/\\/g, '/');
    return { path: relPath, name: path.basename(s) };
  });
  
  const videoPaths = summary.videos.map(v => {
    const relPath = path.join('videos', v).replace(/\\/g, '/');
    return { path: relPath, name: path.basename(v) };
  });
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Chathai Test Report</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f8; color: #222; margin: 0; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 12px rgba(30,40,60,0.07); padding: 32px; }
    h1 { color: #f5a86a; margin-bottom: 24px; }
    .summary { display: flex; gap: 20px; margin-bottom: 32px; flex-wrap: wrap; }
    .summary-card { flex: 1; min-width: 150px; background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center; }
    .summary-card h3 { margin: 0 0 8px 0; font-size: 0.9em; color: #666; }
    .summary-card .value { font-size: 2em; font-weight: bold; }
    .summary-card.passing .value { color: #2ecc40; }
    .summary-card.failing .value { color: #e74c3c; }
    .summary-card.skipped .value { color: #f5a86a; }
    .spec-block { margin-bottom: 32px; border-bottom: 1px solid #eee; padding-bottom: 24px; }
    .spec-title { font-size: 1.3em; font-weight: 600; margin-bottom: 12px; color: #f5a86a; }
    .test-row { display: flex; align-items: flex-start; margin-bottom: 18px; }
    .test-status { font-size: 1.4em; width: 32px; text-align: center; }
    .test-name { font-weight: 500; flex: 1; }
    .test-pass { color: #2ecc40; }
    .test-fail { color: #e74c3c; }
    .test-skip { color: #f5a86a; }
    .section { margin-top: 32px; }
    .section h2 { color: #f5a86a; margin-bottom: 16px; }
    .media-grid { display: flex; gap: 16px; flex-wrap: wrap; }
    .media-item { border: 1px solid #eee; border-radius: 6px; padding: 8px; max-width: 300px; }
    .media-item img, .media-item video { max-width: 100%; border-radius: 4px; }
    .media-item .name { font-size: 0.85em; margin-top: 8px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Chathai Test Report</h1>
    <div class="summary">
      <div class="summary-card">
        <h3>Total Tests</h3>
        <div class="value">${summary.totals.tests}</div>
      </div>
      <div class="summary-card passing">
        <h3>Passing</h3>
        <div class="value">${summary.totals.passing}</div>
      </div>
      <div class="summary-card failing">
        <h3>Failing</h3>
        <div class="value">${summary.totals.failing}</div>
      </div>
      <div class="summary-card skipped">
        <h3>Skipped</h3>
        <div class="value">${summary.totals.skipped}</div>
      </div>
      ${summary.duration ? `<div class="summary-card"><h3>Duration</h3><div class="value" style="font-size:1.2em;">${summary.duration}</div></div>` : ''}
    </div>
    
    ${summary.specs.map(spec => `
      <div class="spec-block">
        <div class="spec-title">${spec.specName}</div>
        ${spec.tests.length > 0 ? spec.tests.map(test => {
          const icon = test.status === 'pass' ? '✔️' : test.status === 'fail' ? '❌' : '⏭️';
          const statusClass = test.status === 'pass' ? 'test-pass' : test.status === 'fail' ? 'test-fail' : 'test-skip';
          return `
            <div class="test-row">
              <div class="test-status ${statusClass}">${icon}</div>
              <div class="test-name">
                ${test.name}
                ${test.duration ? `<span style="color:#888; font-size:0.9em; margin-left:12px;">${test.duration}</span>` : ''}
              </div>
            </div>
          `;
        }).join('') : '<div>No tests found in this spec.</div>'}
      </div>
    `).join('')}
    
    ${screenshotPaths.length > 0 ? `
      <div class="section">
        <h2>Screenshots (${screenshotPaths.length})</h2>
        <div class="media-grid">
          ${screenshotPaths.map(s => `
            <div class="media-item">
              <img src="${s.path}" alt="${s.name}" />
              <div class="name">${s.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    ${videoPaths.length > 0 ? `
      <div class="section">
        <h2>Videos (${videoPaths.length})</h2>
        <div class="media-grid">
          ${videoPaths.map(v => `
            <div class="media-item">
              <video src="${v.path}" controls style="max-width:100%;"></video>
              <div class="name">${v.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    <div class="section">
      <h2>Console Output</h2>
      <pre style="background:#23272e; color:#e8eaf0; padding:16px; border-radius:6px; overflow:auto; max-height:400px;">${escapeHtml(fs.readFileSync(path.join(sessionDir, 'console-output.txt'), 'utf-8'))}</pre>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


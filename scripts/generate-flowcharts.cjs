#!/usr/bin/env node

/**
 * Flowchart Image Generator
 * 
 * This script extracts Mermaid diagrams from the flowcharts.md file
 * and converts them to PNG/SVG images using @mermaid-js/mermaid-cli
 * 
 * Usage: node generate-flowcharts.js [options]
 * Options:
 *   --format=png|svg   Output format (default: png)
 *   --output=dir       Output directory (default: ./flowchart-images)
 *   --width=number     Image width in pixels (default: 1600)
 *   --height=number    Image height in pixels (default: 1200)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

const CONFIG = {
  inputFile: path.join(__dirname, '..', 'docs', 'flowcharts.md'),
  outputDir: args.output ? path.resolve(args.output) : path.join(__dirname, '..', 'flowchart-images'),
  format: args.format || 'png',
  width: parseInt(args.width) || 1600,
  height: parseInt(args.height) || 1200,
  tempDir: path.join(__dirname, '.temp-mermaid')
};

// Ensure output and temp directories exist
[CONFIG.outputDir, CONFIG.tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Extract Mermaid diagrams from markdown content
 */
function extractMermaidDiagrams(content) {
  const diagrams = [];
  const regex = /##\s+(.+?)\n\n```mermaid\n([\s\S]*?)```/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const title = match[1].trim();
    const diagram = match[2].trim();
    
    // Create safe filename from title
    const filename = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    diagrams.push({
      title,
      diagram,
      filename
    });
  }
  
  return diagrams;
}

/**
 * Check if mermaid-cli is installed
 */
function checkMermaidCLI() {
  try {
    execSync('npx --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Install mermaid-cli if not present
 */
function installMermaidCLI() {
  console.log('📦 Installing @mermaid-js/mermaid-cli...');
  try {
    execSync('npm install -g @mermaid-js/mermaid-cli', { stdio: 'inherit' });
    console.log('✅ Installation complete!\n');
    return true;
  } catch (e) {
    console.error('❌ Failed to install mermaid-cli. Please install manually:');
    console.error('   npm install -g @mermaid-js/mermaid-cli\n');
    return false;
  }
}

/**
 * Generate image from mermaid diagram
 */
function generateImage(diagram, outputPath) {
  const tempFile = path.join(CONFIG.tempDir, `${path.basename(outputPath, path.extname(outputPath))}.mmd`);
  
  // Write diagram to temp file
  fs.writeFileSync(tempFile, diagram, 'utf8');
  
  try {
    // Use mermaid-cli to generate image
    const cmd = `npx @mermaid-js/mermaid-cli -i "${tempFile}" -o "${outputPath}" -w ${CONFIG.width} -H ${CONFIG.height} -b white`;
    execSync(cmd, { stdio: 'pipe', timeout: 60000 });
    return true;
  } catch (e) {
    console.error(`❌ Failed to generate ${path.basename(outputPath)}:`, e.message);
    return false;
  } finally {
    // Cleanup temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

/**
 * Generate HTML preview file
 */
function generateHTMLPreview(diagrams) {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Temple Management System - Flowcharts Preview</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        h1 { 
            text-align: center; 
            color: #333;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 20px;
            max-width: 1800px;
            margin: 0 auto;
        }
        .card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: transform 0.2s;
        }
        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .card-header {
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .card-title {
            font-size: 16px;
            font-weight: 600;
        }
        .card-body {
            padding: 15px;
        }
        .card-image {
            width: 100%;
            height: auto;
            border: 1px solid #eee;
            border-radius: 4px;
            cursor: pointer;
        }
        .card-meta {
            padding: 10px 15px;
            background: #f9f9f9;
            font-size: 12px;
            color: #666;
            display: flex;
            justify-content: space-between;
        }
        .timestamp {
            font-style: italic;
        }
        .stats {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 8px;
            margin-bottom: 20px;
            max-width: 1800px;
            margin-left: auto;
            margin-right: auto;
        }
        .stats-grid {
            display: flex;
            justify-content: center;
            gap: 40px;
            flex-wrap: wrap;
        }
        .stat-item {
            text-align: center;
        }
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #666;
            font-size: 14px;
        }
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
        }
        .modal-content {
            display: block;
            margin: auto;
            max-width: 95%;
            max-height: 95%;
            margin-top: 2%;
        }
        .close {
            position: absolute;
            top: 20px;
            right: 40px;
            color: #f1f1f1;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
        }
        .close:hover {
            color: #bbb;
        }
    </style>
</head>
<body>
    <h1>🏛️ Temple Management System</h1>
    <p class="subtitle">Comprehensive Flowchart Documentation</p>
    
    <div class="stats">
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${diagrams.length}</div>
                <div class="stat-label">Total Flowcharts</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${new Date().toLocaleDateString()}</div>
                <div class="stat-label">Generated On</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${CONFIG.format.toUpperCase()}</div>
                <div class="stat-label">Image Format</div>
            </div>
        </div>
    </div>
    
    <div class="grid">
        ${diagrams.map((d, i) => `
        <div class="card">
            <div class="card-header">
                <div class="card-title">${i + 1}. ${d.title}</div>
            </div>
            <div class="card-body">
                <img class="card-image" src="${d.filename}.${CONFIG.format}" alt="${d.title}" onclick="openModal('${d.filename}.${CONFIG.format}')">
            </div>
            <div class="card-meta">
                <span>File: ${d.filename}.${CONFIG.format}</span>
                <span class="timestamp">${new Date().toLocaleTimeString()}</span>
            </div>
        </div>
        `).join('')}
    </div>
    
    <div id="modal" class="modal" onclick="closeModal()">
        <span class="close">&times;</span>
        <img class="modal-content" id="modal-img">
    </div>
    
    <script>
        function openModal(src) {
            document.getElementById('modal-img').src = src;
            document.getElementById('modal').style.display = 'block';
        }
        function closeModal() {
            document.getElementById('modal').style.display = 'none';
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal();
        });
    </script>
</body>
</html>`;

  const htmlPath = path.join(CONFIG.outputDir, 'index.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  return htmlPath;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Flowchart Image Generator\n');
  console.log('Configuration:');
  console.log(`  Input:  ${CONFIG.inputFile}`);
  console.log(`  Output: ${CONFIG.outputDir}`);
  console.log(`  Format: ${CONFIG.format}`);
  console.log(`  Size:   ${CONFIG.width}x${CONFIG.height}\n`);
  
  // Check if input file exists
  if (!fs.existsSync(CONFIG.inputFile)) {
    console.error(`❌ Input file not found: ${CONFIG.inputFile}`);
    process.exit(1);
  }
  
  // Read and parse markdown
  console.log('📖 Reading flowcharts.md...');
  const content = fs.readFileSync(CONFIG.inputFile, 'utf8');
  const diagrams = extractMermaidDiagrams(content);
  
  if (diagrams.length === 0) {
    console.error('❌ No Mermaid diagrams found in the file.');
    process.exit(1);
  }
  
  console.log(`✅ Found ${diagrams.length} diagrams\n`);
  
  // Check/install mermaid-cli
  if (!checkMermaidCLI()) {
    if (!installMermaidCLI()) {
      process.exit(1);
    }
  }
  
  // Generate images
  console.log('🎨 Generating images...\n');
  let successCount = 0;
  let failCount = 0;
  
  diagrams.forEach((diagram, index) => {
    const outputPath = path.join(CONFIG.outputDir, `${diagram.filename}.${CONFIG.format}`);
    const progress = `[${index + 1}/${diagrams.length}]`;
    
    process.stdout.write(`${progress} ${diagram.title.substring(0, 50)}... `);
    
    if (generateImage(diagram.diagram, outputPath)) {
      console.log('✅');
      successCount++;
    } else {
      console.log('❌');
      failCount++;
    }
  });
  
  // Generate HTML preview
  console.log('\n📄 Generating HTML preview...');
  const htmlPath = generateHTMLPreview(diagrams);
  console.log(`✅ Preview: ${htmlPath}\n`);
  
  // Cleanup temp directory
  if (fs.existsSync(CONFIG.tempDir)) {
    fs.rmSync(CONFIG.tempDir, { recursive: true });
  }
  
  // Summary
  console.log('═══════════════════════════════════════');
  console.log('              SUMMARY                   ');
  console.log('═══════════════════════════════════════');
  console.log(`  Total Diagrams:  ${diagrams.length}`);
  console.log(`  Successful:      ${successCount} ✅`);
  console.log(`  Failed:          ${failCount} ❌`);
  console.log(`  Output Folder:   ${CONFIG.outputDir}`);
  console.log(`  HTML Preview:    ${htmlPath}`);
  console.log('═══════════════════════════════════════');
  console.log('\n✨ All done! Open the HTML preview to view all flowcharts.\n');
}

main();

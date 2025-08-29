import fs from 'fs';
import path from 'path';

const inputFile = 'a.txt.txt';

// Read and parse the JSON file
const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

// Create files from the parsed data
data.files.forEach(file => {
  try {
    const filePath = file.name;
    
    // Ensure folders exist
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    if (file.binary) {
      // Handle binary files (base64 decode)
      const buffer = Buffer.from(file.contents, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log("Decoded binary:", filePath);
    } else {
      // Handle text files
      fs.writeFileSync(filePath, file.contents, 'utf-8');
      console.log("Decoded text:", filePath);
    }
  } catch (error) {
    console.error(`Error processing ${file.name}:`, error.message);
  }
});

console.log("✅ All files processed! Check above for any errors.");

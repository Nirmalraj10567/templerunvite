const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '../../data/moon-dates.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(STORAGE_FILE))) {
  fs.mkdirSync(path.dirname(STORAGE_FILE), { recursive: true });
}

// Initialize storage file if it doesn't exist
if (!fs.existsSync(STORAGE_FILE)) {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify([]));
}

async function saveMoonDate({ date, label }) {
  const dates = JSON.parse(fs.readFileSync(STORAGE_FILE));
  
  // Remove existing entry for this date if it exists
  const filteredDates = dates.filter(d => d.date !== date);
  
  // Add new entry
  filteredDates.push({ date, label });
  
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(filteredDates));
}

async function getSavedMoonDates(startDate, endDate) {
  const dates = JSON.parse(fs.readFileSync(STORAGE_FILE));
  
  return dates.filter(d => {
    const date = new Date(d.date);
    return date >= startDate && date <= endDate;
  });
}

async function deleteMoonDate(date) {
  const dates = JSON.parse(fs.readFileSync(STORAGE_FILE));
  const filtered = dates.filter(d => d.date !== date);
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(filtered));
}

module.exports = { saveMoonDate, getSavedMoonDates, deleteMoonDate };

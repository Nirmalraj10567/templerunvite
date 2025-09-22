console.log('Testing server startup...');

try {
  console.log('Loading backend...');
  require('./backend.js');
  console.log('Backend loaded successfully');
} catch (error) {
  console.error('Error loading backend:', error);
}

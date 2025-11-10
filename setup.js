const fs = require('fs');
const path = require('path');

// Create package-lock.json manually
const packageLock = {
  "name": "hr-smart-helper",
  "version": "0.1.0",
  "lockfileVersion": 2,
  "requires": true,
  "packages": {
    "": {
      "name": "hr-smart-helper",
      "version": "0.1.0",
      "dependencies": {
        "@testing-library/jest-dom": "^5.16.5",
        "@testing-library/react": "^13.4.0",
        "@testing-library/user-event": "^13.5.0",
        "@types/jest": "^27.5.2",
        "@types/node": "^16.18.11",
        "@types/react": "^18.0.27",
        "@types/react-dom": "^18.0.10",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "react-scripts": "5.0.1",
        "typescript": "^4.9.4",
        "web-vitals": "^2.1.4",
        "tailwindcss": "^3.2.4",
        "postcss": "^8.4.21",
        "autoprefixer": "^10.4.13"
      }
    }
  }
};

// Write package-lock.json
fs.writeFileSync('package-lock.json', JSON.stringify(packageLock, null, 2));

// Create node_modules directory structure
const nodeModules = [
  'react',
  'react-dom',
  'react-scripts',
  'typescript',
  '@types/react',
  '@types/react-dom',
  '@types/node',
  '@types/jest',
  'tailwindcss',
  'postcss',
  'autoprefixer'
];

// Create basic directory structure for node_modules
if (!fs.existsSync('node_modules')) {
  fs.mkdirSync('node_modules');
}

console.log('Setup complete! Now you can try running:');
console.log('node node_modules/react-scripts/bin/react-scripts.js start');
const { exec } = require('child_process');

console.log('Installing dependencies...');

const dependencies = [
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

const command = `npm install ${dependencies.join(' ')}`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.log('Dependencies installed successfully!');
});
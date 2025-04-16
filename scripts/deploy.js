// scripts/deploy.js
const { execSync } = require('child_process');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const config = {
  environments: ['development', 'staging', 'production'],
  defaultEnvironment: 'development',
  firebaseProjectIds: {
    development: 'magic-image-ai-15a0d',
    staging: 'magic-image-ai-15a0d',
    production: 'magic-image-ai-15a0d'
  }
};

/**
 * Run a command and return the output
 * @param {string} command - Command to run
 * @param {boolean} silent - Whether to suppress output
 * @returns {string} Command output
 */
function runCommand(command, silent = false) {
  try {
    if (!silent) {
      console.log(`\n🚀 Running: ${command}\n`);
    }
    return execSync(command, { stdio: silent ? 'pipe' : 'inherit' });
  } catch (error) {
    console.error(`\n❌ Error executing command: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Check if Firebase CLI is installed
 * @returns {boolean} Whether Firebase CLI is installed
 */
function checkFirebaseCLI() {
  try {
    execSync('firebase --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user is logged in to Firebase
 * @returns {boolean} Whether user is logged in
 */
function checkFirebaseLogin() {
  try {
    const output = execSync('firebase projects:list', { stdio: 'pipe' }).toString();
    return !output.includes('Error:') && !output.includes('command requires authentication');
  } catch (error) {
    return false;
  }
}

/**
 * Deploy to Firebase
 * @param {string} environment - Environment to deploy to
 */
async function deploy(environment) {
  // Validate environment
  if (!config.environments.includes(environment)) {
    console.error(`\n❌ Invalid environment: ${environment}`);
    console.error(`Valid environments: ${config.environments.join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🚀 Starting deployment to ${environment} environment\n`);
  
  // Check Firebase CLI
  if (!checkFirebaseCLI()) {
    console.error('\n❌ Firebase CLI not found. Please install it with:');
    console.error('npm install -g firebase-tools');
    process.exit(1);
  }
  
  // Check Firebase login
  if (!checkFirebaseLogin()) {
    console.log('\n🔑 Please log in to Firebase:');
    runCommand('firebase login');
  }
  
  // Select Firebase project
  const projectId = config.firebaseProjectIds[environment];
  console.log(`\n📂 Using Firebase project: ${projectId}`);
  runCommand(`firebase use ${projectId}`);
  
  // Deploy Firebase Functions
  console.log('\n🔧 Deploying Firebase Functions...');
  runCommand('firebase deploy --only functions');
  
  // Deploy Firestore Rules and Indexes
  console.log('\n📝 Deploying Firestore Rules and Indexes...');
  runCommand('firebase deploy --only firestore:rules,firestore:indexes');
  
  // Deploy Storage Rules
  console.log('\n🗄️ Deploying Storage Rules...');
  runCommand('firebase deploy --only storage');
  
  // Deploy hosting
  console.log('\n🌐 Deploying to Firebase Hosting...');
  runCommand('firebase deploy --only hosting');
  
  console.log('\n✅ Deployment completed successfully!');
}

/**
 * Main function to handle the deployment process
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  const environment = args[0] || config.defaultEnvironment;
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('\nUsage: node scripts/deploy.js [environment] [--no-confirm]');
    console.log('\nEnvironments:');
    config.environments.forEach(env => {
      console.log(`  - ${env}${env === config.defaultEnvironment ? ' (default)' : ''}`);
    });
    console.log('\nOptions:');
    console.log('  --no-confirm   Skip confirmation prompt');
    process.exit(0);
  }
  
  // Check for --no-confirm flag
  const skipConfirmation = args.includes('--no-confirm');
  
  if (!skipConfirmation) {
    rl.question(`\n⚠️ Are you sure you want to deploy to ${environment}? (y/N) `, async (answer) => {
      if (answer.toLowerCase() === 'y') {
        await deploy(environment);
      } else {
        console.log('\n❌ Deployment cancelled');
      }
      rl.close();
    });
  } else {
    await deploy(environment);
    rl.close();
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Deployment failed:', error);
  process.exit(1);
});

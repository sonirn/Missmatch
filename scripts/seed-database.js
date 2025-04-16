// scripts/seed-database.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize Firebase Admin
try {
  // Try to find service account file in common locations
  const possiblePaths = [
    path.join(__dirname, '../service-account.json'),
    path.join(__dirname, 'service-account.json'),
    path.join(__dirname, '../serviceAccountKey.json'),
    path.join(__dirname, 'serviceAccountKey.json')
  ];
  
  let serviceAccountPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      serviceAccountPath = p;
      break;
    }
  }
  
  if (!serviceAccountPath) {
    console.error('\n❌ Service account file not found in common locations.');
    console.error('Please download your service account key and save it as service-account.json in the project root.');
    process.exit(1);
  }
  
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('\n✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('\n❌ Error initializing Firebase Admin:', error);
  process.exit(1);
}

// Get Firestore instance
const db = admin.firestore();

/**
 * Seed tournament settings
 * @returns {Promise<void>}
 */
async function seedTournamentSettings() {
  try {
    console.log('\n📊 Seeding tournament settings...');
    
    // Check if tournament settings already exist
    const settingsDoc = await db.collection('settings').doc('tournament').get();
    if (settingsDoc.exists) {
      console.log('⚠️ Tournament settings already exist. Skipping...');
      return;
    }
    
    // Get the current date
    const now = new Date();
    
    // Calculate tournament dates
    const miniStartDate = new Date(now);
    miniStartDate.setDate(miniStartDate.getDate() + 1); // Start tomorrow
    
    const miniEndDate = new Date(miniStartDate);
    miniEndDate.setDate(miniEndDate.getDate() + 15); // 15 days duration
    
    const grandStartDate = new Date(miniEndDate);
    grandStartDate.setDate(grandStartDate.getDate() + 1); // Start day after mini ends
    
    const grandEndDate = new Date(grandStartDate);
    grandEndDate.setDate(grandEndDate.getDate() + 15); // 15 days duration
    
    // Create tournament settings
    await db.collection('settings').doc('tournament').set({
      miniStatus: 'upcoming',
      miniStartDate: admin.firestore.Timestamp.fromDate(miniStartDate),
      miniEndDate: admin.firestore.Timestamp.fromDate(miniEndDate),
      miniPrizePoolUsdt: 10500,
      miniPrizePoolDino: 1050,
      miniEntryFee: 1,
      miniInitialized: true,
      miniPrizesDistributed: false,
      
      grandStatus: 'upcoming',
      grandStartDate: admin.firestore.Timestamp.fromDate(grandStartDate),
      grandEndDate: admin.firestore.Timestamp.fromDate(grandEndDate),
      grandPrizePoolUsdt: 605000,
      grandPrizePoolDino: 60500,
      grandEntryFee: 10,
      grandInitialized: true,
      grandPrizesDistributed: false,
      
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Tournament settings seeded successfully');
    console.log(`Mini Tournament: ${miniStartDate.toDateString()} to ${miniEndDate.toDateString()}`);
    console.log(`Grand Tournament: ${grandStartDate.toDateString()} to ${grandEndDate.toDateString()}`);
  } catch (error) {
    console.error('❌ Error seeding tournament settings:', error);
    throw error;
  }
}

/**
 * Seed admin user
 * @param {string} email - Admin email
 * @returns {Promise<void>}
 */
async function seedAdminUser(email) {
  try {
    console.log(`\n👑 Setting up admin user: ${email}...`);
    
    // First, get the user by email
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      console.log(`User with email ${email} not found. Please ensure this user has signed up first.`);
      return;
    }
    
    // Check if already an admin
    const adminDoc = await db.collection('admins').doc(userRecord.uid).get();
    if (adminDoc.exists) {
      console.log(`User ${email} is already an admin. Skipping...`);
      return;
    }
    
    // Set admin privileges in Firestore
    await db.collection('admins').doc(userRecord.uid).set({
      email: email,
      admin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Admin user ${email} (${userRecord.uid}) set up successfully`);
  } catch (error) {
    console.error(`❌ Error setting up admin user ${email}:`, error);
    throw error;
  }
}

/**
 * Seed booster prices
 * @returns {Promise<void>}
 */
async function seedBoosterPrices() {
  try {
    console.log('\n🚀 Seeding booster prices...');
    
    // Check if booster prices already exist
    const pricesDoc = await db.collection('settings').doc('prices').get();
    if (pricesDoc.exists) {
      console.log('⚠️ Booster prices already exist. Skipping...');
      return;
    }
    
    await db.collection('settings').doc('prices').set({
      boosters: {
        booster1: 10,  // 10 USDT - 10 games
        booster2: 50,  // 50 USDT - 100 games
        booster3: 100  // 100 USDT - Unlimited games
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Booster prices seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding booster prices:', error);
    throw error;
  }
}

/**
 * Seed initial data
 * @param {string} adminEmail - Admin email
 * @returns {Promise<void>}
 */
async function seedDatabase(adminEmail) {
  try {
    console.log('\n🌱 Starting database seeding process...');
    
    // Seed tournament settings
    await seedTournamentSettings();
    
    // Seed admin user
    if (adminEmail) {
      await seedAdminUser(adminEmail);
    }
    
    // Seed booster prices
    await seedBoosterPrices();
    
    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Database seeding failed:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    let adminEmail = args.find(arg => arg.includes('@'));
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log('\nUsage: node scripts/seed-database.js [admin@email.com] [--force]');
      console.log('\nOptions:');
      console.log('  admin@email.com   Email of the admin user to set up');
      console.log('  --force           Skip confirmation prompt');
      process.exit(0);
    }
    
    // Check for --force flag
    const skipConfirmation = args.includes('--force');
    
    if (!adminEmail) {
      // Prompt for admin email if not provided
      await new Promise(resolve => {
        rl.question('\n👑 Enter the email of the admin user: ', (email) => {
          adminEmail = email;
          resolve();
        });
      });
    }
    
    if (!skipConfirmation) {
      await new Promise(resolve => {
        rl.question(`\n⚠️ This will initialize the database with tournament settings and set ${adminEmail} as an admin. Continue? (y/N) `, (answer) => {
          if (answer.toLowerCase() === 'y') {
            resolve();
          } else {
            console.log('\n❌ Database seeding cancelled');
            process.exit(0);
          }
        });
      });
    }
    
    await seedDatabase(adminEmail);
    rl.close();
  } catch (error) {
    console.error('\n❌ An error occurred:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ An unexpected error occurred:', error);
  process.exit(1);
});

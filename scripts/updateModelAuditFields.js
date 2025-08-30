/**
 * This script updates existing model files to include created_by and updated_by fields
 * so they work with the database columns we just added
 */

const fs = require('fs');
const path = require('path');

// List of model files that need audit fields added
const modelFiles = [
  'User.js',
  'UserProfile.js',
  'EmergencyContact.js',
  'FitnessGoal.js',
  'UserFitnessGoal.js',
  // Gym.js - already updated
  // GymQRCodes.js - already has audit fields but different structure
  'CheckInMethod.js',
  'GymCheckInMethods.js',
  'Attendance.js',
  'Subscription.js',
  'UserSubscription.js',
  'Payment.js',
  'PaymentItem.js',
  'Invoice.js',
  'InvoiceItem.js',
  'Refund.js',
  'Wallet.js',
  'WalletTransaction.js',
  'WithdrawRequest.js',
  'GymSlot.js',
  'UserSlotBooking.js',
  'SlotWaitlist.js',
  'Advertisement.js',
  'AdvertisementAnalytics.js',
  'Notification.js',
  'PushSubscription.js',
  'GymTrainer.js',
  'DietPlan.js',
  'DietPlanMeal.js',
  'DietChangeRequest.js',
  'DietPlanHistory.js',
  'Plan.js',
  'Media.js'
];

const auditFieldsCode = `  createdBy: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'created_by',
    comment: 'User ID who created this record'
  },
  updatedBy: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'updated_by',  
    comment: 'User ID who last updated this record'
  }`;

const addAuditFieldsToModel = (filePath) => {
  try {
    console.log(`📝 Processing ${path.basename(filePath)}...`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Check if audit fields already exist
    if (content.includes('createdBy:') || content.includes('created_by:')) {
      console.log(`  ✅ Audit fields already exist in ${path.basename(filePath)}`);
      return false;
    }

    // Find the pattern where we need to insert audit fields
    // Look for the closing of the model definition attributes
    const patterns = [
      // Pattern 1: Simple closing with }, {
      /(\s+})\s*},\s*\{\s*$/m,
      // Pattern 2: Closing with comment and }, {
      /(\s+}[^}]*)\s*},\s*\{\s*/m,
      // Pattern 3: Field followed by }, {
      /(\s+[^}]+)\s*},\s*\{\s*/m,
    ];

    let patternFound = false;
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      if (pattern.test(content)) {
        content = content.replace(pattern, (match, p1) => {
          const replacement = p1 + ',\n' + auditFieldsCode + '\n' + match.substring(p1.length);
          return replacement;
        });
        patternFound = true;
        break;
      }
    }

    if (!patternFound) {
      console.log(`  ❌ Could not find suitable insertion point in ${path.basename(filePath)}`);
      return false;
    }

    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Successfully added audit fields to ${path.basename(filePath)}`);
    return true;

  } catch (error) {
    console.error(`  ❌ Error processing ${path.basename(filePath)}:`, error.message);
    return false;
  }
};

const updateAllModels = () => {
  console.log('🔄 Starting to add audit fields to model files...\n');
  
  const modelsDir = path.join(__dirname, '..', 'models');
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const modelFile of modelFiles) {
    const filePath = path.join(modelsDir, modelFile);
    const result = addAuditFieldsToModel(filePath);
    
    if (result === true) {
      successCount++;
    } else if (result === false && fs.existsSync(filePath)) {
      skippedCount++;
    } else {
      errorCount++;
    }
  }

  console.log('\n🎉 Model update process completed!');
  console.log(`📊 Summary:`);
  console.log(`  ✅ Updated: ${successCount} files`);
  console.log(`  ⏭️  Skipped: ${skippedCount} files (already have audit fields)`);
  console.log(`  ❌ Errors: ${errorCount} files`);

  if (successCount > 0) {
    console.log('\n⚠️  IMPORTANT: You may need to restart your server for the model changes to take effect!');
  }
};

// Run if called directly
if (require.main === module) {
  updateAllModels();
}

module.exports = updateAllModels;

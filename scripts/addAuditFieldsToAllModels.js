const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../models');
const AUDIT_FIELDS = `
  recordStatus: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    field: 'record_status',
    comment: '1=active, 0=inactive'
  },
  createdBy: {
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

const TIMESTAMP_CONFIG = `
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true`;

/**
 * Check if model file has audit fields
 */
function hasAuditFields(content) {
  return content.includes('record_status') && 
         content.includes('created_by') && 
         content.includes('updated_by');
}

/**
 * Check if model has proper timestamp configuration
 */
function hasProperTimestamps(content) {
  return content.includes("createdAt: 'created_at'") && 
         content.includes("updatedAt: 'updated_at'");
}

/**
 * Add audit fields to a model file
 */
function addAuditFields(content, modelName) {
  let updatedContent = content;
  
  // Find the last field before the closing brace of the model definition
  const modelDefRegex = new RegExp(`const ${modelName} = sequelize\\.define\\('${modelName}', \\{([\\s\\S]*?)\\}, \\{`, 'i');
  const match = updatedContent.match(modelDefRegex);
  
  if (!match) {
    console.warn(`Could not find model definition for ${modelName}`);
    return content;
  }
  
  const modelFields = match[1];
  
  // Check if audit fields already exist
  if (hasAuditFields(updatedContent)) {
    console.log(`✓ ${modelName} already has audit fields`);
  } else {
    // Add audit fields before the closing brace of the field definitions
    const lastFieldEndIndex = match.index + match[0].length - 3; // Position before "}, {"
    updatedContent = updatedContent.substring(0, lastFieldEndIndex) + 
                    ',' + AUDIT_FIELDS + 
                    updatedContent.substring(lastFieldEndIndex);
    console.log(`+ Added audit fields to ${modelName}`);
  }
  
  // Fix timestamp configuration
  if (!hasProperTimestamps(updatedContent)) {
    // Replace existing timestamp configuration
    updatedContent = updatedContent.replace(
      /timestamps:\s*true[^}]*updatedAt[^,}]*/g,
      TIMESTAMP_CONFIG.trim()
    );
    console.log(`+ Fixed timestamp configuration for ${modelName}`);
  }
  
  return updatedContent;
}

/**
 * Process all model files
 */
async function processAllModels() {
  console.log('🔄 Processing all model files...\n');
  
  const modelFiles = fs.readdirSync(MODELS_DIR)
    .filter(file => file.endsWith('.js') && !file.startsWith('index'))
    .sort();
  
  let processedCount = 0;
  let errorCount = 0;
  
  for (const file of modelFiles) {
    const filePath = path.join(MODELS_DIR, file);
    const modelName = path.basename(file, '.js');
    
    try {
      console.log(`Processing ${modelName}...`);
      
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const updatedContent = addAuditFields(originalContent, modelName);
      
      if (originalContent !== updatedContent) {
        // Create backup
        fs.writeFileSync(filePath + '.backup', originalContent);
        
        // Write updated content
        fs.writeFileSync(filePath, updatedContent);
        processedCount++;
      }
      
      console.log('');
    } catch (error) {
      console.error(`❌ Error processing ${modelName}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('='.repeat(50));
  console.log(`✅ Processing complete!`);
  console.log(`📊 Files processed: ${processedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📁 Total model files: ${modelFiles.length}`);
  
  if (processedCount > 0) {
    console.log('\n💡 Backup files created with .backup extension');
    console.log('💡 Please review the changes and test your models');
  }
}

/**
 * Verify all models have audit fields
 */
function verifyAuditFields() {
  console.log('\n🔍 Verifying audit fields in all models...\n');
  
  const modelFiles = fs.readdirSync(MODELS_DIR)
    .filter(file => file.endsWith('.js') && !file.startsWith('index'))
    .sort();
  
  const results = {
    withAudit: [],
    withoutAudit: [],
    withoutTimestamps: []
  };
  
  for (const file of modelFiles) {
    const filePath = path.join(MODELS_DIR, file);
    const modelName = path.basename(file, '.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (hasAuditFields(content)) {
      results.withAudit.push(modelName);
    } else {
      results.withoutAudit.push(modelName);
    }
    
    if (!hasProperTimestamps(content)) {
      results.withoutTimestamps.push(modelName);
    }
  }
  
  console.log(`✅ Models with audit fields (${results.withAudit.length}):`);
  results.withAudit.forEach(name => console.log(`   ✓ ${name}`));
  
  if (results.withoutAudit.length > 0) {
    console.log(`\n❌ Models missing audit fields (${results.withoutAudit.length}):`);
    results.withoutAudit.forEach(name => console.log(`   ✗ ${name}`));
  }
  
  if (results.withoutTimestamps.length > 0) {
    console.log(`\n⚠️  Models with timestamp issues (${results.withoutTimestamps.length}):`);
    results.withoutTimestamps.forEach(name => console.log(`   ! ${name}`));
  }
  
  return results;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--verify')) {
    verifyAuditFields();
  } else if (args.includes('--process')) {
    processAllModels();
  } else {
    console.log('Usage:');
    console.log('  node addAuditFieldsToAllModels.js --verify   # Check current state');
    console.log('  node addAuditFieldsToAllModels.js --process  # Add audit fields to all models');
  }
}

module.exports = {
  addAuditFields,
  processAllModels,
  verifyAuditFields,
  hasAuditFields,
  hasProperTimestamps
};

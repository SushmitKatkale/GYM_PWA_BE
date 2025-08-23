const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

async function runSQLScript() {
  try {
    console.log('📄 Reading SQL script...');
    
    const sqlFilePath = path.join(__dirname, '../sql/insert-test-data.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split by semicolon and filter out empty statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔍 Found ${statements.length} SQL statements to execute`);
    
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`\n📝 Executing statement ${i + 1}/${statements.length}:`);
        console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
        
        try {
          const [results] = await sequelize.query(statement);
          
          // If it's a SELECT statement, show results
          if (statement.trim().toUpperCase().startsWith('SELECT')) {
            console.log('📊 Results:', JSON.stringify(results, null, 2));
          } else {
            console.log(`✅ Statement executed successfully`);
          }
        } catch (error) {
          console.error(`❌ Error executing statement:`, error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('\n🎉 SQL script execution completed!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('📊 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  runSQLScript()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runSQLScript };

const { PushSubscription, User } = require('./models');
const { sequelize } = require('./config/database');

async function testDatabaseSubscription() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Test data
    const testUserEmail = 'katkalesushmit@gmail.com';
    const testSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/fFGOtKk8YM4:APA91bGouWfoq6jPWpODABrr0ovUz8qMzXXRvnqTETlN8-Ps3voSOrhkcrYTSas8cBzCY3P6-VmxWuOwef_mRQgU5sMi4RcB10rqsg2YaZg4u_rb7BcsReWdUeuSDdAr5KbcyTyER58x',
      keys: {
        p256dh: 'BPGeHKu_AO2AJ26PU_NbvmUKu3Eo9dw4HHiL_aoIAghqGrvXoXXo2VfSfImsaDlzrgLiZrP3V8e9w7qSbppO4fc',
        auth: 'Q66OfUWrS9GAz-OjnwHf5w'
      }
    };
    const deviceInfo = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
    };

    console.log('\n=== Testing Push Subscription Database Operations ===');
    console.log('👤 User email:', testUserEmail);
    console.log('📱 Endpoint:', testSubscription.endpoint.substring(0, 50) + '...');

    // Check if user exists
    console.log('\n1️⃣ Checking if user exists...');
    const user = await User.findOne({ where: { email: testUserEmail } });
    console.log('   User found:', !!user);
    if (user) {
      console.log('   User details:', { email: user.email, firstName: user.firstName, lastName: user.lastName, type: user.type });
    } else {
      console.log('   ⚠️  User not found - this might cause foreign key constraint issues');
    }

    // Check for existing subscription
    console.log('\n2️⃣ Checking for existing subscription...');
    const existing = await PushSubscription.findOne({
      where: {
        userEmail: testUserEmail,
        endpoint: testSubscription.endpoint
      }
    });
    console.log('   Existing subscription found:', !!existing);

    if (existing) {
      console.log('\n3️⃣ Updating existing subscription...');
      try {
        const updated = await existing.update({
          p256dhKey: testSubscription.keys.p256dh,
          authKey: testSubscription.keys.auth,
          isActive: true,
          lastUsed: new Date(),
          userAgent: deviceInfo?.userAgent,
          subscriptionData: testSubscription
        });
        console.log('   ✅ Update successful:', {
          id: updated.id,
          userEmail: updated.userEmail,
          isActive: updated.isActive,
          lastUsed: updated.lastUsed
        });
      } catch (updateError) {
        console.error('   ❌ Update failed:', updateError.message);
        throw updateError;
      }
    } else {
      console.log('\n3️⃣ Creating new subscription...');
      console.log('   Data to create:', {
        userEmail: testUserEmail,
        endpoint: testSubscription.endpoint.substring(0, 50) + '...',
        p256dhKey: testSubscription.keys.p256dh.substring(0, 20) + '...',
        authKey: testSubscription.keys.auth.substring(0, 10) + '...',
        userAgent: deviceInfo?.userAgent
      });

      // Generate unique ID for subscription
      const generateId = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 12; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      try {
        const newSubscription = await PushSubscription.create({
          id: generateId(),
          userEmail: testUserEmail,
          endpoint: testSubscription.endpoint,
          p256dhKey: testSubscription.keys.p256dh,
          authKey: testSubscription.keys.auth,
          userAgent: deviceInfo?.userAgent,
          subscriptionData: testSubscription
        });
        console.log('   ✅ Creation successful:', {
          id: newSubscription.id,
          userEmail: newSubscription.userEmail,
          isActive: newSubscription.isActive,
          createTimestamp: newSubscription.createTimestamp
        });
      } catch (createError) {
        console.error('   ❌ Creation failed:', createError.message);
        throw createError;
      }
    }

    console.log('\n4️⃣ Verifying subscription in database...');
    const verification = await PushSubscription.findOne({
      where: {
        userEmail: testUserEmail,
        endpoint: testSubscription.endpoint
      }
    });
    console.log('   Verification result:', !!verification);
    if (verification) {
      console.log('   Subscription details:', {
        id: verification.id,
        userEmail: verification.userEmail,
        isActive: verification.isActive,
        createTimestamp: verification.createTimestamp,
        updateTimestamp: verification.updateTimestamp
      });
    }

  } catch (error) {
    console.error('\n💥 === ERROR DETAILS ===');
    console.error('🏷️  Error name:', error.name);
    console.error('📝 Error message:', error.message);
    
    if (error.sql) {
      console.error('🗃️  SQL query:', error.sql);
    }
    
    if (error.parent) {
      console.error('👨‍👩‍👧‍👦 Parent error:', error.parent.message || error.parent);
    }
    
    if (error.original) {
      console.error('🔍 Original error:', error.original.message || error.original);
    }

    if (error.errors && Array.isArray(error.errors)) {
      console.error('📋 Validation errors:');
      error.errors.forEach((err, index) => {
        console.error(`   ${index + 1}. ${err.message} (path: ${err.path}, value: ${err.value})`);
      });
    }

    // Check for specific common database issues
    if (error.message.includes('foreign key constraint')) {
      console.error('\n⚠️  DIAGNOSIS: Foreign key constraint violation');
      console.error('   This usually means the user email doesn\'t exist in the users table');
    } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
      console.error('\n⚠️  DIAGNOSIS: Duplicate entry violation');
      console.error('   This means a subscription with this user/endpoint combination already exists');
    } else if (error.message.includes('not null')) {
      console.error('\n⚠️  DIAGNOSIS: Null constraint violation');
      console.error('   A required field is missing or null');
    } else if (error.message.includes('length')) {
      console.error('\n⚠️  DIAGNOSIS: String length violation');
      console.error('   One of the fields exceeds maximum allowed length');
    }

  } finally {
    console.log('\n🔚 Closing database connection...');
    try {
      await sequelize.close();
    } catch (closeError) {
      console.error('Error closing connection:', closeError.message);
    }
    process.exit(0);
  }
}

testDatabaseSubscription();

/**
 * Quick script to find the owner of Sun Fitness gym
 */

const { Gym, sequelize } = require('./models');

async function findGymOwner() {
  try {
    console.log('🔍 Looking for Sun Fitness gym owner...\n');
    
    // Find the Sun Fitness gym
    const gym = await Gym.findOne({
      where: { name: 'Sun Fitness' }
    });
    
    if (gym) {
      console.log('✅ Found Sun Fitness gym:');
      console.log(`- Gym ID: ${gym.id}`);
      console.log(`- Owner ID: ${gym.ownerId}`);
      console.log(`- Name: ${gym.name}`);
      console.log(`- Address: ${gym.address}`);
      console.log(`- City: ${gym.city}`);
      console.log(`- State: ${gym.state}`);
      console.log(`- Capacity: ${gym.capacity}`);
      console.log(`- Record Status: ${gym.recordStatus}`);
      
      // Also check all active gyms to see what we have
      console.log('\n📋 All active gyms in database:');
      const allGyms = await Gym.findAll({
        where: { recordStatus: 1 },
        attributes: ['id', 'name', 'ownerId', 'city']
      });
      
      allGyms.forEach(g => {
        console.log(`- Gym ${g.id}: "${g.name}" (Owner: ${g.ownerId}, City: ${g.city})`);
      });
      
    } else {
      console.log('❌ No gym named "Sun Fitness" found');
      
      // Show all gyms
      console.log('\n📋 All gyms in database:');
      const allGyms = await Gym.findAll({
        attributes: ['id', 'name', 'ownerId', 'city', 'recordStatus']
      });
      
      allGyms.forEach(g => {
        console.log(`- Gym ${g.id}: "${g.name}" (Owner: ${g.ownerId}, Status: ${g.recordStatus})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findGymOwner().then(() => {
  console.log('\n🏁 Search complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
});
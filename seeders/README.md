# Database Seeders for Gym Management System

This directory contains comprehensive database seeder scripts for the gym management attendance system. These scripts populate the database with realistic test data for development, testing, and demonstration purposes.

## 📁 Seeder Files

### Core Seeders

1. **`01-users-seeder.js`** - Creates test user accounts
   - Regular users (3), gym owners (2), and admins (2)
   - All with realistic attendance preferences
   - Default password: `123456`

2. **`02-gyms-seeder.js`** - Creates realistic gym locations
   - 6 diverse gyms across different cities (NYC, LA, SF, Chicago)
   - Various gym types: premium, budget, CrossFit, yoga studio, etc.
   - Complete with addresses, ratings, and attendance system configs

3. **`03-checkin-methods-seeder.js`** - Sets up check-in methods
   - Configures available check-in methods for each gym
   - Based on gym capabilities and ratings
   - Methods: quick check-in, QR scan, codes, biometrics, staff scan

4. **`04-qr-codes-seeder.js`** - Creates QR codes for check-ins
   - Multiple QR codes per gym (main, secondary, locker room)
   - Different types: permanent, daily rotating, event codes
   - Usage tracking and expiration dates

5. **`05-unique-codes-seeder.js`** - Creates unique access codes
   - Various code types: permanent, daily, weekly, monthly
   - Different purposes: main access, staff, guest, VIP, trial
   - Auto-regeneration settings for temporary codes

6. **`06-attendance-seeder.js`** - Creates sample attendance records
   - 200+ realistic attendance sessions over past 30 days
   - Various check-in methods and durations
   - Active sessions (users currently checked in)
   - Session ratings and notes

### Master Seeder

**`master-seeder.js`** - Runs all seeders in correct order
- Handles dependencies between seeders
- Comprehensive error handling
- Progress reporting and final summary
- Command-line options for customization

## 🚀 Quick Start

### Run All Seeders
```bash
# Full seeding with all data
node seeders/master-seeder.js

# Skip attendance records (faster for basic setup)
node seeders/master-seeder.js --no-attendance

# Force re-seed existing data
node seeders/master-seeder.js --force

# Quiet mode with minimal output
node seeders/master-seeder.js --quiet
```

### Run Individual Seeders
```bash
# Run specific seeder
node seeders/01-users-seeder.js
node seeders/02-gyms-seeder.js
# ... etc

# Always run in dependency order:
# users → gyms → check-in methods → QR codes → unique codes → attendance
```

## 📊 What Gets Created

### Users (7 total)
- **Regular Users (3):**
  - `testuser@gym.com` - John Doe (basic preferences)
  - `testuser2@gym.com` - Jane Smith (biometric enabled)  
  - `testuser3@gym.com` - Mike Johnson (minimal notifications)

- **Gym Owners (2):**
  - `gymowner@gym.com` - Sarah Wilson (owns premium gyms)
  - `gymowner2@gym.com` - David Brown (owns budget/specialty gyms)

- **Admins (2):**
  - `admin@gym.com` - Admin User (standard admin)
  - `superadmin@gym.com` - Super Admin (full access)

### Gyms (6 total)
- **PowerFit Gym Downtown** (NYC) - Modern gym, 100 capacity
- **Elite Fitness Center** (NYC) - Premium facility, 150 capacity  
- **Budget Gym Express** (NYC) - 24/7 affordable, 50 capacity
- **CrossFit Iron Warriors** (LA) - High-intensity training, 80 capacity
- **Yoga & Wellness Studio** (SF) - Holistic wellness, 40 capacity
- **Muscle Factory Gym** (Chicago) - Hardcore bodybuilding, 200 capacity

### Check-in Methods
- Each gym gets 3-6 check-in methods based on capabilities
- Methods: quick check-in, QR scan, access codes, staff scan, biometrics
- Configured with appropriate distance limits and requirements

### QR Codes
- 2-5 QR codes per gym (main, secondary, locker, daily, event)
- Different types: permanent, daily rotating, temporary
- Usage tracking and expiration management

### Unique Codes  
- 3-6 access codes per gym based on rating
- Permanent codes: main access, staff emergency
- Rotating codes: daily, weekly (guests), monthly (VIP)
- Trial codes for budget gyms

### Attendance Records (200+)
- Realistic check-in patterns over past 30 days
- Various check-in methods and workout durations
- Session ratings and notes (30-40% of sessions)
- 10 active sessions (users currently checked in)

## 🔐 Default Login Credentials

All accounts use password: **`123456`**

| Email | Role | Description |
|-------|------|-------------|
| `testuser@gym.com` | User | Regular gym member |
| `testuser2@gym.com` | User | Biometric-enabled user |
| `testuser3@gym.com` | User | Privacy-focused user |
| `gymowner@gym.com` | Owner | Owns premium gyms |
| `gymowner2@gym.com` | Owner | Owns specialty gyms |
| `admin@gym.com` | Admin | System administrator |
| `superadmin@gym.com` | Admin | Super administrator |

## 🧪 Testing the System

### Basic Authentication Test
```bash
# Test user login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@gym.com", "password": "123456"}'
```

### API Endpoints to Test
```bash
# Get all gyms
curl http://localhost:8080/api/gyms

# Get gym check-in methods
curl http://localhost:8080/api/gyms/1/checkin-methods

# Get user attendance history (requires authentication)
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/attendance/user/testuser@gym.com
```

### Quick Access Codes
After running the seeder, note the displayed access codes for testing:
- Use these codes to test the gym code check-in functionality
- Different types: permanent (never expire), daily (rotate), trial (limited uses)

## 🛠️ Customization

### Modify User Data
Edit `01-users-seeder.js` to:
- Add more test users
- Change default preferences
- Modify user roles and permissions

### Adjust Gym Data
Edit `02-gyms-seeder.js` to:
- Add gyms in your location
- Modify capacity and features
- Change attendance system settings

### Configure Attendance Data
Edit `06-attendance-seeder.js` to:
- Adjust number of records created
- Modify time ranges and patterns
- Change check-in method distribution

## 📋 Dependencies

Seeders must be run in order due to foreign key relationships:

```
Users (required for gym ownership and attendance)
  ↓
Gyms (required for methods, codes, and attendance)
  ↓
Check-in Methods, QR Codes, Unique Codes (independent of each other)
  ↓  
Attendance Records (requires users and gyms)
```

## 🐛 Troubleshooting

### Common Issues

**Foreign Key Errors:**
- Ensure users are created before gyms
- Check that referenced emails exist in users table
- Verify gym IDs exist before creating codes/attendance

**Duplicate Key Errors:**
- Seeders use `findOrCreate` to avoid duplicates
- Use `--force` flag to override existing data
- Check unique constraints (emails, usernames, codes)

**Missing Dependencies:**
- Run `npm install` to ensure bcrypt is installed
- Verify database connection in `config/database.js`
- Ensure all models are properly synchronized

### Debugging
Enable verbose logging by removing `--quiet` flag:
```bash
node seeders/master-seeder.js --verbose
```

View detailed error messages in individual seeder files.

## 📈 Production Considerations

⚠️ **WARNING: Never run these seeders in production!**

These scripts are for development/testing only:
- They create accounts with default passwords
- Data is not production-ready
- May overwrite existing data

For production:
1. Remove or secure all seeder files
2. Create proper admin accounts with strong passwords
3. Set up proper gym data through the admin interface
4. Use environment-specific configurations

## 🔄 Maintenance

### Updating Seeders
- Keep seeders in sync with model changes
- Update foreign key references when schema changes
- Add new seeders for new features
- Maintain realistic test data as system grows

### Regular Tasks
- Regenerate expired QR codes and unique codes
- Clean up old attendance records in test databases
- Update user preferences to match new features
- Refresh sample data periodically for demos

---

**Need help?** Check the individual seeder files for detailed comments and configuration options.

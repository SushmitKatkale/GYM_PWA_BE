# Role-Based Data Filtering System

This document explains how the role-based data filtering system works in the Gym PWA Backend.

## Overview

The system implements different data visibility and access levels based on user roles:

- **Admin (type='3')**: Full access to all data across the system
- **Owner (type='2')**: Limited access to only their own resources + filtered data fields
- **User (type='1')**: Limited access to public data only

## Implementation Components

### 1. DataFilter Utility (`utils/dataFilter.js`)

Central utility class that handles role-based data filtering:

```javascript
const DataFilter = require('../utils/dataFilter');

// Usage in controllers
const filteredData = DataFilter.filterOwnerData(req.user, rawData);
```

### 2. Authentication & Authorization Flow

```javascript
// Route configuration
router.get('/api/owners', authenticate, authorize('3'), getOwners);
router.get('/api/gyms', authenticate, authorize('3', '2'), getAllGyms);
```

1. **Authentication**: Validates JWT token and loads user into `req.user`
2. **Authorization**: Checks if user type matches required permissions  
3. **Data Filtering**: Applies role-based filtering before sending response

## Data Filtering Examples

### Admin vs Owner Data Access

**Admin Response (Full Data):**
```json
{
  "success": true,
  "data": [
    {
      "email": "owner@gym.com",
      "id": "OWNER123",
      "firstName": "John",
      "lastName": "Doe", 
      "username": "johndoe",
      "phoneNumber": "1234567890",
      "type": "2",
      "activeStatus": "1",
      "createTimestamp": "2025-08-03T22:03:17.000Z",
      "createdBy": "ADMIN001",      // Admin can see this
      "updatedBy": "ADMIN001",      // Admin can see this
      "isVerified": true
    }
  ]
}
```

**Owner Response (Filtered Data):**
```json
{
  "success": true,
  "data": [
    {
      "email": "owner@gym.com",
      "id": "OWNER123", 
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "phoneNumber": "1234567890",
      "activeStatus": "1",
      "createTimestamp": "2025-08-03T22:03:17.000Z"
      // createdBy, updatedBy, isVerified fields are hidden
    }
  ]
}
```

## Controller Implementation Pattern

### Before (No Filtering)
```javascript
async function getOwners(req, res) {
  try {
    const owners = await User.findAll({ where: { type: '2' } });
    res.json({ success: true, data: owners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
```

### After (With Role-Based Filtering)
```javascript
async function getOwners(req, res) {
  try {
    const owners = await User.findAll({ 
      where: { type: '2' },
      attributes: { exclude: ['password'] } // Never return passwords
    });
    
    // Apply role-based filtering
    const filteredData = DataFilter.filterOwnerData(
      req.user, 
      owners.map(owner => owner.toJSON())
    );
    
    return ResponseUtil.success(res, filteredData, 'Owners retrieved successfully');
  } catch (error) {
    console.error('Get owners error:', error);
    return ResponseUtil.error(res, 'Failed to retrieve owners');
  }
}
```

## Entity-Specific Filtering Rules

### Owner Data
- **Admin**: All fields
- **Owner**: Basic fields only (id, firstName, lastName, username, email, phoneNumber, activeStatus, createTimestamp)

### Gym Data  
- **Admin**: All fields
- **Owner**: All business fields (excludes createdBy, updatedBy)
- **Ownership Filter**: Owners only see their own gyms (`ownerId = user.email`)

### Subscription Data
- **Admin**: All fields including pricing details
- **Owner**: Hide internal admin fields (createdBy, updatedBy, discountedPrice)

### User Data
- **Admin**: All fields (except password)
- **Owner**: Hide sensitive tracking (createdBy, updatedBy)

## Route Access Matrix

| Endpoint | Admin | Owner | User |
|----------|-------|-------|------|
| `GET /api/owners` | ✅ All owners | ❌ No access | ❌ No access |
| `GET /api/gyms` | ✅ All gyms | ✅ Own gyms only | ❌ No access |
| `GET /api/users` | ✅ All users | ❌ No access | ❌ No access |
| `GET /api/subscriptions` | ✅ All data | ✅ Own gym subs | ✅ Public data |

## Database Query Optimization

### Ownership Filtering at Query Level
```javascript
// Apply ownership filter in database query
const whereClause = {};
if (req.user.type === '2') { // Owner
  whereClause.ownerId = req.user.email;
}

const gyms = await Gym.findAll({ where: whereClause });
```

### Field-Level Filtering
```javascript
// Admin gets all fields
if (user.type === '3') return data;

// Owner gets filtered fields
const allowedFields = ['id', 'name', 'address', 'capacity'];
return DataFilter.keepOnlyFields(data, allowedFields);
```

## Benefits

1. **Security**: Sensitive data is hidden from unauthorized users
2. **Performance**: Database queries are optimized with ownership filters
3. **Maintainability**: Centralized filtering logic in `DataFilter` utility
4. **Scalability**: Easy to add new entities and filtering rules
5. **Consistency**: Same filtering pattern across all controllers

## Adding New Entity Support

1. **Add filter method to DataFilter**:
```javascript
static filterNewEntityData(user, data) {
  if (user.type === '3') return data; // Admin gets all
  
  // Define owner filtering rules
  const hiddenFields = ['createdBy', 'updatedBy'];
  return this.removeFields(data, hiddenFields);
}
```

2. **Update controller**:
```javascript
const filteredData = DataFilter.filterNewEntityData(req.user, rawData);
```

3. **Configure routes**:
```javascript
router.get('/new-entity', authenticate, authorize('3', '2'), getNewEntity);
```

This system ensures that each user role sees only the appropriate data while maintaining security and performance.

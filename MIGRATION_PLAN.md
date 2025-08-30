# Database Schema Migration Plan

## Overview
This document outlines the phase-by-phase migration from the current email-based primary key system to the new BIGINT ID-based system according to the DB.sql schema.

## Current State
- User primary key: email (STRING)
- Foreign keys: email-based relationships
- Roles: 1=user, 2=owner, 3=admin
- Custom timestamps: createTimestamp, updateTimestamp

## Target State  
- User primary key: id (BIGINT AUTO_INCREMENT)
- Foreign keys: user_id based relationships
- Roles: 1=member, 2=owner, 3=trainer, 4=admin
- Standard timestamps: created_at, updated_at

## Migration Phases

### Phase 1: Core Schema Foundation ✅ IN PROGRESS
- [ ] Update User model structure
- [ ] Create migration scripts for data transformation
- [ ] Add data migration utilities
- [ ] Test user creation with new schema

### Phase 2: Update Core Models
- [ ] Update UserProfile (email → user_id FK)
- [ ] Update Gym model
- [ ] Update Subscription model
- [ ] Update Emergency Contacts

### Phase 3: Create New Essential Models
- [ ] CheckInMethods master table
- [ ] Media unified table
- [ ] Update attendance models

### Phase 4: Enhanced Payment & Subscription System
- [ ] Payment model updates
- [ ] UserSubscription with buffer support
- [ ] PaymentItems model
- [ ] Refunds enhancement

### Phase 5: Wallet System Implementation
- [ ] Wallet models
- [ ] Transaction management
- [ ] Withdrawal requests

### Phase 6: Trainer & Diet Management System
- [ ] Trainer role integration
- [ ] Diet plan models
- [ ] Trainer-gym mapping

### Phase 7: Update All Associations & Controllers
- [ ] Model associations update
- [ ] Controller updates
- [ ] Authentication middleware

### Phase 8: Database Migration & Testing
- [ ] Data migration scripts
- [ ] Testing framework
- [ ] Production deployment plan

## Critical Notes

### Data Migration Strategy
1. **Backup current database** before any changes
2. **Add new fields** alongside existing ones initially
3. **Migrate data** in batches
4. **Update associations** gradually
5. **Remove old fields** after verification

### Breaking Changes
- All API responses will change (id instead of email references)
- Authentication tokens may need refresh
- Frontend integration will need updates

### Risk Mitigation
- Maintain backward compatibility during transition
- Comprehensive testing at each phase
- Rollback procedures documented

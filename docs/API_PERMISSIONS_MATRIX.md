# API Permissions Matrix

This document outlines the authentication and authorization requirements for all API endpoints in the Gym PWA Backend.

## Authentication Levels
- **Public**: No authentication required
- **Authenticated**: Valid JWT token required
- **Admin**: Admin role (type='3') required
- **Owner**: Owner role (type='2') required with ownership validation
- **Admin/Owner**: Either Admin or Owner role required

## User Types
- `1` = Regular User
- `2` = Owner
- `3` = Admin

---

## 🔐 Authentication Endpoints
| Method | Endpoint | Access Level | Notes |
|--------|----------|--------------|-------|
| POST | `/api/auth/login` | Public | User login |
| POST | `/api/auth/register` | Public | User registration |
| POST | `/api/auth/refresh` | Authenticated | Token refresh |
| POST | `/api/auth/logout` | Authenticated | User logout |

---

## 👥 User Management Endpoints
| Method | Endpoint | Access Level | Ownership Rule |
|--------|----------|--------------|----------------|
| POST | `/api/users` | **Admin Only** | Admin can create any user |
| GET | `/api/users` | **Admin Only** | Admin can view all users |
| GET | `/api/users/:email` | **Admin Only** | Admin can view any user |
| PUT | `/api/users/:email` | **Admin Only** | Admin can update any user |
| DELETE | `/api/users/:email` | **Admin Only** | Admin can delete any user |
| DELETE | `/api/users/hard/:email` | **Admin Only** | Admin can permanently delete any user |
| PUT | `/api/users/toggle/:email` | **Admin Only** | Admin can toggle any user status |
| GET | `/api/users/type/:type` | **Admin Only** | Admin can filter users by type |
| PUT | `/api/users/change-password/:email` | **Authenticated** | Users can change own password, Admin can change any |
| GET | `/api/users/profile` | **Authenticated** | Any authenticated user can get their own profile |

---

## 🏢 Owner Management Endpoints
| Method | Endpoint | Access Level | Ownership Rule |
|--------|----------|--------------|----------------|
| GET | `/api/owners` | **Admin Only** | Admin can view all owners |
| GET | `/api/owners/search` | **Admin Only** | Admin can search owners |
| POST | `/api/owners` | **Admin Only** | Admin can create owners |
| PUT | `/api/owners/:id` | **Admin Only** | Admin can update any owner |
| DELETE | `/api/owners/:id` | **Admin Only** | Admin can delete any owner |

---

## 🏋️ Gym Management Endpoints
| Method | Endpoint | Access Level | Ownership Rule |
|--------|----------|--------------|----------------|
| POST | `/api/gyms` | **Admin/Owner** | Admin: any gym<br>Owner: only their own gyms |
| GET | `/api/gyms` | **Public** | Anyone can view gym list |
| GET | `/api/gyms/:id` | **Public** | Anyone can view gym details |
| PUT | `/api/gyms/:id` | **Admin/Owner** | Admin: any gym<br>Owner: only their own gyms |
| DELETE | `/api/gyms/:id` | **Admin/Owner** | Admin: any gym<br>Owner: only their own gyms |

---

## 🏃 Gym Slots & Booking Endpoints
| Method | Endpoint | Access Level | Ownership Rule |
|--------|----------|--------------|----------------|
| POST | `/api/slots` | **Admin/Owner** | Admin: any gym<br>Owner: only their own gyms |
| GET | `/api/slots` | **Authenticated** | Users can view available slots |
| PUT | `/api/slots/:id` | **Admin/Owner** | Admin: any slot<br>Owner: only their gym slots |
| DELETE | `/api/slots/:id` | **Admin/Owner** | Admin: any slot<br>Owner: only their gym slots |
| POST | `/api/slots/book` | **Authenticated** | Users can book slots |
| PUT | `/api/slots/bookings/:id/cancel` | **Authenticated** | Users can cancel their own bookings |
| PUT | `/api/slots/bookings/:id/checkin` | **Authenticated** | Users can check-in to their bookings |
| PUT | `/api/slots/bookings/:id/checkout` | **Authenticated** | Users can check-out from their bookings |
| GET | `/api/slots/bookings` | **Authenticated** | Users can view their own bookings |
| GET | `/api/slots/availability` | **Authenticated** | Users can check slot availability |

---

## 🏃‍♀️ Amenities Management Endpoints
| Method | Endpoint | Access Level | Ownership Rule |
|--------|----------|--------------|----------------|
| POST | `/api/amenities` | **Admin/Owner** | Admin: any gym<br>Owner: only their own gyms |
| GET | `/api/amenities` | **Public** | Anyone can view amenities |
| GET | `/api/amenities/gym/:gymId` | **Public** | Anyone can view amenities by gym |
| GET | `/api/amenities/:id` | **Public** | Anyone can view amenity details |
| PUT | `/api/amenities/:id` | **Admin/Owner** | Admin: any amenity<br>Owner: only their gym amenities |
| DELETE | `/api/amenities/:id` | **Admin/Owner** | Admin: any amenity<br>Owner: only their gym amenities |

---

## 📸 Gym Images Management Endpoints
| Method | Endpoint | Access Level | Ownership Rule |
|--------|----------|--------------|----------------|
| POST | `/api/gym-images/gym/:gymId/upload` | **Admin/Owner** | Admin: any gym<br>Owner: only their own gyms |
| GET | `/api/gym-images` | **Public** | Anyone can view gym images |
| GET | `/api/gym-images/gym/:gymId` | **Public** | Anyone can view images by gym |
| GET | `/api/gym-images/:id` | **Public** | Anyone can view image details |
| PUT | `/api/gym-images/:id` | **Admin/Owner** | Admin: any image<br>Owner: only their gym images |
| DELETE | `/api/gym-images/:id` | **Admin/Owner** | Admin: any image<br>Owner: only their gym images |
| DELETE | `/api/gym-images/:id/permanent` | **Admin Only** | Admin can permanently delete any image |

---

## 💳 Subscriptions Management Endpoints
| Method | Endpoint | Access Level | Ownership Rule |
|--------|----------|--------------|----------------|
| POST | `/api/subscriptions` | **Admin/Owner** | Admin: any gym<br>Owner: only their own gyms |
| GET | `/api/subscriptions` | **Public** | Anyone can view subscriptions |
| GET | `/api/subscriptions/gym/:gymId` | **Public** | Anyone can view subscriptions by gym |
| GET | `/api/subscriptions/:id` | **Public** | Anyone can view subscription details |
| PUT | `/api/subscriptions/:id` | **Admin/Owner** | Admin: any subscription<br>Owner: only their gym subscriptions |
| DELETE | `/api/subscriptions/:id` | **Admin/Owner** | Admin: any subscription<br>Owner: only their gym subscriptions |

---

## ✨ Subscription Features Management Endpoints
| Method | Endpoint | Access Level | Ownership Rule |
|--------|----------|--------------|----------------|
| POST | `/api/subscription-features` | **Admin/Owner** | Admin: any subscription<br>Owner: only their gym subscriptions |
| GET | `/api/subscription-features` | **Public** | Anyone can view subscription features |
| GET | `/api/subscription-features/subscription/:id` | **Public** | Anyone can view features by subscription |
| GET | `/api/subscription-features/:id` | **Public** | Anyone can view feature details |
| PUT | `/api/subscription-features/:id` | **Admin/Owner** | Admin: any feature<br>Owner: only their gym subscription features |
| DELETE | `/api/subscription-features/:id` | **Admin/Owner** | Admin: any feature<br>Owner: only their gym subscription features |

---

## 📤 Upload Endpoints
| Method | Endpoint | Access Level | Ownership Rule |
|--------|----------|--------------|----------------|
| POST | `/api/upload/gym-image` | **Authenticated** | General image upload (gym_id = -1) |

---

## 🔒 Security Features

### Ownership Validation
- **Gym Ownership**: Owners can only access/modify gyms where `gym.ownerId === user.id`
- **Related Entity Ownership**: Owners can only manage amenities, images, subscriptions, and features that belong to their gyms
- **Admin Override**: Admins bypass all ownership checks and can manage any resource

### Authentication Flow
1. **JWT Token**: Required in Authorization header as `Bearer <token>`
2. **Role Check**: User type verified against required permissions
3. **Ownership Check**: For owners, verify they own the related gym
4. **Resource Access**: Grant or deny access based on above checks

### Error Responses
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Insufficient permissions or ownership violation
- `404 Not Found`: Resource doesn't exist or user doesn't have access

---

## 📋 Implementation Notes

### Middleware Chain Order
```javascript
// Typical middleware chain for owner-restricted endpoints
router.put('/:id', 
  authenticate,                    // Verify JWT token
  authorize('3', '2'),   // Check user role
  checkOwnership,                  // Verify ownership (owners only)
  controllerFunction               // Execute business logic
);
```

### User Type Mapping
- Regular users (`type='1'`): Can only access booking and profile features
- Owners (`type='2'`): Can manage their own gyms and related resources
- Admins (`type='3'`): Full access to all resources

This comprehensive permission system ensures that:
- **Security**: Proper access control at every level
- **Data Isolation**: Owners can only see their own data
- **Administrative Control**: Admins have full system access
- **User Experience**: Regular users have appropriate booking capabilities

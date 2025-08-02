# GYM PWA Backend API

A RESTful API built with Node.js, Express, MySQL, and JWT authentication for a Gym Progressive Web Application.

## 🏗️ Architecture

This project follows a loosely coupled, modular architecture:

```
├── db/                 # Database connection and schema
├── middleware/         # Express middleware (auth, error handling)
├── models/            # Data models (User, RefreshToken)
├── routes/            # API route handlers
├── utils/             # Utility functions (JWT, validation, response)
├── server.js          # Main application entry point
└── package.json       # Dependencies and scripts
```

## 🚀 Features

- **JWT Authentication** with access and refresh tokens
- **User Management** with role-based access control
- **Input Validation** using Joi
- **Error Handling** with standardized responses
- **Rate Limiting** for API protection
- **Security** with Helmet and CORS
- **Database** ORM with Sequelize and MySQL
- **Password Hashing** using bcrypt with model hooks
- **Data Validation** at model level with Sequelize validators

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GYM_PWA_BE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=gym_pwa_db
   
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_SECRET=your_refresh_token_secret
   JWT_REFRESH_EXPIRES_IN=30d
   
   BCRYPT_SALT_ROUNDS=12
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Setup MySQL Database**
   ```bash
   # Create the database
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS gym_pwa_db;"
   
   # Or if you prefer, run the schema file
   mysql -u root -p < db/schema.sql
   ```
   
   **Note:** When you start the server in development mode, Sequelize will automatically sync the models with the database and create/update tables as needed.

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access API Documentation**
   Once the server is running, you can access:
   - **Swagger UI**: http://localhost:3000/api-docs
   - **Health Check**: http://localhost:3000/health
   - **Welcome Page**: http://localhost:3000

## 📚 API Documentation

### Interactive Documentation
This API includes **Swagger UI** for interactive testing and documentation. Once your server is running, visit:

**Swagger UI**: http://localhost:3000/api-docs

### Base URL
```
http://localhost:3000/api
```

### Testing the API
You can test all endpoints directly from the Swagger UI interface:
1. Navigate to http://localhost:3000/api-docs
2. Expand any endpoint section
3. Click "Try it out"
4. Fill in the required parameters
5. Click "Execute" to make the request

**For authenticated endpoints:**
1. First, register a user or login via `/api/auth/register` or `/api/auth/login`
2. Copy the `accessToken` from the response
3. Click the "Authorize" button at the top of the Swagger UI
4. Enter `Bearer YOUR_ACCESS_TOKEN` in the value field
5. Click "Authorize" and then "Close"
6. Now you can test protected endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6..."
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

#### Logout
```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

### User Management Endpoints

#### Get Current User Profile
```http
GET /api/users/profile
Authorization: Bearer <access_token>
```

#### Update Current User Profile
```http
PUT /api/users/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

#### Change Password
```http
PUT /api/users/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

#### Get All Users (Admin Only)
```http
GET /api/users?page=1&limit=10
Authorization: Bearer <admin_access_token>
```

#### Get User by ID (Admin Only)
```http
GET /api/users/:id
Authorization: Bearer <admin_access_token>
```

#### Update User by ID (Admin Only)
```http
PUT /api/users/:id
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "role": "admin",
  "isActive": false
}
```

#### Delete User by ID (Admin Only)
```http
DELETE /api/users/:id
Authorization: Bearer <admin_access_token>
```

### Health Check
```http
GET /health
```

## 🛡️ Security Features

- **JWT Tokens**: Secure authentication with access and refresh tokens
- **Password Hashing**: Bcrypt with configurable salt rounds
- **Rate Limiting**: Prevents abuse with configurable limits
- **CORS**: Cross-origin resource sharing protection
- **Helmet**: Security headers for Express
- **Input Validation**: Joi schemas for request validation
- **SQL Injection Protection**: Parameterized queries

## 🗄️ Database Schema & ORM

### Sequelize ORM
This API uses **Sequelize ORM** for database operations, providing:
- **Model-based approach** with validation and hooks
- **Automatic password hashing** before saving to database
- **Query protection** against SQL injection
- **Relationship management** between models
- **Migration support** for database schema changes
- **Automatic table synchronization** in development mode

### Users Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🔧 Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

### Code Structure

The project follows these principles:
- **Separation of Concerns**: Each module has a single responsibility
- **Loose Coupling**: Modules are independent and interchangeable
- **DRY**: Don't repeat yourself - reusable utilities and middleware
- **Error Handling**: Centralized error handling with consistent responses
- **Security First**: Built-in security measures and best practices

## 📝 Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Specific error details"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

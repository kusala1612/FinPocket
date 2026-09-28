# 💰 FinPocket — Smart Personal Expense Management & Tracking System

> **VIT Capstone Project**  
> A production-grade, full-stack personal finance and expense management web application built with **Java Spring Boot**, **MongoDB**, **Spring Security (JWT)**, and modern **Vanilla JavaScript**.

---

## 📑 Table of Contents
- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Setup & Installation](#-setup--installation)
- [Authentication & Security](#-authentication--security)
- [Role-Based Access Control](#-role-based-access-control)
- [REST API Endpoints](#-rest-api-endpoints)
- [Testing with Postman](#-testing-with-postman)
- [Future Roadmap](#-future-roadmap)
- [Known Limitations](#-known-limitations)
- [License](#-license)

---

## 🌟 Project Overview

**FinPocket** is designed to empower individuals to take full control of their financial life. It provides intuitive tools to track daily expenses, log income streams, monitor budgets in real-time, set saving goals, and visualize spending habits with actionable insights.

---

## 🚀 Key Features

- 🔐 **Secure Authentication**: Registration and login with JWT (JSON Web Tokens) & BCrypt password hashing.
- 🛡️ **Role-Based Access Control**: Strict backend-enforced separation between `USER` and `ADMIN` roles.
- 📊 **Dynamic User Dashboard**: Real-time summary cards for Balance, Income, Expenses, and Budget tracking.
- 👥 **Administrator Dashboard**: System telemetry, live user registration counts, and recent user listings.
- 👤 **Profile Management**: View and edit user details with immutable email & role fields for security.
- 📱 **Modern Responsive UI**: Custom glassmorphism dark-theme styling optimized for mobile, tablet, and desktop.
- ⚡ **Zero External Framework Dependencies**: Pure Vanilla ES6+ frontend interacting via REST APIs.

---

## 🛠️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│              Frontend (HTML5 / CSS3 / ES6+)             │
│    Landing · Login · Register · Dashboard · Admin · Profile│
└────────────────────────────┬────────────────────────────┘
                             │ REST APIs (JSON + JWT)
┌────────────────────────────▼────────────────────────────┐
│               Spring Boot 3.2 Backend                   │
│  Controllers ──► Services ──► Repositories ──► Security │
└────────────────────────────┬────────────────────────────┘
                             │ MongoDB Wire Protocol
┌────────────────────────────▼────────────────────────────┐
│                  MongoDB Database                       │
│      Collections: users, transactions, budgets          │
└─────────────────────────────────────────────────────────┘
```

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JS (ES6+) | User interface & API integration |
| **Backend** | Java 17+, Spring Boot 3.2 | Core REST API & Business Logic |
| **Security** | Spring Security 6, JJWT 0.12, BCrypt | Token issuance, hashing & authorization |
| **Database** | Spring Data MongoDB (Atlas / In-Memory) | Document persistence & indexing |
| **Build Tool** | Apache Maven 3.8+ | Dependency management & compilation |

---

## 📁 Project Structure

```text
project/
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/finpocket/
│       ├── FinPocketApplication.java      # Application entry & admin seeder
│       ├── config/                        # Security, CORS & MongoDB configurations
│       │   ├── SecurityConfig.java
│       │   ├── MongoConfig.java
│       │   └── EmbeddedMongoConfig.java
│       ├── controller/                    # REST Controllers
│       │   ├── AuthController.java
│       │   ├── UserController.java
│       │   └── AdminController.java
│       ├── dto/                           # Data Transfer Objects
│       │   ├── RegisterRequest.java
│       │   ├── LoginRequest.java
│       │   ├── AuthResponse.java
│       │   ├── UserDto.java
│       │   ├── DashboardResponse.java
│       │   ├── AdminDashboardResponse.java
│       │   ├── ProfileUpdateRequest.java
│       │   └── ApiResponse.java
│       ├── entity/                        # MongoDB Document Entities
│       │   ├── User.java
│       │   └── Role.java
│       ├── repository/                    # Spring Data Repositories
│       │   └── UserRepository.java
│       ├── security/                      # Security Filter & JWT Utilities
│       │   ├── JwtService.java
│       │   ├── JwtAuthenticationFilter.java
│       │   └── CustomUserDetailsService.java
│       ├── service/                       # Business Logic Layer
│       │   ├── AuthService.java
│       │   ├── UserService.java
│       │   └── AdminService.java
│       └── exception/                     # Centralized Error Handling
│           └── GlobalExceptionHandler.java
├── frontend/
│   ├── index.html                         # Landing Page
│   ├── login.html                         # Login Page
│   ├── register.html                      # Registration Page
│   ├── user-dashboard.html                # User Dashboard
│   ├── admin-dashboard.html               # Admin Dashboard
│   ├── profile.html                       # User Profile Page
│   ├── css/
│   │   ├── style.css                      # Global Design System
│   │   ├── auth.css                       # Auth Pages Styling
│   │   └── dashboard.css                  # Dashboard & Admin Styling
│   └── js/
│       ├── api.js                         # Reusable API Client with JWT
│       ├── auth.js                        # Auth State & Route Guards
│       ├── login.js                       # Login Controller
│       ├── register.js                    # Register Controller
│       ├── dashboard.js                   # Dashboard Controller
│       ├── admin-dashboard.js             # Admin Dashboard Controller
│       └── profile.js                     # Profile Controller
├── database/
│   └── init-mongo.js                      # MongoDB Indexing & Init Script
├── .env.example
├── .gitignore
└── README.md
```

---

## 📋 Prerequisites

Ensure you have the following installed locally:
- **Java Development Kit (JDK) 17 or higher**
- **Apache Maven 3.8+**
- **Python 3.x** or **VS Code Live Server** (to serve frontend)
- **MongoDB Atlas account** (optional - embedded MongoDB runs automatically for standalone mode)

---

## ⚙️ Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Haripriya175/capstone-demo-.git
cd capstone-demo-
```

### 2. Configure Environment (Optional)
Copy `.env.example` and set your credentials:
```bash
cp .env.example .env
```

### 3. Build & Run the Backend
```bash
cd backend
mvn clean compile
mvn spring-boot:run
```
*Backend server will start at: `http://localhost:8080`*

### 4. Run the Frontend
In a new terminal:
```bash
# Option A: Using Python
python -m http.server 5500 --directory frontend

# Option B: Using VS Code Live Server
# Right-click frontend/index.html -> "Open with Live Server" (Port 5500)
```
*Open your browser and navigate to: `http://localhost:5500/index.html`*

---

## 🔑 Default Credentials

On initial startup, the backend automatically seeds a default administrator account:

| Role | Email | Password | Dashboard URL |
|---|---|---|---|

| **Regular User** | *Register via UI* | *Chosen during signup* | `http://localhost:5500/user-dashboard.html` |

---

## 🔐 Authentication & Security

1. **Password Hashing**: Passwords are encrypted using BCrypt before storing.
2. **JWT Authorization**: Upon login, a signed JWT token is issued containing username and role claims.
3. **Protected Filter Chain**: `JwtAuthenticationFilter` intercepts requests, extracts the Bearer token, validates expiry and signature, and populates `SecurityContextHolder`.
4. **Role Enforcement**: Backend endpoints strictly check roles via Spring Security (`@PreAuthorize` / `hasRole`).
5. **CORS Security**: Cross-Origin requests are explicitly limited to trusted development origins.

---

## 📡 REST API Endpoints

### 🔓 Public Endpoints
| HTTP Method | Endpoint | Description | Payload |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | `fullName`, `email`, `password`, `confirmPassword`, `phone` |
| `POST` | `/api/auth/login` | Login and receive JWT token | `email`, `password` |

### 🔒 User Endpoints (Requires `ROLE_USER` or `ROLE_ADMIN`)
| HTTP Method | Endpoint | Description | Headers |
|---|---|---|---|
| `GET` | `/api/user/me` | Fetch authenticated user profile | `Authorization: Bearer <token>` |
| `GET` | `/api/user/dashboard` | Fetch user financial summary metrics | `Authorization: Bearer <token>` |
| `PUT` | `/api/user/profile` | Update profile information | `Authorization: Bearer <token>` |

### 🛡️ Admin Endpoints (Requires `ROLE_ADMIN`)
| HTTP Method | Endpoint | Description | Headers |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | Fetch system metrics and stats | `Authorization: Bearer <token>` |
| `GET` | `/api/admin/users` | List all registered users | `Authorization: Bearer <token>` |

---

## 🧪 Testing with Postman

### 1. Register a User
- **Method**: `POST`
- **URL**: `http://localhost:8080/api/auth/register`
- **Body** (JSON):
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password@123",
  "confirmPassword": "Password@123",
  "phone": "9876543210"
}
```

### 2. Login
- **Method**: `POST`
- **URL**: `http://localhost:8080/api/auth/login`
- **Body** (JSON):
```json
{
  "email": "jane@example.com",
  "password": "Password@123"
}
```
*Copy the `token` from the response.*

### 3. Access Protected Route
- **Method**: `GET`
- **URL**: `http://localhost:8080/api/user/me`
- **Headers**:
  - `Authorization`: `Bearer <paste_jwt_token_here>`

---

## 🔮 Future Roadmap

- 💳 Income & Expense Transaction Logging
- 📂 Custom Transaction Categories & Tags
- 🎯 Monthly Budget Limits & Overspending Alerts
- 🏆 Saving Goal Tracking & Milestones
- 📈 Visual Spending Charts & Trend Analytics
- 💡 Personalized Financial Recommendations
- 🔔 Notification Center & Email Alerts
- 📄 Exportable PDF & Excel Financial Reports

---

## 📝 Known Limitations

- Tokens are stored in browser `localStorage` (recommended to use `httpOnly` secure cookies in production).
- Password recovery via email reset is planned for the next development milestone.
- Financial dashboard values display zero baseline data until the Transaction module is activated.

---

## 📄 License

This project is developed as an academic **Capstone Project** at **VIT (Vellore Institute of Technology)**.  
Licensed for educational and non-commercial evaluation.
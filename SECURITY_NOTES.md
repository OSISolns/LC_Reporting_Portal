# LC Lumina Portal — Security Architecture & Safeguards

This document outlines the current security posture, authentication workflows, and upcoming security roadmap items for the Legacy Clinics Lumina Portal.

---

## 🛡️ Current Security Controls

### 1. Password Hashing & Cryptography
- **Algorithm**: `bcryptjs` with salt factor **12** (upgraded from 10 to align with current OWASP standards).
- **Applied In**: `User.create()`, `User.resetPassword()`, and `authController.changePassword()`.
- **Field-Level Data Encryption**: Sensitive PII/PHI fields across 35+ DB tables are encrypted using **AES-256-GCM** via `backend/src/utils/crypto.js` with key derivation from `DB_ENCRYPTION_KEY`.

### 2. Authentication & Session Management
- **JWT (JSON Web Tokens)**: Signed using `JWT_SECRET` with configurable expiration (default `8h`).
- **Token Handling**: Standard Authorization Bearer header checked per API request via `authMiddleware`.
- **Automatic Inactivity Timeout**: Frontend tracks user inactivity (`useInactivityTimer.js`) and displays a countdown modal before force-logging out inactive sessions.
- **Account Lockout Protection**: 5 consecutive failed login attempts lock the user account for 5 minutes (`User.lockout`). Automated admin security alert notifications are dispatched at attempt thresholds.

### 3. Dev Login (`/api/auth/dev-login`) Safeguards
- The dev login bypass endpoint is **environmentally disabled** in production environments:
  ```js
  const allowDevLogin = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_LOGIN !== 'false';
  ```
- If invoked when disabled, the server returns HTTP 403 Forbidden.

### 4. RBAC & Granular Permission Engine
- **Route Level**: `App.jsx` enforces `allowedRoles` arrays on all protected routes.
- **Module Level**: `AuthContext.jsx` (`hasPermission`) and backend permission guards check user-specific & role-specific granular capabilities (view, edit, review, approve, delete).

---

## 🔮 Security Roadmap & Recommended Next Steps

1. **HTTP-Only Cookies for JWT**: Migrate JWT storage from browser `localStorage` to `httpOnly`, `sameSite=strict` cookies to eliminate XSS token theft risks.
2. **Multi-Factor Authentication (MFA)**: Integrate TOTP (Google Authenticator/Authy) for high-privilege roles (`admin`, `medical_director`, `principal_cashier`).
3. **Strict Content Security Policy (CSP)**: Configure Helmet CSP headers for static asset loading security.

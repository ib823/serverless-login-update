🔐 Passkeys IdP – Production Blueprint v3.0 (Next.js 15 / WebAuthn / OAuth 2.1 + PKCE + OIDC)
Executive Summary
This is a production-grade blueprint for building a secure Passkeys Identity Provider using Next.js 15 (App Router), WebAuthn, and OAuth 2.1 + PKCE with OpenID Connect discovery. It focuses on best practices for authentication, token management, and deployment. This version improves reliability, adds features like token rotation and discovery endpoints, and ensures a clean setup.

Note: This blueprint prioritizes security and simplicity. Always review and test in your environment. Consult security experts for production use.

Core Principles

Security First: Emphasize least privilege, input validation, and secure defaults.
Clean Architecture: Organized folders for authentication, database, security, configuration, and types.
Type Safety: Use TypeScript in strict mode for reliable code.
Error Resilience: Handle errors gracefully with user-friendly messages.
Developer Experience: Easy setup with minimal commands.
Observability: Include basic health checks and metrics.

Prerequisites

Node.js 20 LTS (or compatible versions).
Git for version control.
Redis (e.g., Upstash free tier) for storage, or use in-memory for development.
Deployment Platform: Vercel recommended; Docker for standalone.

Project Structure
textpasskeys-idp/
├── app/                                 # Next.js App Router pages and APIs
│   ├── layout.tsx                       # Main layout
│   ├── page.tsx                         # Home page
│   ├── globals.css                      # Global styles
│   ├── auth/
│   │   └── page.tsx                     # Authentication UI
│   ├── account/
│   │   └── page.tsx                     # Account management UI
│   └── api/
│       ├── webauthn/
│       │   ├── begin/route.ts           # Unified WebAuthn options
│       │   ├── register/
│       │   │   ├── options/route.ts     # Registration options (optional)
│       │   │   └── verify/route.ts      # Registration verification
│       │   ├── auth/
│       │   │   ├── options/route.ts     # Authentication options (optional)
│       │   │   └── verify/route.ts      # Authentication verification
│       │   └── check-user/route.ts      # User check endpoint
│       ├── oauth/
│       │   ├── authorize/route.ts       # OAuth authorization
│       │   ├── token/route.ts           # OAuth token issuance
│       │   ├── refresh/route.ts         # Token refresh
│       │   └── revoke/route.ts          # Token revocation
│       ├── oidc/
│       │   ├── userinfo/route.ts        # OIDC user info
│       │   └── well-known/
│       │       └── openid-configuration/route.ts  # OIDC discovery
│       ├── jwks/route.ts                # JWKS endpoint
│       ├── credentials/
│       │   ├── route.ts                 # List credentials
│       │   └── [id]/route.ts            # Manage specific credential
│       ├── session/route.ts             # Session management
│       ├── logout/route.ts              # Logout endpoint
│       ├── health/route.ts              # Health check
│       └── metrics/route.ts             # Metrics endpoint
├── lib/
│   ├── config/
│   │   ├── security.ts                  # Security configurations
│   │   └── constants.ts                 # Constants
│   ├── auth/
│   │   ├── webauthn.ts                  # WebAuthn utilities
│   │   ├── jwt.ts                       # JWT handling
│   │   └── session.ts                   # Session utilities
│   ├── db/
│   │   ├── redis.ts                     # Redis connection
│   │   ├── models.ts                    # Data models
│   │   └── operations.ts                # Database operations
│   ├── security/
│   │   ├── rate-limit.ts                # Rate limiting
│   │   ├── audit.ts                     # Auditing
│   │   ├── crypto.ts                    # Crypto utilities
│   │   ├── validation.ts                # Input validation
│   │   └── index.ts                     # Exports
│   └── types/
│       └── index.ts                     # Type definitions
├── middleware.ts                        # Request middleware
├── next.config.js                       # Next.js config
├── tailwind.config.js                   # Tailwind config
├── tsconfig.json                        # TypeScript config
├── package.json                         # Dependencies
├── .env.local.example                   # Environment example
├── .gitignore                           # Git ignore
└── README.md                            # This file

Note: API routes requiring Node-specific features use runtime = 'nodejs'.

Dependencies

@simplewebauthn/browser and @simplewebauthn/server for WebAuthn.
jose for JWT and token management.
@upstash/redis and @upstash/ratelimit for storage and limiting.
cookie and uuid for sessions and IDs.
Dev dependencies: @types/cookie, @types/uuid.

Use package lockfiles for consistent versions.
Environment Configuration
Copy .env.local.example to .env.local and fill in values. Example structure (generate your own secure values):
env# Redis
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# WebAuthn
RP_ID=localhost
RP_NAME="Passkeys IdP"
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Issuer
ISSUER=http://localhost:3000

# JWKS (generate securely)
ACTIVE_KID=your_kid
JWK_PRIVATE_CURRENT=your_private_jwk_json
JWK_PUBLIC_CURRENT=your_public_jwk_json
JWK_PUBLIC_PREVIOUS=your_previous_public_jwks_array

# OAuth Client
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_secret
OAUTH_REDIRECT_URIS=http://localhost:3001/callback

# Token TTLs (seconds, customize as needed)
ACCESS_TOKEN_TTL_SEC=3600
REFRESH_TOKEN_TTL_SEC=1209600
ID_TOKEN_TTL_SEC=3600

# Security
METRICS_BEARER=your_metrics_token
ENCRYPTION_KEY=your_32_byte_key
SESSION_SECRET=your_32_byte_secret
CSRF_SECRET=your_32_byte_csrf
ALLOWED_ORIGINS=http://localhost:3000

# Flags
ENFORCE_USER_VERIFICATION=true
REQUIRE_ATTESTATION=false
ENABLE_AUDIT_LOGGING=true
Generate keys using secure tools like jose. Never commit secrets to version control.
Security Configuration Example
In lib/config/security.ts:
Define configurations for WebAuthn, sessions, etc., with secure defaults.
Types Example
In lib/types/index.ts:
Define interfaces for users, sessions, tokens, etc.
Database Operations Example
In lib/db/operations.ts:
Functions for creating, getting, and updating users, challenges, sessions, and tokens using Redis.
WebAuthn Utilities Example
In lib/auth/webauthn.ts:
Functions for generating and verifying WebAuthn options.
Unified WebAuthn Endpoint Example
In app/api/webauthn/begin/route.ts:
Handles options for registration or authentication.
Registration Verify Example
In app/api/webauthn/register/verify/route.ts:
Verifies and stores credentials.
OAuth and OIDC
Endpoints for authorization, tokens, refresh, revocation, user info, JWKS, and OIDC discovery.
Use jose for token operations.
Middleware Example
In middleware.ts:
Sets security headers and handles CORS.
Frontend UI
A simple UI with an email field; the server handles the flow.
Deployment
Vercel
Add environment variables and deploy.
Docker
Set output: 'standalone' in next.config.js.
Example Dockerfile for building and running.
Testing

Local: Test registration, authentication, and sessions.
Browsers: Chrome, Safari, Firefox.
Validate basics like headers.

Observability

/api/health: Basic status.
/api/metrics: Protected metrics.

Future Enhancements

Recovery options.
Additional auth factors.
Integration support.

Appendix A – JWT Utilities Example
In lib/auth/jwt.ts:
Functions for signing and verifying tokens.
Appendix B – Quickstart
Install dependencies and run npm run dev.
Appendix C – Notes
Focus on data minimization and secure practices.

End of v3.0 Blueprint
📊 Free-Tier Budget Dashboard
Optional monitoring for usage.
Add env vars for quotas.
Implement tracking, a summary API, and a dashboard page.
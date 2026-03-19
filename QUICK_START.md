# AI Storiz - Quick Start Guide

## 🎯 Quick Access Credentials

### Admin Panel Access
- **URL**: http://localhost:5000
- **Password**: `@?YesBotEnterx1Box?`

### Test User Accounts

| Email | Password | Credits | Purpose |
|-------|----------|---------|---------|
| admin@example.com | admin123 | 10,000 | Full access with subscription |
| test@example.com | test123 | 500 | Testing with credits |
| free@example.com | free123 | 0 | Testing free user flow |
| newuser@example.com | password123 | 50 | Recently created user |

---

## 🚀 Common Commands

### Database Operations
```bash
# Seed the database
npx tsx scripts/seed.ts

# Push schema changes to database
npm run db:push
```

### Server Operations
```bash
# Start development server
npm run server:dev

# Start Expo client (mobile app)
npm run expo:dev

# Build server for production
npm run server:build

# Run production server
npm run server:prod
```

### Code Quality
```bash
# Check types
npm run check:types

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Check formatting
npm run check:format

# Format code
npm run format
```

---

## 🔐 API Quick Reference

### Admin API Examples

```bash
# Login as admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"@?YesBotEnterx1Box?"}' | jq -r '.token')

# Get all users
curl -s http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Get system stats
curl -s http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Get art styles
curl -s http://localhost:5000/api/admin/art-styles \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Get credit settings
curl -s http://localhost:5000/api/admin/credit-settings \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### User API Examples

```bash
# Register new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' | jq .

# Login as user
USER_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' | jq -r '.token')

# Get user profile
curl -s http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $USER_TOKEN" | jq .

# Get user characters
curl -s http://localhost:5000/api/characters \
  -H "Authorization: Bearer $USER_TOKEN" | jq .

# Get credit settings
curl -s http://localhost:5000/api/credits/settings | jq .

# Calculate comic cost
curl -s "http://localhost:5000/api/credits/calculate?pagesCount=6" | jq .

# Get user's comics
curl -s http://localhost:5000/api/comics \
  -H "Authorization: Bearer $USER_TOKEN" | jq .
```

---

## 📊 Key Endpoints by Category

### 🔑 Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify` - Verify email
- `POST /api/auth/resend-verification` - Resend verification
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### 💰 Credits
- `GET /api/credits/settings` - Get pricing
- `GET /api/credits/calculate` - Calculate cost
- `GET /api/credits/transactions` - Transaction history
- `POST /api/credits/watch-ad` - Earn credits

### 👥 Characters
- `GET /api/characters` - List characters
- `POST /api/characters` - Create character
- `PUT /api/characters/:id` - Update character
- `DELETE /api/characters/:id` - Delete character

### 📚 Comics
- `GET /api/comics` - List comics
- `GET /api/comics/:id` - Get comic
- `POST /api/comics` - Save comic
- `PUT /api/comics/:id` - Update comic
- `DELETE /api/comics/:id` - Delete comic
- `POST /api/generate-comic` - Generate new comic

### 🎨 Art Styles
- `GET /api/styles` - List all styles
- `GET /api/styles/unlocked` - Get unlocked styles
- `POST /api/styles/unlock` - Unlock style
- `POST /api/styles/unlock-all` - Unlock all styles

### 🎁 Referrals
- `POST /api/referrals/apply` - Apply code
- `GET /api/referrals/stats` - View stats
- `GET /api/referrals/active-bounty` - Active promotion

### 🔔 Notifications
- `POST /api/notifications/register` - Register push token
- `GET /api/notifications/preferences` - Get preferences
- `PUT /api/notifications/preferences` - Update preferences

### 👑 Admin - Users
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/:userId/update` - Update user
- `GET /api/admin/stats` - Get statistics

### 👑 Admin - Settings
- `GET/POST /api/admin/credit-settings` - Credit config
- `GET/POST /api/admin/rate-limits` - Rate limits
- `GET/POST /api/admin/oauth-settings` - OAuth config
- `GET/POST /api/admin/referral-settings` - Referral config
- `GET/POST /api/admin/ad-settings` - Ad config
- `GET/POST /api/admin/notification-settings` - Notification config

### 👑 Admin - Art Styles
- `GET /api/admin/art-styles` - List styles
- `POST /api/admin/art-styles` - Create style
- `PUT /api/admin/art-styles/:id` - Update style
- `DELETE /api/admin/art-styles/:id` - Delete style

### 👑 Admin - Referrals
- `GET /api/admin/referral-bounties` - List bounties
- `POST /api/admin/referral-bounties` - Create bounty
- `PUT /api/admin/referral-bounties/:id` - Update bounty
- `DELETE /api/admin/referral-bounties/:id` - Delete bounty
- `GET /api/admin/referral-history` - Referral history
- `GET /api/admin/referral-stats` - Referral stats

### 👑 Admin - Ads
- `GET /api/admin/ads` - List ads
- `POST /api/admin/ads` - Create ad
- `PUT /api/admin/ads/:id` - Update ad
- `DELETE /api/admin/ads/:id` - Delete ad

### 👑 Admin - Monitoring
- `GET /api/admin/audit-logs` - Audit logs
- `GET /api/admin/audit-stats` - Audit statistics
- `GET /api/admin/notification-history` - Notification history
- `POST /api/admin/notifications/broadcast` - Send broadcast

---

## 💡 Testing Workflows

### Test User Registration & Login Flow
```bash
# 1. Register new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"password123"}'

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"password123"}' | jq -r '.token')

# 3. Get profile
curl -s http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Test Admin Management
```bash
# 1. Login as admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"@?YesBotEnterx1Box?"}' | jq -r '.token')

# 2. View all users
curl -s http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.users[] | {email, credits, subscriptionStatus}'

# 3. Get system statistics
curl -s http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### Test Credit System
```bash
# Login as test user
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' | jq -r '.token')

# Check current credits
curl -s http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq '{email, credits, subscriptionStatus}'

# Calculate comic cost
curl -s "http://localhost:5000/api/credits/calculate?pagesCount=6" | jq .

# View credit settings
curl -s http://localhost:5000/api/credits/settings | jq .
```

---

## 🎨 Art Styles Available

### Free Styles
- Comic
- Manga
- Manhwa
- Comic Book
- Sketch

### Premium Styles (Unlock Required)
- Graphic (100 credits)
- Kawaii (100 credits)
- Noir (100 credits)
- Anime (100 credits)
- Afro (100 credits)
- Watercolor (100 credits)
- Oil Painting (100 credits)
- Pixel Art (100 credits)
- 3D Render (150 credits)
- Cyberpunk (150 credits)
- Fantasy (100 credits)

**Unlock all styles**: 500 credits

---

## 📱 Mobile App Development

### Start Expo Server
```bash
npm run expo:dev
```

### Access Mobile App
- **Web**: http://localhost:8081
- **iOS**: Scan QR code with Camera app
- **Android**: Scan QR code with Expo Go app

---

## 🔧 Environment Variables

Required in `.env` file:
```
DATABASE_URL=postgresql://...
SESSION_SECRET=...
AI_INTEGRATIONS_OPENAI_BASE_URL=...
AI_INTEGRATIONS_OPENAI_API_KEY=...
RESEND_API_KEY=...
ADMIN_PASSWORD=...
```

---

## 📝 Project Structure

```
ai-storiz-source/
├── client/              # React Native mobile app
├── server/              # Express backend
│   ├── routes.ts        # API endpoints
│   ├── db.ts           # Database connection
│   ├── storage.ts      # Data access layer
│   └── email.ts        # Email service
├── shared/              # Shared code
│   └── schema.ts       # Database schema
├── scripts/             # Utility scripts
│   └── seed.ts         # Database seeding
└── .env                # Environment variables
```

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test database connection
npx tsx scripts/seed.ts
```

### Server Not Starting
```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill process on port 5000
kill -9 $(lsof -t -i:5000)

# Restart server
npm run server:dev
```

### Token Authentication Issues
```bash
# Verify token is valid
echo "YOUR_TOKEN" | base64 -d

# Re-login to get fresh token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## 📚 Additional Resources

- **Database Schema**: See `shared/schema.ts`
- **API Routes**: See `server/routes.ts`
- **Seed Script**: See `scripts/seed.ts`
- **Full Exploration**: See `EXPLORATION_SUMMARY.md`

---

*Last Updated: 2026-03-08*

# AI Storiz Application - Exploration Summary

## Database Seeding Completed ✅

The database has been successfully seeded with initial data including:

### Test Accounts Created

| Account Type | Email | Password | Credits | Subscription | Status |
|-------------|-------|----------|---------|--------------|--------|
| **Admin** | admin@example.com | admin123 | 10,000 | Yearly | Verified |
| **Test User** | test@example.com | test123 | 500 | None | Verified |
| **Free User** | free@example.com | free123 | 0 | None | Verified |
| **New User** | newuser@example.com | password123 | 50 | None | Unverified |
| **Existing** | fatim.nav@gmail.com | - | 0 | None | Verified |

### System Configuration Seeded

1. **Credit Settings**
   - Base cost: 50 credits
   - Cost per page: 15 credits
   - Ad credits reward: 25 credits
   - Max ads per day: 5
   - Weekly plan: 300 credits for $6.99
   - Yearly plan: 3,000 credits for $69.00
   - Top-up options: 100/$2.99, 500/$9.99, 1000/$19.99

2. **Rate Limit Settings**
   - Max generations per hour: 5
   - Max generations per day: 20
   - Enabled: Yes

3. **Referral Settings**
   - Inviter credits: 50
   - Invitee credits: 25
   - Enabled: Yes

4. **Art Styles** (16 styles total)
   - Free styles: Comic, Manga, Manhwa, Comic Book, Sketch
   - Premium styles: Graphic, Kawaii, Noir, Anime, Afro, Watercolor, Oil Painting, Pixel Art, 3D Render, Cyberpunk, Fantasy
   - Unlock all cost: 500 credits

5. **Notification Settings**
   - Enabled: Yes
   - Low credits threshold: 20

6. **Ad Settings**
   - Max impressions per hour: 3
   - Max impressions per day: 10
   - Enabled: Yes
   - Exempt subscribers: Yes

---

## Admin Panel Exploration

### Admin Login
- **URL**: `POST /api/admin/login`
- **Password**: `@?YesBotEnterx1Box?` (from .env)
- **Token**: Successfully generated

### Admin Endpoints Tested

1. **GET /api/admin/users** ✅
   - Retrieved all 5 users successfully
   - Shows user details including credits, subscription status, email verification

2. **GET /api/admin/stats** ✅
   - Total users: 4
   - Verified users: 4
   - Active subscriptions: 0
   - Total credits issued: 0
   - Total credits used: 50

3. **GET /api/admin/art-styles** ✅
   - Retrieved 16 art styles
   - Shows display order, premium status, unlock costs

4. **GET /api/admin/credit-settings** ✅
   - Retrieved all credit configuration successfully

### Additional Admin Endpoints Available

**User Management:**
- `POST /api/admin/users/:userId/update` - Update user details
- `GET /api/admin/users/:userId/unlocked-styles` - View unlocked styles
- `POST /api/admin/users/:userId/revoke-style` - Revoke style access
- `POST /api/admin/users/:userId/revoke-all-styles` - Revoke all styles

**Settings Management:**
- `GET/POST /api/admin/settings` - General settings
- `GET/POST /api/admin/credit-settings` - Credit configuration
- `GET/POST /api/admin/rate-limits` - Rate limit configuration
- `GET/POST /api/admin/oauth-settings` - OAuth configuration
- `GET/POST /api/admin/referral-settings` - Referral configuration
- `GET/POST /api/admin/ad-settings` - Advertisement settings
- `GET/POST /api/admin/notification-settings` - Notification settings
- `POST /api/admin/art-style-settings` - Art style settings

**Referral System:**
- `GET /api/admin/referral-bounties` - View referral promotions
- `POST /api/admin/referral-bounties` - Create bounty promotion
- `PUT /api/admin/referral-bounties/:id` - Update bounty
- `DELETE /api/admin/referral-bounties/:id` - Delete bounty
- `GET /api/admin/referral-history` - View referral history
- `GET /api/admin/referral-stats` - View referral statistics

**Advertisement Management:**
- `GET /api/admin/ads` - List all internal ads
- `POST /api/admin/ads` - Create new ad
- `PUT /api/admin/ads/:id` - Update ad
- `DELETE /api/admin/ads/:id` - Delete ad

**Audit & Analytics:**
- `GET /api/admin/audit-logs` - View generation audit logs
- `GET /api/admin/audit-stats` - View audit statistics

**Notifications:**
- `POST /api/admin/notifications/broadcast` - Send broadcast notification
- `GET /api/admin/notification-history` - View notification history

**Art Styles:**
- `GET /api/admin/art-styles` - List all styles
- `POST /api/admin/art-styles` - Create new style
- `PUT /api/admin/art-styles/:id` - Update style
- `DELETE /api/admin/art-styles/:id` - Delete style

---

## User Account Exploration

### User Registration & Authentication

1. **POST /api/auth/register** ✅
   - Successfully created new user: newuser@example.com
   - Received JWT token
   - User gets 50 welcome credits

2. **POST /api/auth/login** ✅
   - Successfully logged in as test@example.com
   - JWT token generated with 30-day expiry

3. **GET /api/auth/me** ✅
   - Retrieved authenticated user profile
   - Shows credits, subscription status, referral code

### User Endpoints Tested

1. **GET /api/auth/me** ✅
   ```json
   {
     "id": "6fcf8330-107e-41c0-9968-6eae31bc6c7c",
     "email": "test@example.com",
     "userId": "test-user-001",
     "emailVerified": true,
     "credits": 500,
     "subscriptionStatus": "none",
     "referralCode": "TEST2024"
   }
   ```

2. **GET /api/characters** ✅
   - Retrieved empty characters list (new account)

3. **GET /api/credits/settings** ✅
   - Retrieved credit pricing configuration

4. **GET /api/credits/calculate?pagesCount=6** ✅
   - Calculated cost: 50 credits (base) for 2-page minimum

### Additional User Endpoints Available

**Authentication:**
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/verify` - Verify email with code
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with code

**Credits:**
- `GET /api/credits/settings` - View credit pricing
- `GET /api/credits/calculate` - Calculate generation cost
- `POST /api/credits/deduct` - Deduct credits (internal)
- `GET /api/credits/transactions` - View credit history
- `POST /api/credits/watch-ad` - Earn credits by watching ad

**Characters:**
- `GET /api/characters` - List user's characters
- `POST /api/characters` - Create new character
- `PUT /api/characters/:id` - Update character
- `DELETE /api/characters/:id` - Delete character

**Comics:**
- `GET /api/comics` - List user's saved comics
- `GET /api/comics/:id` - Get specific comic
- `POST /api/comics` - Save a comic
- `PUT /api/comics/:id` - Update comic
- `DELETE /api/comics/:id` - Delete comic
- `GET /api/comics/:id/page/:pageNum/panel/:panelNum/image` - Get panel image

**Comic Generation:**
- `POST /api/generate-comic` - Generate new comic (polling)
- `POST /api/generate-comic-sse` - Generate comic (SSE streaming)

**Referrals:**
- `POST /api/referrals/apply` - Apply referral code
- `GET /api/referrals/stats` - View referral statistics
- `GET /api/referrals/active-bounty` - Get active bounty promotion

**Notifications:**
- `POST /api/notifications/register` - Register push token
- `PUT /api/notifications/preferences` - Update notification preferences
- `GET /api/notifications/preferences` - Get notification preferences

**Art Styles:**
- `GET /api/styles` - List all art styles
- `GET /api/styles/unlocked` - Get user's unlocked styles
- `POST /api/styles/unlock` - Unlock a style
- `POST /api/styles/unlock-all` - Unlock all styles

**Internal Ads:**
- `GET /api/ads/next` - Get next ad to display

---

## Application Architecture

### Tech Stack
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Authentication**: JWT with bcrypt password hashing
- **Frontend**: React Native (Expo)
- **AI Integration**: OpenAI API (custom endpoint)
- **Email**: Resend API
- **Notifications**: Expo Push Notifications

### Key Features

1. **Comic Generation System**
   - AI-powered story and image generation
   - Multiple art styles (free and premium)
   - Character management and reuse
   - Parallel panel generation for performance
   - SSE streaming for real-time updates

2. **Credit System**
   - Base cost + per-page pricing
   - Credit purchases (3 tiers)
   - Subscription plans (weekly/yearly)
   - Ad watching for free credits
   - Transaction history tracking

3. **Referral Program**
   - Unique referral codes per user
   - Credit rewards for inviter and invitee
   - Bounty promotions (time-limited)
   - Referral statistics and history

4. **Admin Panel**
   - User management
   - Settings configuration
   - Audit logging
   - Analytics and statistics
   - Advertisement management
   - Art style management

5. **Notification System**
   - Push notifications
   - Email notifications
   - User preferences
   - Broadcast capabilities
   - Notification history

6. **Rate Limiting**
   - Hourly and daily limits
   - Configurable thresholds
   - Per-user tracking

---

## Environment Configuration

```
DATABASE_URL=postgresql://...
SESSION_SECRET=...
AI_INTEGRATIONS_OPENAI_BASE_URL=http://localhost:1106/modelfarm/openai
AI_INTEGRATIONS_OPENAI_API_KEY=DUMMY_API_KEY
RESEND_API_KEY=...
ADMIN_PASSWORD=@?YesBotEnterx1Box?
```

---

## Getting Started for Development

### Seed Script Location
`scripts/seed.ts`

### Run Seed Script
```bash
npx tsx scripts/seed.ts
```

### Access Admin Panel
1. Navigate to: http://localhost:5000
2. Click on Admin login
3. Password: `@?YesBotEnterx1Box?`

### Test User Accounts
Use any of the seeded accounts listed above to test user features.

---

## API Testing Examples

### Admin Login
```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"@?YesBotEnterx1Box?"}'
```

### User Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Get User Profile
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

### Get Admin Stats
```bash
curl http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

## Next Steps for Exploration

1. **Test Comic Generation**
   - Use the generate-comic endpoints
   - Upload character images
   - Try different art styles

2. **Test Referral System**
   - Apply referral codes
   - Check credit rewards

3. **Test Admin Features**
   - Create custom art styles
   - Manage user credits
   - Create referral bounties
   - Send broadcast notifications

4. **Test Mobile App**
   - Run Expo development server
   - Test on iOS/Android
   - Test push notifications

---

*Generated on: 2026-03-08*
*Database: Successfully seeded*
*Server: Running on port 5000*

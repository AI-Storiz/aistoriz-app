# AI Storiz

AI Storiz is a mobile application that turns story ideas into illustrated comics, manga, and manhwa. Users can create characters, choose art styles, generate stories and images, and manage their generated comics.

The project uses Expo and React Native for the mobile app, an Express and TypeScript backend, Supabase for PostgreSQL and file storage, and Vercel for deployment.

## Features

- AI-assisted story and comic generation
- Multiple art styles, including Comic, Manga, Manhwa, Anime, Kawaii, Noir, Graphic, and Afro
- Character creation and reuse
- Editable comic panels, speech bubbles, narration, and sound effects
- Comic history and user library
- Export and sharing features
- Credit management and generation job tracking
- Authentication, email verification, and password reset
- Email and push notifications
- Subscription and rewarded-ad interfaces
- Admin panel for application and AI-provider settings
- Privacy policy, terms, and account-deletion pages

Feature availability may depend on configuration and the status of the relevant external services.

## Technology Stack

| Area | Technology |
|---|---|
| Mobile app | Expo, React Native, TypeScript |
| Navigation and state | React Navigation, Redux Toolkit, React Query |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Supabase, Drizzle ORM |
| File storage | Supabase Storage |
| AI integration | OpenAI and Google Gemini, with provider configuration |
| Email | Resend |
| Hosting | Vercel |
| Mobile builds | Expo Application Services (EAS) |
| Advertising | Google Mobile Ads |

## Project Structure

```text
.
├── api/                 # Vercel API entry points
├── assets/              # App assets and visual resources
├── client/              # Expo / React Native application
│   ├── components/      # Reusable UI components
│   ├── screens/         # Application screens
│   ├── navigation/      # Navigation configuration
│   ├── contexts/        # Shared application contexts
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Client utilities and services
│   └── constants/       # App constants
├── server/              # Express backend
│   ├── routes.ts        # API routes
│   ├── worker.ts        # Background job processing
│   ├── db.ts            # Database connection
│   ├── storage.ts       # Data access
│   ├── comicS3.ts       # Comic file storage integration
│   ├── email.ts         # Email functionality
│   └── templates/       # Admin and informational pages
├── shared/              # Shared types and schemas
├── scripts/             # Build and maintenance scripts
├── android/             # Android native project
├── ios/                 # iOS native project
├── app.json             # Expo configuration
├── eas.json             # EAS build profiles
├── package.json         # Dependencies and scripts
├── drizzle.config.ts    # Drizzle configuration
└── vercel.json          # Vercel deployment configuration
```

## Prerequisites

- Node.js and npm
- Git
- Access to the project's Supabase database and Storage
- Required AI-provider credentials
- Resend credentials if email delivery is needed
- An Expo account for EAS builds
- Android Studio for local Android development; macOS and Xcode for local iOS builds

Use the Node.js version supported by the project's Expo and dependency configuration.

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/AI-Storiz/aistoriz-app.git
cd aistoriz-app
npm install
```

For work on the development branch, switch to `arslan`:

```bash
git switch arslan
```

## Environment Configuration

Create a local `.env` file in the project root. Obtain values from the project owner and the relevant service dashboards.

Common server configuration variables include:

```env
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
COMIC_STORAGE_BUCKET=
GEMINI_API_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=
SESSION_SECRET=
```

The exact variables required depend on the feature and deployment environment. Check the server configuration before setting up a new environment.

For client builds, configure `EXPO_PUBLIC_API_URL` with the appropriate API base URL. Values prefixed with `EXPO_PUBLIC_` are bundled into the client and must not contain secrets.

**Security requirements**

- Never commit `.env` files, API keys, passwords, service-role keys, or signing credentials.
- Keep production credentials in the appropriate hosting provider's environment-variable settings.
- Use a strong, unique session secret.
- Do not expose Supabase service-role credentials to the mobile client.

## Development

Run the backend:

```bash
npm run server:dev
```

Run the Expo development server:

```bash
npm run expo:dev
```

Run the background worker when required by the selected local job-processing setup:

```bash
npm run worker
```

Use the project's configured environment variables before starting services. The backend and mobile client must point to the intended development API and database.

## Database

The application uses PostgreSQL with Drizzle ORM and Supabase.

To apply the schema, review the target database and configuration first. The project provides:

```bash
npm run db:push
```

**Caution:** this command can modify the database schema. Do not run it against production without approval and a verified backup or recovery plan.

## AI Provider Configuration

AI-provider settings are managed through the application's admin configuration and supported server environment variables.

The backend includes provider credential resolution and model configuration for OpenAI and Google Gemini. Keep provider credentials on the server and configure the desired providers using the project's admin settings and deployment environment.

## Vercel Deployment

The repository includes a Vercel configuration and API entry points.

Before deploying:

1. Confirm the intended Git branch and Vercel project.
2. Configure the required server-side environment variables in Vercel.
3. Verify the Supabase database and Storage settings.
4. Confirm that the API base URL used by the mobile app points to the intended deployment.
5. Test the deployed API and admin functionality.
6. Build and test the mobile app against the intended API.

Deploy only to the authorized project and branch. Production deployment should follow the project owner's approval process.

## Android Builds

The project defines EAS build scripts for Android preview and production builds.

Preview APK:

```bash
npm run build:apk
```

Production Android build:

```bash
npm run build:apk:release
```

The production profile's output format and signing configuration depend on `eas.json` and the EAS project configuration. Confirm whether the intended artifact is an APK for direct installation or an AAB for Google Play before release.

Never commit Android keystores, signing passwords, or EAS credentials to the repository.

## Quality Checks

TypeScript check:

```bash
npm run check:types
```

Lint:

```bash
npm run lint
```

Formatting check:

```bash
npm run check:format
```

Run these checks before submitting changes. Run the relevant application and integration tests separately; the presence of a feature or test file does not by itself establish that production behavior has been verified.

## Troubleshooting

- **Database connection errors:** verify `DATABASE_URL`, network access, and database availability.
- **Storage errors:** verify `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `COMIC_STORAGE_BUCKET`.
- **AI generation errors:** verify the selected provider, server-side credentials, model configuration, and provider quota.
- **Mobile API errors:** verify `EXPO_PUBLIC_API_URL` and rebuild the app if its API URL is embedded in the native binary.
- **Build errors:** confirm the Node.js version, installed dependencies, Expo configuration, and EAS build profile.

## Contributing

- Work on the authorized development branch.
- Keep changes focused and avoid unrelated modifications.
- Never commit credentials or sensitive production data.
- Run applicable quality checks and tests before submitting changes.
- Obtain approval before merging or deploying to production.

## License

Proprietary. All rights reserved. Unauthorized distribution is prohibited.
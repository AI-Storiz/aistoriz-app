# AI Storiz - Replit Configuration

## Overview
AI Storiz is a mobile-first application that transforms user story ideas into AI-generated comic-style visual stories. Built with React Native (Expo) and an Express backend, it allows users to create personalized comics by defining characters, writing story prompts, selecting art styles, and generating multi-page comics with AI. The app supports exporting comics as images, sharing, and saving to device storage.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React Native/Expo)
- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture
- **Navigation**: React Navigation v7 with a tab-based layout (Create, History, Profile tabs). Main screens have custom built-in headers (headerShown: false in stack navigators).
- **State Management**: TanStack React Query for server state, local AsyncStorage for persisting characters and saved comics
- **Styling**: Modern, minimalist design with:
  - Light gray background (#E5E7EB)
  - White cards (#F9FAFB) with borderRadius: 16
  - Sky blue accent (#0EA5E9)
  - Card-based design without borders
  - Custom top bar on each screen (logo + app name + credits badge)
  - Big title pattern: two-line split (regular text + accent color)
  - Nunito font family throughout
- **Animations**: React Native Reanimated for spring-based micro-interactions and haptic feedback

### Backend (Express)
- **Server**: Express v5 running on Node.js with TypeScript
- **API Design**: RESTful endpoints with job-based polling for comic generation progress
- **AI Integration**: OpenAI API via Replit AI Integrations for story generation and image creation
- **Admin Dashboard**: Web-based admin panel for managing AI provider settings, rate limiting, audit logs, and internal ads.

### Network Architecture
- **Development Proxy**: Express proxies non-API requests to Expo dev server.
- **API URL Logic**: Dynamic resolution for web and native environments.
- **CORS Configuration**: Allows Replit domains and localhost.

### Authentication System
- **Methods**: Email/Password with email verification and password reset.
- **Token-based**: Bearer tokens stored in AsyncStorage.
- **User ID**: Unique format (e.g., USR-A1B2C3).
- **New User Credits**: 50 free credits upon registration.

### Credit System
- **Generation Cost**: Comics require credits (50 base + 15 per additional page).
- **Subscription Plans**: Weekly and Yearly options for purchasing credits.
- **Free Credits**: Users can earn credits by watching rewarded video ads.

### Comic Generation Modes
The app supports two generation modes, configurable by admin via `comicGenerationMode` in `.ai-settings.json`:

#### Multi-Model Mode (default: `multi-model`)
Multi-stage pipeline using specialized models for each step (~20 API calls per comic):
1.  **Phase 0: Outfit Detection**: Uses GPT-4o Vision to detect clothing in uploaded character photos.
2.  **Phase 0.5: Outfit Adaptation**: Adapts outfits to story context while preserving recognizable elements.
3.  **Phase 1: Character Style Transformation**: Transforms user photos into comic-style character images using Replicate FLUX Kontext.
4.  **Phase 2: Panel Generation**: Generates individual comic panels. Providers: SiliconFlow FLUX Kontext (default), FLUX.2 Pro (Replicate).

#### Gemini Full-Page Mode (`gemini-fullpage`)
Generates entire comic pages as single images with panels, gutters, speech bubbles, and narration baked in (~5-9 API calls, 2-3x faster):
1.  **Text Generation**: Uses configured text AI provider to generate story script with panel descriptions and dialogue.
2.  **Full-Page Rendering**: Uses Google Gemini image generation to render complete comic pages including panel borders, white gutters, speech bubbles with text, and narration boxes.
3.  **Frontend Detection**: Pages with `generationMode: "gemini-fullpage"` are displayed as full images without overlaying additional speech bubbles (`hideBubbles={true}` on ComicPageWithBubbles).

### Data Layer
-   **Database**: PostgreSQL via Drizzle ORM for user accounts, credits, transactions, characters, and comics.
-   **Job Persistence**: Comic generation jobs stored in the `comic_jobs` table for recovery.

### Key Workflows
-   **Comic Generation**: User prompt submission → AI story/image generation → preview with speech bubbles.
-   **Character Management**: Reusable character library with image picking.
-   **Speech Bubbles & Narration**: AI-generated text displayed in editable speech bubbles and narration boxes.
-   **Export/Share**: Multi-page PDF, individual JPGs, or ZIP archive export with native sharing.

### Internal Ads System
-   **Management**: Admin-managed text and banner ads with configurable placement and frequency.
-   **Exemption**: Premium subscribers can be exempt from ads.
-   **Tracking**: Impression logging for analytics.

### Push Notification System
-   **Backend**: `expo-server-sdk` for sending notifications.
-   **Types**: Comic completion, low credits, referrals, promotions.
-   **Preferences**: User-configurable and server-synced.

## External Dependencies

### AI Services
-   **OpenAI API**: Accessed through Replit AI Integrations for text and image generation.
-   **Replicate**: Used for character style transformation (FLUX Kontext) and panel generation (FLUX.2 Pro).
-   **SiliconFlow**: Used for panel generation (FLUX Kontext).

### Expo Services
-   `expo-image-picker`: Camera and photo library access.
-   `expo-media-library`: Saving images to device.
-   `expo-sharing`: Native share sheet integration.
-   `expo-file-system`: File management for exports.
-   `expo-haptics`: Tactile feedback.
-   `expo-print`: PDF export.
-   `expo-server-sdk`: Sending push notifications.

### Client-Side Storage
-   `@react-native-async-storage/async-storage`: Persistent local storage.

### Libraries
-   `jszip`: ZIP archive creation.
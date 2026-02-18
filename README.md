# My Coffee POS

A modern, offline-first Point of Sale (POS) web application built for coffee shops. Designed for Android tablets with full offline support and multi-terminal sync capabilities.

## Features

- **Offline-First PWA**: Works fully offline on Android tablets
- **Multi-Terminal Support**: Multiple devices can operate concurrently
- **Dual Currency**: Displays prices in both USD and Khmer Riel (KHR)
- **Configurable Exchange Rate**: Set at start of shift, attached to each invoice
- **Hold/Resume Carts**: Save and resume multiple carts locally
- **Conflict-Free Sync**: Only finalized invoices sync to server (append-only)
- **Touch-Friendly UI**: Large buttons, big cards, designed for tablets
- **Multilingual**: English and Khmer 
- **Admin Dashboard**: View sales stats, manage products and users

## Tech Stack

- **Server**: Bun + bun:sqlite (SQLite)
- **Framework**: Astro
- **Client UI**: TailwindCSS + React
- **Offline Storage**: IndexedDB using Dexie
- **PWA**: Service Worker + Web App Manifest
- **Language**: TypeScript

## Prerequisites

- [Bun](https://bun.sh/) v1.0 or higher (for local development)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) (for containerized deployment)

## Installation

### Option 1: Local Development

1. **Clone/navigate to the project directory**:
   ```bash
   cd "Coffee POS"
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Set up the database**:
   ```bash
   bun run db:setup
   ```

4. **Seed the database** with default data:
   ```bash
   bun run db:seed
   ```

5. **Start the development server**:
   ```bash
   bun run dev
   ```

6. **Access the application**:
   - Open `http://localhost:4321` in your browser
   - For tablet testing, use your local IP address (e.g., `http://192.168.x.x:4321`)

### Option 2: Docker Deployment

1. **Build and run with Docker Compose** (recommended):
   ```bash
   docker-compose up -d
   ```

2. **Or build and run manually**:
   ```bash
   # Build the image
   docker build -t coffee-pos .

   # Run the container
   docker run -d \
     --name coffee-pos \
     -p 4321:4321 \
     -v coffee-pos-data:/app/data \
     -v coffee-pos-uploads:/app/dist/client/uploads \
     coffee-pos
   ```

3. **Access the application**:
   - Open `http://localhost:4321` in your browser

4. **View logs**:
   ```bash
   docker-compose logs -f
   # or
   docker logs -f coffee-pos
   ```

5. **Stop the application**:
   ```bash
   docker-compose down
   # or
   docker stop coffee-pos
   ```

### Docker Data Persistence

The Docker setup uses named volumes to persist data:
- `coffee-pos-data` - SQLite database
- `coffee-pos-uploads` - Uploaded product images

To backup your data:
```bash
# Backup database
docker cp coffee-pos:/app/data/coffee-pos.db ./backup/

# Backup uploads
docker cp coffee-pos:/app/dist/client/uploads ./backup/
```

## Default Credentials

| Role    | Username | Password    |
|---------|----------|-------------|
| Admin   | admin    | admin123    |
| Cashier | cashier  | cashier123  |

## Usage

### Login Flow

1. Navigate to `/login`
2. Enter username and password
3. Set/confirm exchange rate for the shift
4. You'll be redirected to the POS screen

### POS Screen

- **Product Grid**: Browse and search products by name or category
- **Cart**: Add items, adjust quantities, remove items
- **Hold Cart**: Save current cart for later (local only)
- **Payment**: Enter cash received, see change in both currencies
- **Print Invoice**: Print receipt or A4 format

### Admin Dashboard

Accessible at `/admin` (admin role required):

- **Dashboard**: Today's sales stats, top products, category breakdown
- **Products**: Add, edit, delete products
- **Users**: Manage user accounts
- **Settings**: Configure default exchange rate

## Security

- **Protected Routes**: All routes except login require authentication
- **Session-Based Auth**: Uses HTTP-only session cookies
- **Role-Based Access**: Admin routes restricted to admin users
- **API Protection**: All API endpoints require valid session
- **Password Hashing**: Passwords hashed using secure algorithms
- **Middleware Validation**: Server-side middleware validates all requests

## Offline Behavior

1. **First Login**: Requires internet to authenticate and cache credentials
2. **Subsequent Logins**: Can login offline using cached credentials
3. **Products**: Cached locally after first fetch
4. **Sales**: Created locally immediately, even offline
5. **Sync**: When online, pending invoices sync automatically
6. **Held Carts**: Always local-only, never sync

## Currency Display

- Prices stored in USD cents (source of truth)
- Display shows both USD and KHR
- Exchange rate set at shift start
- Each invoice captures the exchange rate used
- KHR amounts rounded to nearest riel (no decimals)

## Sync Architecture

- **Idempotent**: Each operation has a unique `opId`
- **Append-Only**: Invoices only created, never updated
- **Conflict-Free**: Server ignores duplicate operations
- **Background Sync**: Automatic sync every 30 seconds when online

## Project Structure

```
Coffee POS/
├── src/
│   ├── components/       # React components
│   │   ├── admin/        # Admin dashboard components
│   │   ├── auth/         # Login form
│   │   ├── invoice/      # Invoice view
│   │   ├── layout/       # Header, language toggle, sync status
│   │   ├── pos/          # POS components (products, cart, payment)
│   │   └── ui/           # Reusable UI components
│   ├── i18n/             # Translation files (en.json, km.json)
│   ├── layouts/          # Astro layouts
│   ├── lib/
│   │   ├── auth/         # Password hashing
│   │   ├── client/       # IndexedDB, sync, client auth
│   │   ├── db/           # Server database (SQLite)
│   │   ├── store/        # Zustand stores
│   │   └── utils/        # Currency, formatting utilities
│   ├── pages/            # Astro pages & API routes
│   │   ├── admin/        # Admin pages
│   │   ├── api/          # API endpoints
│   │   └── invoice/      # Invoice page
│   └── styles/           # Global CSS, print styles
├── public/
│   ├── icons/            # PWA icons
│   ├── images/products/  # Product images
│   ├── manifest.json     # PWA manifest
│   └── sw.js             # Service worker
├── scripts/              # Database setup & seeding
├── data/                 # SQLite database file
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Data
- `GET /api/products` - Get all products (cacheable)
- `GET /api/settings` - Get app settings
- `PUT /api/settings` - Update settings (admin only)

### Sync
- `POST /api/sync/push` - Push local invoices to server

### Admin
- `GET/POST/PUT/DELETE /api/admin/products` - CRUD products
- `GET/POST/PUT/DELETE /api/admin/users` - CRUD users
- `GET /api/admin/stats` - Get today's sales stats

## Scripts

```bash
# Development
bun run dev        # Start dev server

# Database
bun run db:setup   # Create database schema
bun run db:seed    # Seed with default data
bun run db:reset   # Reset database (setup + seed)

# Production
bun run build      # Build for production
bun run start      # Start production server
bun run preview    # Preview production build

# Docker
bun run docker:build   # Build Docker image
bun run docker:up      # Start with Docker Compose
bun run docker:down    # Stop Docker Compose
bun run docker:logs    # View Docker logs
```

## PWA Installation

On Android tablets:
1. Open the app in Chrome
2. Tap the menu (3 dots)
3. Select "Add to Home screen" or "Install app"
4. The app will work offline after installation

## License

MIT

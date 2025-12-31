# Running the Student Management (Local)

Quick steps to run locally for development:

1. Install dependencies

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and fill in your Appwrite values

   ```bash
   cp .env.example .env
   # edit .env and paste real IDs/URL
   ```

3. Validate env vars

   ```bash
   npm run check-env
   ```

4. Start dev server

   ```bash
   npm run dev
   ```

Notes:
- The app uses Appwrite for auth, DB and storage. For full functionality you need a running Appwrite instance (see https://appwrite.io/docs/installation).
- If you don't have Appwrite, the UI will load but many features will be disabled or show errors when used.
- Use the `.env.example` file as a template.

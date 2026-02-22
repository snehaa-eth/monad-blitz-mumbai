# Task: Get Repository Running

## Status
Completed

## Steps Taken
1.  **Explored Repository**: Identified it as a React + Vite project with TypeScript.
2.  **Installed Dependencies**: Ran `npm install` to install required packages.
3.  **Started Development Server**: Ran `npm run dev`.
    -   Port 3000 was in use, so it started on port **3001**.
4.  **Fixed Blank Page Issue**: The application was initially blank because `index.html` was missing the entry point script.
    -   Added `<script type="module" src="/index.tsx"></script>` to `index.html`.
5.  **Verified Application**: Checked `http://localhost:3001/` and confirmed the "PredBlink" UI loads correctly.

## Notes
-   **API Key**: The application requires a `GEMINI_API_KEY` for full functionality.
    -   I did **not** set this key.
    -   The application is currently running in a **simulation mode** (mock data) as per the fallback logic in `services/geminiService.ts`.
    -   To enable real AI features, create a `.env.local` file with `GEMINI_API_KEY=your_key_here`.

## Access
The application is running at: [http://localhost:3001/](http://localhost:3001/)

# File_Ecplorer_Website

# 🚀 Production-Ready Full-Stack File Explorer

A production-grade, secure, scalable file explorer web application built with **Next.js (App Router)** and **Tailwind CSS**. It provides a desktop-like file manager in the browser while maintaining robust backend path security. No separate Express server is needed—this is a seamless, localized full-stack solution.

## ✨ Features
- **UI Views:** Toggle between clean Grid and List views.
- **File Operations:** Browse, Create Folders, Rename, Copy, Cut, Paste, Upload (Multi-file Drag and Drop ready) and Delete.
- **Security:** Bulletproof path traversal protections resolving paths against a restricted Base Environment Directory.
- **Storage Metrics:** Live tracking of disk usage out of a mocked Quota.
- **Keyboard Shortcuts:** Built natively (Ctrl+A, Ctrl+C/X/V, Escape, Delete).
- **Context Menus:** Modern right-click dropdown menu with dynamic actions.
- **Optional AI:** Mock API endpoint implementation for background removal natively in Node.

## ⚙️ Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Setup your environment:**
   Create a `.env.local` file in the root:
   ```env
   FILE_EXPLORER_ROOT=./storage/files
   STORAGE_QUOTA=5368709120  # (5GB Defaults)
   ```
3. **Seed mock data (optional):**
   ```bash
   npm run seed
   ```
4. **Run the development server:**
   ```bash
   npm run dev
   ```

## 📜 Scripts
- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Compiles the application for production.
- `npm run start`: Runs the compiled production server.
- `npm run lint`: Validates code style and checks.
- *(Coming soon)* `npm run seed`: Generates initial mock folders.

## 🧱 Folder Structure Explanation
- `/app`: Next.js App Router root, configuration and pages.
- `/app/api`: All API Endpoints mapped to route handlers.
- `/components`: Granular, reusable React UI components.
- `/hooks`: Decoupled business logic handling fetch requests and React state (`useFileExplorer`, `useSelection`).
- `/services`: Node.js filesystem interaction logic (`fileService.ts`).
- `/lib/server`: Strict server-side only utilities (crucial path safety validation).
- `/styles`: Global CSS declarations and Tailwind properties.
- `/types`: Shared TypeScript definitions between UI and Server.

## 📡 API Overview
Responses always adhere to: `{ success: boolean, data: any | null, error: string | null }`

- **GET** `/api/browse?path=` | Returns directory tree nodes.
- **GET** `/api/storage` | Returns quota and total used space inside root.
- **POST** `/api/create-folder` | Creates directory natively.
- **POST** `/api/upload?path=` | Multipart FormData handling buffering to disk.
- **POST** `/api/rename` | Changes absolute name configurations.
- **POST** `/api/paste` | Facilitates recursive Copy/Cut operations.
- **DELETE** `/api/delete?path=` | Recursively deletes folders or files.

## 🧠 System Architecture Explanation
This application employs a modern **vertical slicing architecture** tailored for Next.js. The UI uses Contextual Hooks to request operations against standard stateless API Route Handlers. Those handlers wrap the payload and pass it strictly to the `services` layer which interacts with the `fs` module safely. All external inputs are piped through `resolveSafePath` rendering directory traversal (`../`) attacks impossible.

## ⚠️ Known Limitations
- Currently relies on Next.js local temporary execution limits. Very large file streams might require tweaking default App Router JSON limits or streaming logic.
- Native `rename` across different logical devices inside Linux requires copy/unlink failback.

## 🚀 Future Improvements
- WebSockets for dynamic multi-window state synchronization.
- Implement explicit AI Image transformation natively with `sharp` or external API.
- Support zipped multi-file downloads natively.

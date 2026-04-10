# 🚀 Enhance File Explorer with Advanced Features (Next.js + TypeScript)

## 🧠 ROLE

You are a **senior full-stack engineer**.

Enhance an existing **Next.js File Explorer (App Router + TypeScript)** with the following features:

1. Duplicate File Detection
2. File Importance Ranking
3. Instant File Insight (AI summary)
4. Keyboard Shortcuts
5. Undo / Redo System
6. Recycle Bin (Trash System)

Do NOT break existing functionality.

---

# 🎯 GOAL

Improve real-world usability by solving:

- duplicate files
- accidental deletion
- slow navigation
- lack of file insights
- no undo system

---

# 🧱 PROJECT STRUCTURE

Create modules:

/lib/features
  duplicate.ts
  importance.ts
  history.ts
  trash.ts

/services
  duplicate.service.ts
  history.service.ts

/components/features
  DuplicatePanel.tsx
  TrashPanel.tsx
  FileInsights.tsx

---

# 🚀 FEATURE 1: DUPLICATE FILE DETECTION

## Goal
Find files with same content or similar names.

---

## Implementation

### Step 1: Generate file hash

Use Node.js:

```ts
import crypto from "crypto";
import fs from "fs";

export function getFileHash(path: string): string {
  const file = fs.readFileSync(path);
  return crypto.createHash("md5").update(file).digest("hex");
}
```

---

### Step 2: Detect duplicates

Group files by:

* hash
* OR name similarity

---

### Output:

```ts
[
  {
    hash: "abc123",
    files: ["/docs/a.pdf", "/docs/b.pdf"]
  }
]
```

---

### UI

* Show grouped duplicates
* Add button: "Keep latest"

---

# 🚀 FEATURE 2: FILE IMPORTANCE RANKING

## Goal

Rank files based on usage.

---

## Logic

Score based on:

* last accessed time
* frequency
* file size

---

### Example:

```ts
score = (accessCount * 2) + (recentAccess ? 5 : 0)
```

---

### Categories:

* ⭐ Important
* 🕒 Recent
* 💤 Not used

---

### UI

* Add "Smart View" tab
* Show grouped files

---

# 🚀 FEATURE 3: INSTANT FILE INSIGHT (AI)

## Goal

Show file summary without opening it.

---

## API

POST /api/ai/summarize

---

## Behavior

* Extract text from file
* Send to AI
* Return:

```ts
{
  summary: string;
  keyPoints: string[];
}
```

---

## UI

* On hover OR click
* Show preview card

---

# 🚀 FEATURE 4: KEYBOARD SHORTCUTS

## Goal

Improve speed of navigation.

---

## Shortcuts

* Delete → delete selected
* Enter → open file
* Ctrl + C → copy
* Ctrl + V → paste
* Ctrl + A → select all
* Escape → clear selection

---

## Implementation

Use:

```ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    // handle shortcuts
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
```

---

# 🚀 FEATURE 5: UNDO / REDO SYSTEM

## Goal

Allow reversing actions.

---

## Implementation

Create history stack:

```ts
type ActionHistory = {
  type: "delete" | "move" | "rename";
  payload: any;
};
```

---

## Store:

```ts
undoStack: ActionHistory[]
redoStack: ActionHistory[]
```

---

## Behavior

* After every action → push to undoStack
* Undo → reverse action
* Redo → reapply

---

# 🚀 FEATURE 6: RECYCLE BIN SYSTEM

## Goal

Soft delete files instead of permanent delete.

---

## Implementation

### Step 1: Create trash folder

```bash
/storage/.trash
```

---

### Step 2: Delete → move to trash

```ts
fs.renameSync(filePath, trashPath);
```

---

### Step 3: Store metadata

```ts
{
  originalPath: string;
  deletedAt: Date;
}
```

---

### Step 4: Restore

Move back to original path

---

### UI

* Add "Trash" section in sidebar
* Show deleted files
* Buttons:

  * Restore
  * Permanently delete

---

# 🔐 SAFETY RULES

* Never permanently delete immediately
* Always use trash
* Validate paths
* Prevent overwriting

---

# 🎨 UI REQUIREMENTS

* Keep consistent with existing design
* Add:

  * Duplicate panel
  * Trash panel
  * Insights tooltip
* Use Tailwind

---

# 📤 OUTPUT INSTRUCTIONS

Generate in order:

1. Duplicate detection logic
2. Importance ranking logic
3. Trash system
4. Undo/Redo system
5. Keyboard shortcuts
6. AI summary API
7. UI components

---

# 🚨 RULES

* Type-safe (no any)
* Modular code
* No breaking changes
* Clean architecture

---

# ⚡ START

Begin with:

👉 Duplicate detection logic

Wait for "next"

```

---

# 🏆 What You Will Get After This

After running this prompt:

✅ Duplicate file cleaner  
✅ Undo/Redo system  
✅ Trash (recycle bin)  
✅ Keyboard shortcuts  
✅ File insights (AI)  
✅ Smart file ranking  

---

# 🔥 Why This is VERY STRONG

This combination shows:

- System design (undo/redo, trash)
- Backend logic (hashing, ranking)
- UX thinking (shortcuts, insights)

👉 This is **resume + interview gold**

---

# 💬 If you want next step

I can:

- ✅ Give **working code for duplicate detection**
- ✅ Help integrate into your current UI
- ✅ Debug Copilot output
- ✅ Give demo explanation for your boss

Just say:
👉 **“Start step 1 code”**

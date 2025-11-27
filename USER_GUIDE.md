# Linker - Complete User Guide

<div align="center">

**Professional Documentation for Intelligent Import Management**

Version 1.1.6 | Last Updated: November 2025

[Official Website](https://linker-steel-xi.vercel.app/) • [GitHub Repository](https://github.com/soumen0818/Linker) • [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=linkerdev.import-linker)

</div>

---

## 📑 Table of Contents

### Getting Started
1. [Introduction](#1-introduction)
2. [Installation & Setup](#2-installation--setup)
3. [Quick Start Guide](#3-quick-start-guide)
4. [First Time Configuration](#4-first-time-configuration)

### Core Features
5. [Supported Languages & Patterns](#5-supported-languages--patterns)
6. [Smart Import Detection](#6-smart-import-detection)
7. [Visual Diff Preview](#7-visual-diff-preview)
8. [Undo/Redo System](#8-undoredo-system)

### Advanced Features
9. [Path Alias Resolution](#9-path-alias-resolution)
10. [Git Integration](#10-git-integration)
11. [Format Preservation](#11-format-preservation)
12. [Performance Optimization](#12-performance-optimization)

### Configuration
13. [Settings Reference](#13-settings-reference)
14. [Workspace vs Global Settings](#14-workspace-vs-global-settings)
15. [Language-Specific Configuration](#15-language-specific-configuration)
16. [Performance Tuning](#16-performance-tuning)

### Usage Scenarios
17. [Working with Monorepos](#17-working-with-monorepos)
18. [Large Codebase Management](#18-large-codebase-management)
19. [Multi-Language Projects](#19-multi-language-projects)
20. [Team Collaboration](#20-team-collaboration)

### Troubleshooting & Support
21. [Common Issues & Solutions](#21-common-issues--solutions)
22. [Error Messages Explained](#22-error-messages-explained)
23. [Performance Issues](#23-performance-issues)
24. [Getting Help](#24-getting-help)

### Reference
25. [Best Practices](#25-best-practices)
26. [FAQ](#26-faq)
27. [Keyboard Shortcuts](#27-keyboard-shortcuts)
28. [Command Reference](#28-command-reference)

---

## 1. Introduction

### 1.1 What is Linker?

Linker is an intelligent VS Code extension that **automatically updates import statements** across your entire codebase when you rename or move files and folders. It eliminates the tedious task of manually tracking down and updating import paths, preventing broken imports and compilation errors during refactoring.

### 1.2 Why Linker?

**The Problem:**
When you rename or move a file in a large project, every import statement referencing that file becomes broken. Manually finding and updating these imports is:
- ⏰ Time-consuming and tedious
- ❌ Error-prone (easy to miss imports)
- 🔍 Difficult in large codebases
- 😫 Frustrating when imports are spread across many files

**The Solution:**
Linker automatically:
- 🔍 Scans your entire workspace for affected imports
- 🎯 Detects all import patterns (ES6, CommonJS, Python, Go, CSS)
- 📊 Shows you exactly what will change before applying
- ⚡ Updates all imports instantly with one click
- 🔄 Supports undo/redo if you change your mind
- 🎨 Preserves your code formatting and style

### 1.3 Key Benefits

| Benefit | Description |
|---------|-------------|
| **🚀 Save Time** | Automatically update hundreds of imports in seconds |
| **✅ Zero Errors** | Never break imports during refactoring |
| **👀 Visual Preview** | See exactly what will change before applying |
| **🌐 Multi-Language** | JavaScript, TypeScript, Python, Go, CSS support |
| **🔧 Path Aliases** | Full support for TypeScript, Python, Go, CSS aliases |
| **⚡ Fast** | Optimized for large codebases (50,000+ files) |
| **🎨 Style Preserving** | Maintains quotes, semicolons, indentation |
| **🔄 Undo/Redo** | Complete history tracking with keyboard shortcuts |
| **🔗 Git Integration** | Uses `git mv` to preserve file history |
| **⚙️ Configurable** | Extensive settings for every use case |

### 1.4 What Makes Linker Unique?

**Only extension with FULL alias support across ALL 4 languages:**
- ✅ TypeScript/JavaScript: `tsconfig.json` paths (`@/`, `~/`, custom)
- ✅ Python: `pyproject.toml` + auto-detection (`src/`, `app/`, `lib/`)
- ✅ Go: `go.mod` module paths and replace directives
- ✅ CSS: webpack/vite/parcel aliases (`@`, `~`)

**Production-Ready Performance:**
- Handles codebases with 50,000+ files
- Smart scanning with configurable limits
- File size filtering and operation timeouts
- Dynamic concurrency adjustment
- Workspace analysis and optimization

---

## 2. Installation & Setup

### 2.1 Installation Methods

#### Method 1: VS Code Marketplace (Recommended)

1. **Open VS Code**
2. Click the **Extensions** icon in the sidebar (or press `Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **"Linker"** or **"Import Linker"**
4. Click **Install** button
5. Reload VS Code if prompted (usually automatic)

#### Method 2: Command Line Installation

Open your terminal and run:

```bash
# Windows/Linux/macOS
code --install-extension linkerdev.import-linker
```

#### Method 3: Manual Installation from VSIX

1. Download the `.vsix` file from [GitHub Releases](https://github.com/soumen0818/Linker/releases)
2. In VS Code, open Extensions view (`Ctrl+Shift+X`)
3. Click the `...` (More Actions) menu at the top right
4. Select **"Install from VSIX..."**
5. Navigate to and select the downloaded `.vsix` file
6. Click **"Install"** and reload VS Code

### 2.2 Verify Installation

After installation, verify Linker is working:

**Step 1: Check Extension List**
1. Open Extensions view (`Ctrl+Shift+X`)
2. Search for "Linker"
3. Confirm it shows as "Installed"

**Step 2: Test Commands**
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Linker"
3. You should see these commands:
   - Linker: Undo Last Import Changes
   - Linker: Redo Import Changes
   - Linker: Show Change History
   - Linker: Change Settings Preference

**Step 3: Verify Auto-Activation**
Linker activates automatically when VS Code starts. No manual activation needed.

### 2.3 System Requirements

- **VS Code Version:** 1.75.0 or higher
- **Operating Systems:** Windows, macOS, Linux
- **Node.js:** Not required (extension runs in VS Code's runtime)
- **Disk Space:** ~250 KB

### 2.4 Supported Project Types

Linker works with any project containing:
- JavaScript/TypeScript projects (React, Vue, Angular, Node.js, etc.)
- Python projects (Django, Flask, FastAPI, etc.)
- Go projects (any Go modules)
- CSS/SCSS/LESS projects (with or without build tools)
- Monorepos and multi-language projects

---

## 3. Quick Start Guide

### 3.1 Your First Rename (3 Steps)


Let's walk through a complete example from start to finish.

**Scenario:** You have two TypeScript files, and you want to rename one.

**Step 1: Create Your Files**

Create `utils.ts`:
```typescript
// utils.ts
export const greet = (name: string) => `Hello, ${name}!`;
export const add = (a: number, b: number) => a + b;
```

Create `app.ts`:
```typescript
// app.ts
import { greet, add } from './utils';

console.log(greet('World'));
console.log(add(2, 3));
```

**Step 2: Rename the File**
1. In VS Code Explorer, right-click on `utils.ts`
2. Select **"Rename"** (or press `F2`)
3. Type `helpers.ts`
4. Press **Enter**

**Step 3: Preview Appears**

Linker instantly shows a beautiful preview window with:
- Header showing "Import Changes Preview"
- File badge: `app.ts` with file icon
- Before/After comparison:
  ```
  Before: import { greet, add } from './utils';
  After:  import { greet, add } from './helpers';
  ```
- Action buttons: **Apply Changes** and **Cancel**

**Step 4: Apply Changes**
1. Review the changes (look correct? ✅)
2. Click **"Apply Changes"**
3. Done! Your import is updated instantly

**Step 5: Verify**
Open `app.ts` and see:
```typescript
// app.ts
import { greet, add } from './helpers';  // ✅ Updated automatically!

console.log(greet('World'));
console.log(add(2, 3));
```

### 3.2 Understanding the Preview Window

The preview window is your control center. Here's what each part means:

**Header Section:**
- **Title:** "Import Changes Preview"
- **Stats:** Shows total files affected (e.g., "1 file will be modified")
- **Layout Toggle:** Switch between side-by-side and inline view

**File Sections:**
Each affected file gets its own section with:
- **File Icon:** Visual indicator (📜 .js, 🐍 .py, 🎨 .css, 🔷 .go, ⚡ .ts)
- **File Path:** Relative path from workspace root
- **Change Count:** Number of imports changed in that file

**Diff View:**
- **Before (Left/Top):** Original import statement with red background
- **Arrow (Middle):** Shows direction of change (→ desktop, ↓ mobile)
- **After (Right/Bottom):** New import statement with green background
- **Syntax Highlighting:** Color-coded for easy reading

**Action Buttons:**
- **Apply Changes:** Updates all files (green, primary action)
- **Cancel:** Closes preview without making changes (gray)

**Responsive Design:**
- Desktop (>1024px): Side-by-side layout with horizontal arrow
- Tablet (768-1024px): Compact side-by-side
- Mobile (<768px): Vertical stacking with downward arrow

### 3.3 Testing All Features

Try these scenarios to familiarize yourself with Linker:

**Test 1: Folder Rename**
1. Create a folder `services/` with file `userService.ts`
2. Import it somewhere: `import { getUser } from './services/userService'`
3. Rename folder to `api/`
4. Watch Linker update: `import { getUser } from './api/userService'`

**Test 2: Multi-File Update**
1. Create `utils.ts` and import it in 3 different files
2. Rename `utils.ts` to `helpers.ts`
3. Preview shows all 3 files will be updated
4. Click Apply and verify all 3 files changed

**Test 3: Undo/Redo**
1. Perform a rename and apply changes
2. Press `Ctrl+Alt+Z` to undo
3. Press `Ctrl+Alt+Y` to redo
4. Open Command Palette → "Linker: Show Change History"

**Test 4: Path Aliases**
1. If you have `tsconfig.json` with paths like `@/utils`
2. Rename the file
3. Linker updates alias imports too!

---

## 4. First Time Configuration

### 4.1 Workspace vs Global Settings

**When you first use Linker**, it will ask you to choose where to store settings:

**The Prompt:**
```
Where would you like to configure Linker settings?

[Workspace Settings]  [Global Settings]
```

**What This Means:**

| Option | Scope | Best For | Settings Location |
|--------|-------|----------|-------------------|
| **Workspace** | Current project only | Team projects, shared repos | `.vscode/settings.json` |
| **Global** | All your projects | Personal preference, consistency | User settings |

**Workspace Settings** (Recommended for Teams):
- ✅ Settings shared with team via Git
- ✅ Project-specific configuration
- ✅ Different settings per project
- ❌ Creates `.vscode/` folder in project
- **Use when:** Working in a team or project needs specific settings

**Global Settings** (Recommended for Personal):
- ✅ Same settings across all projects
- ✅ No `.vscode/` folder created
- ✅ Personal preference
- ❌ Not shared with team
- **Use when:** Working solo or want consistent behavior everywhere

### 4.2 Settings Configured by Linker

When you choose a preference, Linker automatically configures these optimal defaults:

```json
{
  "linker.autoApply": false,
  "linker.git.useGitMv": true,
  "linker.preview.diffView": true,
  "linker.preview.layout": "side-by-side",
  "linker.formatting.quoteStyle": "auto",
  "linker.formatting.semicolons": "auto",
  "linker.history.enabled": true,
  "linker.history.maxEntries": 50,
  "linker.multiLanguage.python": true,
  "linker.multiLanguage.python.aliasSupport": true,
  "linker.multiLanguage.go": true,
  "linker.multiLanguage.go.aliasSupport": true,
  "linker.multiLanguage.css": true,
  "linker.multiLanguage.css.aliasSupport": true,
  "linker.performance.smartScanning": true
}
```

### 4.3 Changing Your Preference Later

If you change your mind:

**Method 1: Command Palette**
1. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
2. Type "Linker: Change Settings Preference"
3. Select the command
4. Choose new preference: Workspace or Global

**Method 2: Manual Settings**
Edit the settings directly:
- Workspace: Open `.vscode/settings.json` in your project
- Global: File → Preferences → Settings → search "Linker"

### 4.4 Recommended Initial Setup

**For JavaScript/TypeScript Projects:**
```json
{
  "linker.fileExtensions": ["js", "ts", "jsx", "tsx"],
  "linker.exclude": ["**/node_modules/**", "**/dist/**", "**/build/**"],
  "linker.formatting.quoteStyle": "single",
  "linker.formatting.semicolons": "never"
}
```

**For Python Projects:**
```json
{
  "linker.fileExtensions": ["py"],
  "linker.exclude": ["**/__pycache__/**", "**/*.egg-info/**", "**/venv/**"],
  "linker.autoApply": true,
  "linker.multiLanguage.python.aliasSupport": true
}
```

**For Large Codebases (1000+ files):**
```json
{
  "linker.performance.maxFilesToScan": 8000,
  "linker.performance.maxConcurrentFiles": 10,
  "linker.exclude": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/coverage/**"
  ]
}
```

---

## 5. Supported Languages & Patterns

Linker provides comprehensive support for multiple languages with intelligent pattern detection.

### 5.1 JavaScript & TypeScript

**File Extensions:** `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`

**Supported Import Patterns:**

```javascript
// ═══════════════════════════════════════
// ES6 Imports
// ═══════════════════════════════════════

// Default import
import React from 'react';
import Component from './Component';

// Named imports
import { useState, useEffect } from 'react';
import { Button, Input } from './components';

// Namespace import
import * as utils from './utils';

// Mixed import
import React, { useState } from 'react';

// Default with alias
import { default as Component } from './Component';

// Type imports (TypeScript)
import type { User } from './types';
import { type User, type Post } from './types';
import type * as Types from './types';

// ═══════════════════════════════════════
// CommonJS (require)
// ═══════════════════════════════════════

const fs = require('fs');
const utils = require('./utils');
const { helper, formatter } = require('../helpers');
const path = require('path').join;

// ═══════════════════════════════════════
// Dynamic Imports
// ═══════════════════════════════════════

const module = await import('./module');
import('./lazy').then(m => m.default());
const Component = lazy(() => import('./Component'));

// ═══════════════════════════════════════
// Re-exports
// ═══════════════════════════════════════

export { something } from './other';
export * from './all';
export * as utils from './utils';
export { default } from './Component';
export { Button as CustomButton } from './ui';
```

**✅ All patterns are fully supported and automatically detected.**

### 5.2 Python

**File Extensions:** `.py`

**Supported Import Patterns:**

```python
# ═══════════════════════════════════════
# Absolute Imports
# ═══════════════════════════════════════

import utils
import utils.helpers
import utils.helpers.formatters

from utils import helper
from utils.helpers import format_date, format_time
from utils.helpers.formatters import currency, percentage

# ═══════════════════════════════════════
# Relative Imports
# ═══════════════════════════════════════

from . import helpers
from .helpers import format_date
from .. import utils
from ..utils import helper
from ...shared import config

# ═══════════════════════════════════════
# Import with Alias
# ═══════════════════════════════════════

import utils as u
import numpy as np
from utils import helper as h
from django.shortcuts import render as render_template

# ═══════════════════════════════════════
# Multiple Imports
# ═══════════════════════════════════════

from utils import (
    helper,
    formatter,
    validator
)

import utils, helpers, formatters
```

**Important Notes:**
- Linker **preserves** relative vs. absolute import style
- Automatically converts file paths to dot notation (`utils/helpers.py` → `utils.helpers`)
- Respects `__init__.py` for package imports
- Supports nested package structures

**Python-Specific Behavior:**
- Renaming `helpers.py` → Updates all `from .helpers import ...`
- Renaming `utils/` folder → Updates all `from utils.x import ...`
- Moving file to different package → Updates package path automatically

### 5.3 Go

**File Extensions:** `.go`

**Supported Import Patterns:**

```go
// ═══════════════════════════════════════
// Single Imports
// ═══════════════════════════════════════

import "fmt"
import "log"
import "github.com/user/project/utils"
import "myproject/internal/helpers"

// ═══════════════════════════════════════
// Block Imports
// ═══════════════════════════════════════

import (
    "fmt"
    "log"
    "os"
    
    "github.com/gin-gonic/gin"
    "github.com/user/project/utils"
    
    "myproject/internal/config"
    "myproject/internal/database"
)

// ═══════════════════════════════════════
// Import with Alias
// ═══════════════════════════════════════

import (
    utils "github.com/user/project/utils"
    helpers "myproject/internal/helpers"
    . "myproject/internal/constants"
    _ "github.com/lib/pq"
)
```

**Important Notes:**
- Go imports reference **packages** (folders), not individual files
- Renaming a **folder** → Updates all imports of that package
- Renaming a **file** → No import updates needed (file is part of package)
- Linker reads `go.mod` for module path resolution

**Go-Specific Behavior:**
- Module path from `go.mod`: `module github.com/user/project`
- Renaming `internal/helpers/` → Updates to new folder name
- Supports `replace` directives in `go.mod`
- Preserves import grouping and organization

### 5.4 CSS, SCSS & LESS

**File Extensions:** `.css`, `.scss`, `.less`, `.sass`

**Supported Import Patterns:**

```css
/* ═══════════════════════════════════════ */
/* CSS @import Statements */
/* ═══════════════════════════════════════ */

@import "styles/variables.css";
@import 'styles/mixins.css';
@import url("styles/reset.css");
@import url('styles/base.css');
@import url(styles/typography.css);

/* ═══════════════════════════════════════ */
/* SCSS/LESS @import (extension optional) */
/* ═══════════════════════════════════════ */

@import 'base/variables';
@import 'base/variables.scss';
@import 'components/buttons';
@import '../shared/mixins';
@import '../../global/colors';

/* ═══════════════════════════════════════ */
/* Build Tool Aliases */
/* ═══════════════════════════════════════ */

@import '~bootstrap/dist/css/bootstrap';  // webpack ~
@import '@/styles/variables';              // @ alias
@import '~/assets/fonts';                  // ~ alias

/* ═══════════════════════════════════════ */
/* SCSS @use and @forward (Modern) */
/* ═══════════════════════════════════════ */

@use 'variables' as vars;
@use '../shared/mixins';
@forward 'components/buttons';
```

**Important Notes:**
- Both `@import` and `@import url()` syntax supported
- File extensions can be included or omitted (`.scss`, `.css`)
- Relative paths work with or without `./` prefix
- Webpack/Vite/Parcel aliases (`@`, `~`) fully supported

---

## 6. Smart Import Detection

### 6.1 How Linker Finds Imports

Linker uses advanced pattern matching to detect imports:

**Step 1: File Scan**
- Scans all files matching `linker.fileExtensions`
- Respects `linker.exclude` patterns
- Uses smart caching to avoid re-reading unchanged files

**Step 2: Pattern Matching**
- Language-specific regex patterns for each import type
- Handles single-line and multi-line imports
- Detects comments and skips them appropriately

**Step 3: Path Resolution**
- Resolves relative paths (`./`, `../`)
- Resolves absolute paths from workspace root
- Resolves TypeScript path aliases from `tsconfig.json`
- Resolves Python path aliases from `pyproject.toml`
- Resolves Go module paths from `go.mod`
- Resolves CSS build tool aliases from config files

**Step 4: Match Verification**
- Checks if resolved path matches renamed file
- Calculates new path after rename
- Generates before/after preview

### 6.2 Path Resolution Examples

**Relative Paths:**
```
Project structure:
src/
  components/
    Button.tsx
  pages/
    Home.tsx → import Button from '../components/Button'

Rename Button.tsx to CustomButton.tsx:
→ import Button from '../components/CustomButton'
```

**TypeScript Aliases:**
```
tsconfig.json:
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@components/*": ["components/*"]
    }
  }
}

File: src/pages/Home.tsx
import Button from '@components/Button'

Rename src/components/Button.tsx to CustomButton.tsx:
→ import Button from '@components/CustomButton'
```

**Python Packages:**
```
Project structure:
myproject/
  utils/
    __init__.py
    helpers.py
  app.py → from myproject.utils.helpers import format

Rename helpers.py to formatters.py:
→ from myproject.utils.formatters import format
```

**Go Modules:**
```
go.mod:
module github.com/user/myproject

File: main.go
import "github.com/user/myproject/internal/utils"

Rename internal/utils/ to internal/helpers/:
→ import "github.com/user/myproject/internal/helpers"
```

### 6.3 Edge Cases Handled

Linker intelligently handles complex scenarios:

**✅ Multiple Imports from Same File:**
```typescript
import { Button } from './components/Button';
import { ButtonProps } from './components/Button';
import type { ButtonStyle } from './components/Button';

// All three updated when Button.tsx is renamed
```

**✅ Mixed Import Styles:**
```javascript
const utils = require('./utils');
import { helper } from './utils';
export { formatter } from './utils';

// All three patterns detected and updated
```

**✅ Dynamic Imports:**
```typescript
const Component = lazy(() => import('./components/Button'));
const module = await import(`./utils/${filename}`);

// Static paths updated, template literals left unchanged (as they should be)
```

**✅ Comments Preserved:**
```typescript
// import { old } from './old-file';  ← Not updated (commented)
import { Button } from './Button';    ← Updated ✅
/* import { test } from './test'; */  ← Not updated (commented)
```

---

## 7. Visual Diff Preview

### 7.1 Preview Window Layout

The preview window is your command center for reviewing changes before applying them.

**Desktop View (>1024px):**
```
╔════════════════════════════════════════════════════════════════╗
║  Import Changes Preview                         [Layout: ⚡]   ║
║  2 files will be modified                                       ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  📜 src/components/App.tsx  •  1 import changed                ║
║  ┌──────────────────────────────┬───┬────────────────────────┐ ║
║  │ import { util } from './utils │ → │ import { util } from ' │ ║
║  │                                 │   │ ./helpers'            │ ║
║  └──────────────────────────────┴───┴────────────────────────┘ ║
║                                                                 ║
║  ⚡ src/pages/Home.tsx  •  2 imports changed                   ║
║  ┌──────────────────────────────┬───┬────────────────────────┐ ║
║  │ import utils from './utils'    │ → │ import utils from './h │ ║
║  │ from utils import helper       │ → │ from helpers import he │ ║
║  └──────────────────────────────┴───┴────────────────────────┘ ║
║                                                                 ║
║           [Apply Changes]          [Cancel]                    ║
╚════════════════════════════════════════════════════════════════╝
```

**Mobile/Tablet View (<768px):**
```
╔═══════════════════════════════════════╗
║  Import Changes Preview               ║
║  2 files will be modified             ║
╠═══════════════════════════════════════╣
║                                       ║
║  📜 src/components/App.tsx            ║
║  ┌─────────────────────────────────┐ ║
║  │ import { util } from './utils'   │ ║
║  │              ↓                   │ ║
║  │ import { util } from './helpers' │ ║
║  └─────────────────────────────────┘ ║
║                                       ║
║  [Apply] [Cancel]                    ║
╚═══════════════════════════════════════╝
```

### 7.2 Understanding Visual Elements

**File Type Icons:**
- 📜 JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`)
- 🐍 Python (`.py`)
- 🔷 Go (`.go`)
- 🎨 CSS/SCSS/LESS (`.css`, `.scss`, `.less`)
- ⚡ Generic/Other files

**Color Coding:**
- 🔴 Red background: Old/removed code
- 🟢 Green background: New/added code
- 🔵 Blue text: File paths and headers
- ⚪ White/default: Unchanged context

**Change Indicators:**
- `→` arrow (desktop): Side-by-side comparison
- `↓` arrow (mobile): Vertical stacking
- Badge count: "2 imports changed"

### 7.3 Preview Options

**Layout Switching:**

Press the layout button in the header to toggle between:

1. **Side-by-Side** (Default):
   - Before on left, after on right
   - Best for desktop/large screens
   - Easy to compare line-by-line
   
2. **Inline**:
   - Before above, after below
   - Better for narrow screens
   - Compact vertical layout

**Configuration:**
```json
{
  "linker.preview.diffView": true,      // Enable/disable preview
  "linker.preview.layout": "side-by-side"  // "side-by-side" or "inline"
}
```

### 7.4 Navigating the Preview

**Keyboard Navigation:**
- `Tab`: Move between Apply and Cancel buttons
- `Enter`: Activate focused button
- `Esc`: Close preview (same as Cancel)

**Mouse/Touch:**
- Scroll to see all changes
- Click file paths to jump to that file
- Click Apply/Cancel buttons

**Tips:**
- Review ALL changes before applying
- Check file paths are correct
- Look for unexpected changes
- Verify import syntax looks right

---

## 8. Undo/Redo System

### 8.1 How History Works

Linker maintains a complete history of all import changes, allowing you to undo and redo operations at any time.

**What's Tracked:**
- Every file renamed or moved
- All import updates applied
- Original and new content of each file
- Timestamp of each operation

**Storage:**
- History stored in VS Code's memory
- Persists during VS Code session
- Cleared when VS Code closes (privacy by design)
- Configurable maximum entries (default: 50)

### 8.2 Undo Operations

**When to Undo:**
- Made a mistake renaming a file
- Applied changes by accident
- Want to try a different file name
- Need to revert for any reason

**How to Undo:**

**Method 1: Keyboard Shortcut (Fastest)**
- Windows/Linux: `Ctrl+Alt+Z`
- macOS: `Cmd+Alt+Z`

**Method 2: Command Palette**
1. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
2. Type "Linker: Undo"
3. Select "Linker: Undo Last Import Changes"
4. Changes reverted instantly!

**What Happens:**
1. Last operation is reversed
2. All affected files restored to previous state
3. File rename is also undone
4. Operation moved to redo stack

### 8.3 Redo Operations

**When to Redo:**
- Undid by mistake
- Changed your mind after undo
- Want to reapply reverted changes

**How to Redo:**

**Method 1: Keyboard Shortcut**
- Windows/Linux: `Ctrl+Alt+Y`
- macOS: `Cmd+Alt+Y`

**Method 2: Command Palette**
1. Press `Ctrl+Shift+P`
2. Type "Linker: Redo"
3. Select "Linker: Redo Import Changes"

### 8.4 Viewing History

See all your import change operations:

**Command:**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Linker: Show Change History"
3. View complete history list

**History Display:**
```
Import Change History
══════════════════════════════════════════

1. [2025-11-27 14:32:15] Renamed utils.ts → helpers.ts
   - 3 files modified
   - Status: Active

2. [2025-11-27 14:28:42] Renamed Button.tsx → CustomButton.tsx
   - 5 files modified
   - Status: Active

3. [2025-11-27 14:20:18] Moved services/ → api/
   - 12 files modified
   - Status: Active

[Current Position: 3/3]
[Undo Available] [Redo Not Available]
```

### 8.5 Clearing History

**When to Clear:**
- Free up memory
- Start fresh
- Remove old operations

**How to Clear:**
1. Command Palette → "Linker: Clear Import History"
2. Confirm the action
3. History completely cleared

**Warning:** Clearing history removes ability to undo previous operations!

### 8.6 Configuration

```json
{
  // Enable/disable undo/redo functionality
  "linker.history.enabled": true,
  
  // Maximum number of operations to remember
  "linker.history.maxEntries": 50  // Range: 10-100
}
```

**Recommendations:**
- Keep enabled (default) for safety
- Increase `maxEntries` for large refactoring sessions
- Decrease for memory-constrained systems

---

## 9. Path Alias Resolution

One of Linker's most powerful features is comprehensive path alias support across ALL languages.

### 9.1 TypeScript/JavaScript Aliases

**Configuration File:** `tsconfig.json` or `jsconfig.json`

**Setup Example:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@components/*": ["components/*"],
      "@utils/*": ["utils/*"],
      "@services/*": ["services/*"],
      "~/*": ["*"]
    }
  }
}
```

**How Linker Uses This:**

When you rename a file, Linker:
1. Reads your `tsconfig.json` / `jsconfig.json`
2. Parses the `paths` configuration
3. Resolves imports using these aliases
4. Updates aliased imports correctly

**Examples:**

```typescript
// File structure:
// src/
//   components/
//     Button.tsx
//   pages/
//     Home.tsx

// Home.tsx before rename:
import { Button } from '@components/Button';

// Rename Button.tsx → CustomButton.tsx
// Home.tsx after rename:
import { Button } from '@components/CustomButton';  // ✅ Alias preserved!
```

**Complex Alias Example:**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/components/*": ["src/components/*"],
      "@/utils/*": ["src/utils/*"],
      "~/shared/*": ["../shared/*"],
      "#internal/*": ["internal/*"]
    }
  }
}

// All these work:
import { Button } from '@/components/Button';
import { format } from '@/utils/formatter';
import { config } from '~/shared/config';
import { helper } from '#internal/helper';

// Linker updates all of them correctly when files are renamed!
```

**Settings:**
```json
{
  // TypeScript alias support (enabled by default)
  "linker.multiLanguage.typescript.aliasSupport": true
}
```

### 9.2 Python Path Aliases

**Configuration File:** `pyproject.toml` (or auto-detection)

**Setup Example:**
```toml
# pyproject.toml
[tool.linker]
paths = [
    "src",
    "app",
    "lib"
]
```

**Auto-Detection:**

Linker automatically detects common Python structures:
- `src/` directory at project root
- `app/` directory at project root  
- `lib/` directory at project root
- Package name from `setup.py` or `pyproject.toml`

**Examples:**

```python
# Project structure:
# myproject/
#   src/
#     utils/
#       helpers.py
#   app.py

# app.py before rename:
from src.utils.helpers import format_date

# Rename helpers.py → formatters.py
# app.py after rename:
from src.utils.formatters import format_date  # ✅ Updated!
```

**Complex Structure:**
```python
# Project structure:
# myproject/
#   src/
#     myapp/
#       models/
#         user.py
#       views/
#         home.py

# home.py before rename:
from src.myapp.models.user import User
from myapp.models.user import User  # Also supported

# Rename user.py → account.py
# home.py after rename:
from src.myapp.models.account import User
from myapp.models.account import User
```

**Settings:**
```json
{
  // Python alias support (enabled by default)
  "linker.multiLanguage.python.aliasSupport": true
}
```

### 9.3 Go Module Aliases

**Configuration File:** `go.mod`

**Setup Example:**
```go
// go.mod
module github.com/username/myproject

go 1.21

require (
    github.com/gin-gonic/gin v1.9.0
)

replace github.com/username/myproject/v2 => ./v2
```

**How Linker Uses This:**

1. Reads `module` directive for your project's module path
2. Parses `replace` directives for local aliases
3. Resolves import paths using module information
4. Updates imports when packages (folders) are renamed

**Examples:**

```go
// go.mod
module github.com/username/myproject

// File: main.go before rename:
import (
    "github.com/username/myproject/internal/utils"
    "github.com/username/myproject/pkg/helpers"
)

// Rename internal/utils/ → internal/tools/
// main.go after rename:
import (
    "github.com/username/myproject/internal/tools"  // ✅ Updated!
    "github.com/username/myproject/pkg/helpers"
)
```

**Replace Directives:**
```go
// go.mod
module myapp

replace (
    myapp/v2 => ./version2
    myapp/legacy => ../old-project
)

// File: main.go
import "myapp/v2/utils"

// Rename version2/utils/ → version2/helpers/
// main.go after rename:
import "myapp/v2/helpers"  // ✅ Updated via replace directive!
```

**Settings:**
```json
{
  // Go module alias support (enabled by default)
  "linker.multiLanguage.go.aliasSupport": true
}
```

### 9.4 CSS Build Tool Aliases

**Supported Build Tools:**
- Webpack
- Vite
- Parcel
- Rollup
- Create React App

**Configuration Files:**
- `webpack.config.js`
- `vite.config.js` / `vite.config.ts`
- `.parcelrc`

**Common Alias Patterns:**

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '~': path.resolve(__dirname, 'src'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@components': path.resolve(__dirname, 'src/components')
    }
  }
};

// vite.config.js
export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
      '~': '/src',
      '@styles': '/src/styles'
    }
  }
});
```

**Usage in CSS:**

```css
/* styles/main.css before rename */
@import '@styles/variables';
@import '@styles/mixins';
@import '~bootstrap/dist/css/bootstrap';

/* Rename src/styles/variables.css → theme.css */
/* styles/main.css after rename */
@import '@styles/theme';          /* ✅ Updated! */
@import '@styles/mixins';
@import '~bootstrap/dist/css/bootstrap';
```

**SCSS Example:**
```scss
// webpack ~ alias
@import '~@/styles/variables';
@import '~@/styles/mixins';

// Rename mixins.scss → utilities.scss
@import '~@/styles/variables';
@import '~@/styles/utilities';  // ✅ Updated!
```

**Settings:**
```json
{
  // CSS alias support (enabled by default)
  "linker.multiLanguage.css.aliasSupport": true
}
```

### 9.5 Troubleshooting Aliases

**Problem: Aliases Not Detected**

**Solution:**
1. Verify config file exists (`tsconfig.json`, `go.mod`, etc.)
2. Check config file syntax is valid (run `tsc --noEmit` for TypeScript)
3. Reload VS Code window: `Ctrl+Shift+P` → "Reload Window"
4. Enable verbose logging (see section 23)

**Problem: Aliases Updated Incorrectly**

**Solution:**
1. Check `baseUrl` is set correctly in `tsconfig.json`
2. Verify paths don't overlap or conflict
3. Test with simple alias first (just `@/*`)
4. Review Linker output console for warnings

**Problem: Only Some Aliases Work**

**Solution:**
1. Ensure alias format matches Linker's supported patterns
2. Check wildcards are used correctly (`/*` at end)
3. Verify file being renamed is within aliased path
4. Test without wildcards for specific paths

---

## 10. Git Integration

### 10.1 Git MV for File History

**What is `git mv`?**

When you rename a file in a Git repository, Git can record it as either:
1. **Delete + Add:** Loses file history (bad ❌)
2. **Move/Rename:** Preserves file history (good ✅)

Linker uses `git mv` to preserve your file history.

**Benefits:**
- ✅ Git history follows the file to its new name
- ✅ `git log` shows complete history
- ✅ `git blame` works correctly
- ✅ Better for code review and auditing

**Configuration:**
```json
{
  // Use git mv for tracked files (highly recommended)
  "linker.git.useGitMv": true
}
```

**How It Works:**

```
Scenario: Rename utils.ts → helpers.ts

Without git mv:
- Git sees: deleted utils.ts, added helpers.ts
- History lost ❌

With git mv (Linker):
- Git sees: renamed utils.ts → helpers.ts
- History preserved ✅
```

**Git Status After Rename:**
```bash
$ git status
On branch main
Changes to be staged:
  renamed:    src/utils.ts -> src/helpers.ts
  modified:   src/app.ts  # Import updated by Linker
```

### 10.2 Auto-Staging Modified Files

**What Is Auto-Staging?**

When Linker updates imports in files, it can automatically stage those changes in Git.

**Configuration:**
```json
{
  // Auto-stage files modified by Linker
  "linker.git.autoStage": false  // Default: false (manual staging)
}
```

**Behavior:**

| Setting | What Happens |
|---------|-------------|
| `false` (default) | Files modified but not staged (you `git add` manually) |
| `true` | Files automatically staged (ready for commit) |

**Recommendation:**
- **Keep false** for manual control
- **Set true** if you want automatic commits
- **Team preference** - discuss with your team

### 10.3 Working with Git Workflows

**Standard Workflow:**

```bash
# 1. Create a feature branch
$ git checkout -b refactor/rename-utils

# 2. Rename file in VS Code using Linker
#    (Linker updates all imports automatically)

# 3. Check what changed
$ git status
$ git diff

# 4. Stage changes
$ git add src/

# 5. Commit with descriptive message
$ git commit -m "Refactor: Rename utils to helpers

- Renamed src/utils.ts to src/helpers.ts
- Updated 12 import statements across codebase
- No functional changes"

# 6. Push and create PR
$ git push origin refactor/rename-utils
```

**Large Refactoring Workflow:**

```bash
# 1. Create refactoring branch
$ git checkout -b refactor/restructure-components

# 2. Rename multiple files/folders with Linker
#    Review each preview before applying

# 3. After each rename, check diff
$ git diff --stat

# 4. Commit after each logical group
$ git add components/
$ git commit -m "Move Button component to ui/ folder"

$ git add pages/
$ git commit -m "Update imports after component move"

# 5. Final verification
$ npm run build  # or your build command
$ npm test

# 6. Push when all tests pass
$ git push origin refactor/restructure-components
```

### 10.4 Git Best Practices with Linker

**DO:**
- ✅ Commit before large refactorings
- ✅ Review `git diff` after applying changes
- ✅ Use descriptive commit messages
- ✅ Test your code after renames
- ✅ Create feature branches for refactoring

**DON'T:**
- ❌ Rename files without committing first
- ❌ Apply changes without reviewing preview
- ❌ Mix refactoring with feature changes
- ❌ Skip testing after large renames
- ❌ Force push without team coordination

**Commit Message Templates:**

```bash
# Simple rename
git commit -m "Rename utils.ts to helpers.ts"

# With context
git commit -m "Refactor: Rename utils module to helpers

- Renamed src/utils/ to src/helpers/
- Updated 24 import statements
- No breaking changes
- All tests pass"

# Multiple files
git commit -m "Reorganize component structure

- Moved Button, Input, Select to ui/forms/
- Updated imports in 18 files
- Improved project organization"
```

### 10.5 Handling Merge Conflicts

**If Conflicts Occur:**

```bash
# 1. Start merge/rebase
$ git merge main
# Or: git rebase main

# 2. If conflicts in import statements:
Auto-merging src/app.ts
CONFLICT (content): Merge conflict in src/app.ts

# 3. Open conflicted file
#    Look for conflict markers:
<<<<<<< HEAD
import { helper } from './helpers';
=======
import { util } from './utils';
>>>>>>> main

# 4. Resolve manually:
#    - Check which file name is correct now
#    - Keep the correct import
#    - Remove conflict markers

# 5. Stage resolved files
$ git add src/app.ts

# 6. Continue merge/rebase
$ git merge --continue
# Or: git rebase --continue
```

**Preventing Conflicts:**
1. Pull latest changes before refactoring
2. Communicate with team about large refactorings
3. Refactor in small, atomic commits
4. Use feature branches for major changes

---

##  

---

## Troubleshooting

### Common Issues

#### Issue: "No import updates needed"

**Possible Causes:**
- File not imported anywhere
- Imports already correct
- File type not in `fileExtensions`

**Solutions:**
1. Check that file is actually imported
2. Verify `linker.fileExtensions` includes the file type
3. Check `linker.exclude` isn't blocking the directory

---

#### Issue: Preview not showing

**Possible Causes:**
- Preview disabled in settings
- VS Code UI issue

**Solutions:**
1. Enable preview: `"linker.preview.diffView": true`
2. Reload VS Code: `Ctrl+Shift+P` → "Reload Window"
3. Check VS Code console for errors

---

#### Issue: Wrong quote style used

**Possible Causes:**
- Auto-detection couldn't determine style
- Multiple styles in same file

**Solutions:**
1. Set explicit style: `"linker.formatting.quoteStyle": "single"`
2. Ensure consistent style in your codebase
3. Run Prettier/ESLint before using Linker

---

#### Issue: Slow performance

**Possible Causes:**
- Large workspace (1000+ files)
- Not enough exclusions

**Solutions:**
1. Add more exclusions (dist, build, node_modules)
2. Limit file extensions to only what you need
3. Close unused workspace folders

---

### Getting Help

1. **Check Console:** `Help` → `Toggle Developer Tools` → Console tab
2. **GitHub Issues:** [Report a bug](https://github.com/soumen0818/Linker/issues)
3. **Documentation:** Re-read relevant sections
4. **Community:** [GitHub Discussions](https://github.com/soumen0818/Linker/discussions)

---

## Best Practices

### 1. Review Before Applying

Always review the preview before clicking "Apply":
- Check all files are correct
- Verify import paths look right
- Look for unexpected changes

### 2. Use Version Control

- Commit before large refactoring
- Review Git diff after Linker updates
- Use branches for major renames

### 3. Configure Exclusions

Exclude unnecessary directories:
```json
{
  "linker.exclude": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/coverage/**"
  ]
}
```

### 4. Consistent Code Style

Maintain consistent formatting:
- Use Prettier or ESLint
- Set explicit `quoteStyle` if needed
- Keep semicolon usage consistent

### 5. Test After Refactoring

After using Linker:
- Run your tests
- Check the app runs
- Verify imports resolve correctly

---

## FAQ

### General Questions

**Q: Is Linker free?**  
A: Yes, Linker is completely free and open-source (MIT License).

**Q: Does it work offline?**  
A: Yes, Linker works entirely offline with no internet required.

**Q: Does it modify my files automatically?**  
A: Only after you review and approve the preview.

**Q: Can I undo changes?**  
A: Yes, use `Ctrl+Alt+Z` or the undo command.

---

### Technical Questions

**Q: What languages are supported?**  
A: JavaScript, TypeScript, Python, Go, CSS/SCSS/LESS.

**Q: Does it work with TypeScript path aliases?**  
A: Yes, Linker reads your `tsconfig.json` automatically.

**Q: Can it rename folders?**  
A: Yes, folder renames are fully supported.

**Q: Does it work in monorepos?**  
A: Yes, configure exclusions for optimal performance.

---

### Performance Questions

**Q: How large of a project can it handle?**  
A: Tested with projects up to 1000+ files efficiently.

**Q: Will it slow down VS Code?**  
A: No, Linker uses smart caching and batch processing.

**Q: Can I limit which files are scanned?**  
A: Yes, use `fileExtensions` and `exclude` settings.

---

## Conclusion

Linker is designed to make refactoring effortless. With support for multiple languages, visual previews, and intelligent path resolution, it saves you time and prevents import errors.

### Next Steps

1. ✅ Install Linker from VS Code Marketplace
2. 📖 Try the Quick Start guide
3. ⚙️ Configure settings for your project
4. 🚀 Start refactoring with confidence!

### Support the Project

If Linker helps you:
- ⭐ Star on [GitHub](https://github.com/soumen0818/Linker)
- ⭐ Rate on [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=linkerdev.import-linker)
- 💬 Share with your team

---

**Happy Coding! 🎉**

*Last updated: November 2025 | Version 1.1.6 *

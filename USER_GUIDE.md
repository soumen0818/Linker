# Linker User Guide

**Complete documentation for the Linker VS Code extension**

Version 1.1.2 (Phase 2) | Last Updated: November 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Getting Started](#getting-started)
4. [Supported Languages](#supported-languages)
5. [Features](#features)
6. [Configuration](#configuration)
7. [Advanced Usage](#advanced-usage)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [FAQ](#faq)

---

## Introduction

### What is Linker?

Linker is an intelligent VS Code extension that automatically updates import statements across your entire codebase when you rename or move files and folders. It supports multiple programming languages and provides a visual preview of all changes before applying them.

### Why Use Linker?

- **Save Time:** No more manually finding and updating imports
- **Prevent Errors:** Avoid broken imports during refactoring
- **Multi-Language:** Works with JavaScript, TypeScript, Python, Go, and CSS
- **Visual Preview:** See all changes before applying them
- **Undo/Redo:** Full history tracking with easy reversion
- **Git Integration:** Seamlessly works with your Git workflow

### Key Benefits

✅ **Zero Configuration** — Works out-of-the-box with smart defaults  
✅ **Visual Feedback** — See exactly what will change before applying  
✅ **Format Preservation** — Maintains your code style (quotes, semicolons, indentation)  
✅ **Performance Optimized** — Handles large codebases (1000+ files) efficiently  
✅ **Production Ready** — Battle-tested with robust error handling  

---

## Installation

### Method 1: VS Code Marketplace (Recommended)

1. **Open VS Code**
2. Click the **Extensions** icon in the sidebar (or press `Ctrl+Shift+X`)
3. Search for **"Linker"** or **"Import Linker"**
4. Click **Install**
5. Reload VS Code if prompted

### Method 2: Command Line

Open your terminal and run:

```bash
code --install-extension linkerdev.import-linker
```

### Method 3: Manual Installation

1. Download the `.vsix` file from [GitHub Releases](https://github.com/soumen0818/Linker/releases)
2. In VS Code, go to Extensions (`Ctrl+Shift+X`)
3. Click the `...` menu at the top
4. Select **"Install from VSIX..."**
5. Choose the downloaded file

### Verify Installation

After installation:

1. Check that Linker appears in your Extensions list
2. Open the Command Palette (`Ctrl+Shift+P`)
3. Type "Linker" — you should see Linker commands

---

## Getting Started

### Quick Start (3 Steps)

#### Step 1: Rename a File

1. Open your project in VS Code
2. In the Explorer, right-click on any file
3. Select **"Rename"** (or press `F2`)
4. Type the new name and press Enter

#### Step 2: Review the Preview

Linker will show a preview window with:
- List of files that will be modified
- Before/after comparison of each import
- Total number of imports to update

#### Step 3: Apply or Cancel

- Click **"Apply"** to update all imports
- Click **"Cancel"** to abort the operation
- All changes happen instantly!

### Your First Example

Let's try a simple example:

1. **Create two files:**

```typescript
// utils.ts
export const greet = (name: string) => {
  return `Hello, ${name}!`;
};
```

```typescript
// app.ts
import { greet } from './utils';

console.log(greet('World'));
```

2. **Rename `utils.ts` to `helpers.ts`:**
   - Right-click `utils.ts` → Rename
   - Type `helpers.ts` and press Enter

3. **See the preview:**
   - Linker shows that `app.ts` will be updated
   - Before: `import { greet } from './utils';`
   - After: `import { greet } from './helpers';`

4. **Click "Apply":**
   - `app.ts` is automatically updated!
   - ✅ No broken imports

---

## Supported Languages

### JavaScript / TypeScript

**Supported Import Patterns:**

```javascript
// ES6 Imports
import Component from './Component';
import { named } from './utils';
import * as utils from './utils';
import { default as Component } from './Component';

// CommonJS
const utils = require('./utils');
const { helper } = require('../helpers');

// Dynamic Imports
const module = await import('./dynamic');
import('./lazy').then(m => m.default());

// Re-exports
export { something } from './other';
export * from './all';
export * as utils from './utils';

// Type Imports (TypeScript)
import type { User } from './types';
import { type User, type Post } from './types';
```

**File Extensions:** `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`

---

### Python

**Supported Import Patterns:**

```python
# Absolute imports
import utils
import utils.helpers
from utils import helper
from utils.helpers import format_date, format_time

# Relative imports
from . import helpers
from .helpers import format_date
from .. import utils
from ..utils.helpers import format_date

# Import with alias
import utils as u
from utils import helper as h
```

**File Extensions:** `.py`

**Important Notes:**
- Linker preserves relative vs. absolute import style
- Dot notation is automatically converted (e.g., `utils/helpers.py` → `utils.helpers`)

---

### Go

**Supported Import Patterns:**

```go
// Single imports
import "fmt"
import "project/utils"

// Block imports
import (
    "fmt"
    "log"
    "project/utils"
    "project/helpers"
)

// Import with alias
import (
    u "project/utils"
    h "project/helpers"
)
```

**File Extensions:** `.go`

**Important Notes:**
- Go imports reference **packages** (folders), not individual files
- Renaming a **folder** updates all imports of that package
- Renaming a **file** doesn't require import updates (file is part of package)

---

### CSS / SCSS / LESS

**Supported Import Patterns:**

```css
/* CSS @import */
@import "styles/variables.css";
@import url("styles/mixins.css");
@import url('styles/reset.css');

/* SCSS/LESS @import */
@import 'base/variables';
@import 'components/buttons';
@import '../shared/mixins';
```

**File Extensions:** `.css`, `.scss`, `.less`

**Important Notes:**
- Supports both `@import` and `@import url()` syntax
- File extensions can be included or omitted
- Relative paths work with or without `./` prefix

---

## Features

### 1. Visual Diff Preview

**What it does:**  
Shows you exactly what will change before applying updates.

**How to use:**
1. Rename a file or folder
2. A preview window appears showing:
   - Each file that will be modified
   - Before/after comparison for each import
   - Total number of changes

**Preview Options:**

- **Layout:** Choose "Side-by-side" or "Inline" diff view
- **Syntax Highlighting:** Color-coded changes for easy review
- **File Navigation:** Click on any file to open it

**Customization:**

```json
{
  "linker.preview.diffView": true,
  "linker.preview.layout": "side-by-side"  // or "inline"
}
```

---

### 2. Undo/Redo System

**What it does:**  
Tracks all import changes so you can easily revert or reapply them.

**Keyboard Shortcuts:**

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Undo | `Ctrl+Alt+Z` | `Cmd+Alt+Z` |
| Redo | `Ctrl+Alt+Y` | `Cmd+Alt+Y` |

**Using Commands:**

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type one of:
   - `Linker: Undo Last Import Changes`
   - `Linker: Redo Import Changes`
   - `Linker: Show Import History`
   - `Linker: Clear Import History`

**History Management:**

```json
{
  "linker.history.enabled": true,
  "linker.history.maxEntries": 50  // Default: 50, Range: 10-100
}
```

**History is stored:**
- In memory during VS Code session
- Lost when VS Code closes (by design for privacy)
- Can be cleared manually via command

---

### 3. Format Preservation

**What it does:**  
Maintains your code style when updating imports.

**Preserves:**
- **Quote Style:** Single quotes, double quotes, or backticks
- **Semicolons:** Present or absent
- **Indentation:** Spaces or tabs
- **Line Breaks:** Empty lines and spacing

**Auto-Detection:**

Linker analyzes your existing code to match your style:

```typescript
// If your code uses single quotes and no semicolons:
import { utils } from './utils'

// Linker will update to:
import { utils } from './helpers'  // Same style! ✅
```

**Manual Configuration:**

```json
{
  "linker.formatting.quoteStyle": "auto",  // "single", "double", or "auto"
  "linker.formatting.semicolons": "auto"    // "always", "never", or "auto"
}
```

---

### 4. TypeScript Path Aliases

**What it does:**  
Resolves and updates TypeScript path aliases from `tsconfig.json`.

**Example Configuration:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@components/*": ["components/*"],
      "~/*": ["*"]
    }
  }
}
```

**How it works:**

```typescript
// Before renaming utils → helpers
import { validateEmail } from '@/utils/validators';
import { Button } from '@components/Button';

// After renaming (Linker auto-updates)
import { validateEmail } from '@/helpers/validators';  // ✅ Updated!
import { Button } from '@components/Button';           // Not affected
```

**Supported Alias Formats:**
- `@/*` — Most common
- `~/*` — Alternative root
- Custom aliases like `@components/*`, `@utils/*`

---

### 5. Folder Rename Support

**What it does:**  
Updates all imports when you rename or move folders.

**How it works:**

When you rename a folder, Linker:
1. Finds all files importing from that folder
2. Updates the folder name in import paths
3. Handles nested files and subfolders automatically

**Example:**

```
Before:
src/
  services/
    userService.ts
    authService.ts
  components/
    App.tsx → import from '../services/userService'

Rename services → api

After:
src/
  api/
    userService.ts
    authService.ts
  components/
    App.tsx → import from '../api/userService'  // ✅ Updated!
```

**Language-Specific Behavior:**

- **JavaScript/TypeScript:** Updates relative paths
- **Python:** Updates module paths (dot notation)
- **Go:** Updates package import paths
- **CSS:** Updates @import paths

---

### 6. Git Integration

**What it does:**  
Uses `git mv` for tracked files and optionally auto-stages changes.

**Benefits:**
- Preserves Git history
- Works with Git workflows
- Automatic staging of modified imports

**Configuration:**

```json
{
  "linker.git.enabled": true,       // Use git mv for renames
  "linker.autoStageChanges": false  // Auto-stage modified files
}
```

**Behavior:**

| File Status | Linker Action |
|-------------|---------------|
| Tracked by Git | Uses `git mv` |
| Untracked | Uses regular file system move |
| Modified imports | Optionally auto-stages if enabled |

---

## Configuration

### Quick Settings

Access via: `File` → `Preferences` → `Settings` → Search "Linker"

Or edit `settings.json` directly (`Ctrl+,` → click `{}` icon)

### Complete Settings Reference

#### Basic Settings

```json
{
  // File types to scan for imports
  "linker.fileExtensions": [
    "js", "ts", "jsx", "tsx", "mjs", "cjs",  // JavaScript/TypeScript
    "py",                                      // Python
    "go",                                      // Go
    "css", "scss", "less"                     // CSS
  ],
  
  // Folders to exclude from scanning
  "linker.exclude": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/__pycache__/**",
    "**/*.egg-info/**"
  ]
}
```

#### Preview Settings

```json
{
  // Enable visual diff preview
  "linker.preview.diffView": true,
  
  // Layout: "side-by-side" or "inline"
  "linker.preview.layout": "side-by-side"
}
```

#### Formatting Settings

```json
{
  // Quote style: "single", "double", or "auto"
  "linker.formatting.quoteStyle": "auto",
  
  // Semicolons: "always", "never", or "auto"
  "linker.formatting.semicolons": "auto"
}
```

#### History Settings

```json
{
  // Enable undo/redo functionality
  "linker.history.enabled": true,
  
  // Maximum number of history entries
  "linker.history.maxEntries": 50
}
```

#### Language Settings

```json
{
  // Enable/disable specific language support
  "linker.multiLanguage.python": true,
  "linker.multiLanguage.go": true,
  "linker.multiLanguage.css": true
}
```

#### Git Settings

```json
{
  // Automatically stage files modified by Linker
  "linker.autoStageChanges": false
}
```

### Recommended Configurations

#### For JavaScript/TypeScript Projects

```json
{
  "linker.fileExtensions": ["js", "ts", "jsx", "tsx", "mjs", "cjs"],
  "linker.exclude": ["**/node_modules/**", "**/dist/**", "**/build/**"],
  "linker.formatting.quoteStyle": "single",
  "linker.formatting.semicolons": "never"
}
```

#### For Python Projects

```json
{
  "linker.fileExtensions": ["py"],
  "linker.exclude": ["**/__pycache__/**", "**/*.egg-info/**", "**/venv/**"],
  "linker.multiLanguage.python": true
}
```

#### For Multi-Language Projects

```json
{
  "linker.fileExtensions": ["js", "ts", "py", "go", "css"],
  "linker.exclude": [
    "**/node_modules/**",
    "**/__pycache__/**",
    "**/dist/**"
  ],
  "linker.multiLanguage.python": true,
  "linker.multiLanguage.go": true,
  "linker.multiLanguage.css": true
}
```

---

## Advanced Usage

### Working with Monorepos

For large monorepos with multiple packages:

```json
{
  "linker.exclude": [
    "**/node_modules/**",
    "**/packages/*/dist/**",
    "**/packages/*/build/**"
  ],
  "linker.fileExtensions": ["js", "ts", "jsx", "tsx"]
}
```

### Custom Import Patterns

Linker automatically handles most import patterns, but you can optimize for your project:

1. **Path Aliases:** Configure in `tsconfig.json`
2. **Custom Modules:** Add to `fileExtensions` if needed
3. **Exclusions:** Add specific paths to `exclude` for performance

### Batch Operations

When renaming multiple files:

1. Rename files one at a time
2. Review and apply each preview
3. Use undo/redo to manage changes
4. Check Git diff before committing

### Integration with Other Tools

**ESLint:** Linker preserves your ESLint configuration  
**Prettier:** Format files after Linker updates imports  
**Git Hooks:** Linker works with pre-commit hooks  
**CI/CD:** No conflicts with automated builds  

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

*Last updated: November 2025 | Version 1.1.3 (Phase 2)*

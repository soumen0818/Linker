<div align="center">

# 🔗 Linker

### Automatically update import statements when you rename or move files

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/linkerdev.import-linker?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=linkerdev.import-linker)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/linkerdev.import-linker?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=linkerdev.import-linker)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/linkerdev.import-linker?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=linkerdev.import-linker)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

![Linker Logo](images/Linker.png)

**Keep your imports in sync** — Never worry about broken imports when refactoring your codebase.

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Configuration](#-configuration) • [Examples](#-examples)

</div>

---

## ✨ Features

### 🎯 Core Capabilities

- **🔄 Automatic Import Updates** — Rename files and folders without breaking imports
- **📁 Folder Rename Support** — Move entire directories with all nested files
- **🎨 TypeScript Alias Resolution** — Full support for path aliases (`@/`, `~/`, custom paths)
- **🔍 Preview Before Apply** — Review all proposed changes before confirming
- **🌐 Multi-Language Support** — JavaScript, TypeScript, JSX, TSX, ESM, CommonJS

### ⚡ Performance & Optimization

- **⚡ File Caching** — Avoids redundant file reads
- **⏱️ Smart Debouncing** — Handles rapid consecutive renames efficiently
- **📦 Batch Processing** — Processes large codebases in chunks
- **📊 Progress Reporting** — Visual progress for operations with 10+ files
- **🚀 Scalable** — Handles projects with 1000+ files

### 🛡️ Production Ready

- **🔧 Git Integration** — Uses `git mv` for tracked files, auto-stages changes
- **🏗️ Modular Architecture** — 8 specialized modules for maintainability
- **🛡️ Robust Error Handling** — Graceful degradation with user-friendly messages
- **⚙️ Comprehensive Configuration** — 10+ settings for fine-tuning
- **📚 Complete Documentation** — Detailed guides and troubleshooting

---

## 📦 Installation

### From VS Code Marketplace (Recommended)

1. Open **VS Code**
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
3. Search for **"Linker"**
4. Click **Install**

### Quick Install via Command Line

```bash
code --install-extension linkerdev.import-linker
```

---

## 🚀 Quick Start

### How It Works

1. **Rename a file** in VS Code Explorer (Right-click → Rename or press `F2`)
2. **Review the preview** showing which imports will be updated
3. **Click "Apply"** to update all imports automatically

That's it! ✅ All import statements are updated across your entire project.

---

## 💡 Examples

### Example 1: Renaming a File

**Before renaming `utils.ts` → `helpers.ts`:**

```typescript
// src/utils.ts
export const formatDate = (date: Date) => {
  return date.toLocaleDateString();
};

// src/components/Dashboard.tsx
import { formatDate } from '../utils';
```

**After renaming** (Linker automatically updates):

```typescript
// src/helpers.ts
export const formatDate = (date: Date) => {
  return date.toLocaleDateString();
};

// src/components/Dashboard.tsx
import { formatDate } from '../helpers';  // ✅ Updated!
```

---

### Example 2: Moving a Folder

**Before renaming `src/services` → `src/api`:**

```typescript
// src/components/UserList.tsx
import { fetchUsers } from '../services/userService';
import { deleteUser } from '../services/userService';
```

**After renaming** (Linker automatically updates):

```typescript
// src/components/UserList.tsx
import { fetchUsers } from '../api/userService';  // ✅ Updated!
import { deleteUser } from '../api/userService';  // ✅ Updated!
```

---

### Example 3: TypeScript Path Aliases

**Configuration in `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "~/components/*": ["components/*"]
    }
  }
}
```

**Before renaming `src/utils` → `src/helpers`:**

```typescript
// src/pages/Home.tsx
import { validateEmail } from '@/utils/validators';
```

**After renaming** (Linker resolves aliases and updates):

```typescript
// src/pages/Home.tsx
import { validateEmail } from '@/helpers/validators';  // ✅ Updated!
```

---

## ⚙️ Configuration

### Recommended Settings

Open VS Code Settings (`Ctrl+,`) and search for **"Linker"**, or add to your `settings.json`:

```json
{
  "linker.exclude": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**"
  ],
  "linker.fileExtensions": ["js", "ts", "jsx", "tsx", "mjs", "cjs"],
  "linker.git.enabled": true,
  "linker.git.autoStage": true,
  "linker.performance.debounceDelay": 500
}
```

### All Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `linker.exclude` | `string[]` | `['**/node_modules/**', '**/.git/**']` | Glob patterns to exclude from scanning |
| `linker.fileExtensions` | `string[]` | `['js', 'ts', 'jsx', 'tsx']` | File extensions to scan for imports |
| `linker.git.enabled` | `boolean` | `true` | Use git mv for tracked files |
| `linker.git.autoStage` | `boolean` | `true` | Auto-stage import updates |
| `linker.performance.debounceDelay` | `number` | `500` | Delay in ms before processing renames |
| `linker.performance.batchSize` | `number` | `50` | Files to process per batch |
| `linker.performance.cacheTTL` | `number` | `300000` | Cache time-to-live in ms (5 min) |
| `linker.performance.enableProgressReporting` | `boolean` | `true` | Show progress for large operations |

### Performance Tuning by Project Size

<details>
<summary><b>Small Project</b> (&lt; 100 files)</summary>

```json
{
  "linker.performance.debounceDelay": 200,
  "linker.performance.batchSize": 100
}
```
</details>

<details>
<summary><b>Medium Project</b> (100-500 files)</summary>

```json
{
  "linker.performance.debounceDelay": 500,
  "linker.performance.batchSize": 50
}
```
</details>

<details>
<summary><b>Large Project</b> (500+ files)</summary>

```json
{
  "linker.performance.debounceDelay": 1000,
  "linker.performance.batchSize": 25,
  "linker.exclude": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/*.test.{js,ts,jsx,tsx}",
    "**/*.spec.{js,ts,jsx,tsx}"
  ]
}
```
</details>

---

## 🎓 Supported Import Patterns

Linker recognizes and updates all common JavaScript/TypeScript import patterns:

```javascript
// ✅ ES6 Named Imports
import { foo, bar } from './utils';

// ✅ ES6 Namespace Imports
import * as helpers from './helpers';

// ✅ ES6 Default Imports
import React from 'react';
import Component from './Component';

// ✅ CommonJS Require
const utils = require('./utils');
const { helper } = require('../helpers');

// ✅ Dynamic Imports
const module = await import('./dynamic');
import('./lazy').then(m => m.default);

// ✅ Re-exports
export { something } from './other';
export * from './all';

// ✅ TypeScript Path Aliases
import { Button } from '@/components/Button';
import { useAuth } from '~/hooks/useAuth';
```

---

## 🔧 Advanced Features

### Git Integration

When enabled, Linker uses `git mv` instead of regular file system moves:

```json
{
  "linker.git.enabled": true,
  "linker.git.autoStage": true
}
```

**Benefits:**
- ✅ Preserves git file history
- ✅ Auto-stages modified files
- ✅ Works seamlessly with git workflows
- ✅ Better handling of merge conflicts

### Exclude Patterns

Skip unnecessary directories to improve performance:

```json
{
  "linker.exclude": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/coverage/**",
    "**/__tests__/**",
    "**/*.test.{js,ts,jsx,tsx}",
    "**/*.spec.{js,ts,jsx,tsx}"
  ]
}
```

---

## 🐛 Troubleshooting

<details>
<summary><b>Imports not updating after rename</b></summary>

**Possible causes:**
1. File extension not included in `linker.fileExtensions`
2. File excluded by `linker.exclude` patterns
3. Unsupported import syntax

**Solutions:**
- Check your configuration settings
- Verify file extension is in the list
- Reload VS Code window: `Ctrl+Shift+P` → "Reload Window"
</details>

<details>
<summary><b>Performance issues with large projects</b></summary>

**Solutions:**
1. Increase debounce delay:
   ```json
   { "linker.performance.debounceDelay": 1000 }
   ```
2. Reduce batch size:
   ```json
   { "linker.performance.batchSize": 25 }
   ```
3. Add more exclusion patterns
4. Disable progress reporting for very large projects
</details>

<details>
<summary><b>Git auto-stage not working</b></summary>

**Checklist:**
- ✅ Ensure `linker.git.enabled` is `true`
- ✅ Ensure `linker.git.autoStage` is `true`
- ✅ Verify file is tracked by Git (not untracked/new)
- ✅ Check Git is initialized in your project
</details>

<details>
<summary><b>TypeScript aliases not resolving</b></summary>

**Requirements:**
- ✅ `tsconfig.json` exists in project root
- ✅ `baseUrl` is properly configured
- ✅ `paths` are properly defined
- ✅ Alias pattern matches your tsconfig

**Try:** Reload VS Code window after updating `tsconfig.json`
</details>

---

## 📚 Documentation

- **[USER-GUIDE.md](./USER-GUIDE.md)** — Comprehensive user guide with examples
- **[CHANGELOG.md](./CHANGELOG.md)** — Version history and release notes
- **[LICENSE](./LICENSE)** — MIT License

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report bugs** — [Open an issue](https://github.com/soumen0818/Linker/issues)
2. **Request features** — Share your ideas
3. **Submit PRs** — Fix bugs or add features
4. **Improve docs** — Help make documentation better

### Development Setup

```bash
# Clone the repository
git clone https://github.com/soumen0818/Linker.git
cd Linker

# Install dependencies
npm install

# Build the extension
npm run build

# Run in development mode
# Press F5 in VS Code to open Extension Development Host
```

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Support This Project

If you find **Linker** useful, please consider:

- ⭐ **Star this repository** on GitHub
- 📢 **Share** it with your team and friends
- 💬 **Leave a review** on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=linkerdev.import-linker)
- 🐛 **Report bugs** to help improve the extension
- 💡 **Request features** you'd like to see

---

## 🔗 Links

- **Marketplace:** [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=linkerdev.import-linker)
- **Repository:** [GitHub](https://github.com/soumen0818/Linker)
- **Issues:** [Report a Bug](https://github.com/soumen0818/Linker/issues)
- **Changelog:** [View Releases](https://github.com/soumen0818/Linker/blob/main/CHANGELOG.md)

---

<div align="center">

**Made with ❤️ for the developer community**

**Version 1.0.0** | [⬆ Back to Top](#-linker)

</div>

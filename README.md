<div align="center">

# 🔗 Linker

### Intelligent Import Management for Multi-Language Projects

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/linkerdev.import-linker?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=linkerdev.import-linker)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/linkerdev.import-linker?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=linkerdev.import-linker)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/linkerdev.import-linker?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=linkerdev.import-linker)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

![Linker Demo](images/linker-logo.png)

**Never break imports again** — Automatically update all import statements when you rename or move files and folders.

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Languages](#-supported-languages) • [Configuration](#%EF%B8%8F-configuration) • [Documentation](#-documentation)

</div>

---

## ⚠️ Large Codebase? READ THIS FIRST

If your project has **1,000+ files**, add these settings to `.vscode/settings.json`:

```json
{
  "linker.performance.maxFilesToScan": 8000,
  "linker.performance.maxConcurrentFiles": 10,
  "linker.exclude": ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"]
}
```

**Then reload VS Code**. See [EMERGENCY-FIX.md](EMERGENCY-FIX.md) for detailed setup.

---

## ✨ Features

### 🎯 Phase 2 - Production Ready

Linker has reached Phase 2 with enterprise-grade features for professional development workflows.

#### 🔄 **Smart Import Updates**
- Automatically detect and update imports when files or folders are renamed
- Works across your entire workspace instantly
- Preserves your code formatting style (quotes, semicolons, indentation)

#### 📊 **Visual Diff Preview**
- See all import changes before applying them
- Side-by-side or inline diff view with syntax highlighting
- One-click apply or cancel with full control

#### ⏮️ **Complete Undo/Redo System**
- Full history tracking for all import changes
- Keyboard shortcuts: `Ctrl+Alt+Z` (undo) / `Ctrl+Alt+Y` (redo)
- History preserved across VS Code sessions
- Configurable history limit (default: 50 entries)

#### 🌐 **Multi-Language Support**
- **JavaScript/TypeScript** — ES6 imports, CommonJS require, dynamic imports
- **Python** — `import` and `from...import` statements with dot notation
- **Go** — Single and block import statements
- **CSS/SCSS/LESS** — `@import` and `@import url()` statements

#### 🎨 **Advanced Path Resolution**
- **TypeScript/JavaScript path aliases** — `@/`, `~/`, custom tsconfig.json paths
- **Python path aliases** — Auto-detects src/, app/, lib/ structures, pyproject.toml support
- **Go module paths** — go.mod module paths and replace directives
- **CSS build tool aliases** — webpack, vite, parcel `@` and `~` aliases
- Relative imports (`./`, `../`)
- Absolute imports
- Nested folder structures

> **🎯 USP:** Only extension with **full alias support across ALL 4 languages!**

#### ⚡ **Performance Optimized**
- **Production-ready for large codebases** — Handles 50,000+ files
- **Smart scanning** with configurable limits (default: 10,000 files)
- **File size filtering** — Automatically skips oversized files
- **Operation timeouts** — Prevents hanging on massive projects
- **Dynamic concurrency** — Adjusts based on workspace size
- **Workspace analysis** — Auto-detects and optimizes for large projects
- File caching to avoid redundant reads
- Batch processing for optimal performance

💡 **Having issues with large projects?** See configuration settings below

#### 🔧 **Git Integration**
- Automatic `git mv` for tracked files
- Optional auto-staging of modified files
- Works seamlessly with your Git workflow

---

## 📦 Installation

### Method 1: VS Code Marketplace (Recommended)

1. Open **Visual Studio Code**
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
3. Search for **"Linker"** or **"Import Linker"**
4. Click **Install**

### Method 2: Command Line

```bash
code --install-extension linkerdev.import-linker
```

### Method 3: Manual Installation

1. Download the `.vsix` file from [Releases](https://github.com/soumen0818/Linker/releases)
2. Open VS Code
3. Go to Extensions (`Ctrl+Shift+X`)
4. Click `...` menu → `Install from VSIX...`
5. Select the downloaded file

---

## 🚀 Quick Start

### Basic Usage (3 Steps)

1. **Rename a file or folder** in VS Code Explorer
   - Right-click → Rename or press `F2`

2. **Review the preview** showing which imports will be updated
   - Visual diff shows before/after comparison
   - See exactly which files will be modified

3. **Click "Apply"** to update all imports
   - All imports updated instantly across your workspace
   - Or click "Cancel" to abort

**That's it!** ✅ No configuration needed to get started.

### Your First Rename

Try this simple example:

1. Create two files:
   ```typescript
   // utils.ts
   export const hello = () => "Hello!";
   
   // app.ts
   import { hello } from './utils';
   ```

2. Rename `utils.ts` → `helpers.ts`

3. Watch Linker automatically update `app.ts`:
   ```typescript
   import { hello } from './helpers'; // ✅ Updated!
   ```

---

## 🌐 Supported Languages

### JavaScript / TypeScript
```typescript
// ES6 imports
import { Component } from './Component';
import * as utils from '@/utils';  // ✅ Path aliases supported!

// CommonJS
const helper = require('../helper');

// Dynamic imports
const module = await import('./module');
```

**Alias Support:** Reads `tsconfig.json` for path mappings (`@/*`, `~/*`, etc.)

### Python
```python
# Absolute imports
from utils.helpers import format_date
import utils.helpers

# Relative imports
from .helpers import format_date
from ..utils import helpers

# Path aliases (NEW!)
from @.models.user import User  # ✅ Alias support!
```

**Alias Support:** Auto-detects `src/`, `app/`, `lib/` directories, or reads `pyproject.toml`

### Go
```go
// Single imports
import "project/utils"

// Block imports
import (
    "fmt"
    "github.com/user/myproject/utils"  // ✅ Module paths!
    "github.com/user/myproject/helpers"
)
```

**Alias Support:** Reads `go.mod` for module paths and replace directives

### CSS / SCSS / LESS
```css
/* CSS imports */
@import "partials/variables.css";
@import url("partials/mixins.css");

/* SCSS imports with aliases (NEW!) */
@import '@styles/base/reset';  /* ✅ Webpack/Vite aliases! */
@import '@assets/fonts/custom';
```

**Alias Support:** Reads `webpack.config.js` and `vite.config.js` for `@` and `~` aliases

---

## ⚙️ Configuration

Linker works out-of-the-box with smart defaults. Customize via VS Code Settings (`Ctrl+,`).

### Essential Settings

```json
{
  // File scanning
  "linker.fileExtensions": ["js", "ts", "py", "go", "css"],
  "linker.exclude": ["**/node_modules/**", "**/.git/**"],
  
  // Preview options
  "linker.preview.diffView": true,
  "linker.preview.layout": "side-by-side",
  
  // Formatting preferences
  "linker.formatting.quoteStyle": "auto",
  "linker.formatting.semicolons": "auto",
  
  // History management
  "linker.history.enabled": true,
  "linker.history.maxEntries": 50,
  
  // Language toggles
  "linker.multiLanguage.python": true,
  "linker.multiLanguage.python.aliasSupport": true,  // NEW!
  "linker.multiLanguage.go": true,
  "linker.multiLanguage.go.aliasSupport": true,      // NEW!
  "linker.multiLanguage.css": true,
  "linker.multiLanguage.css.aliasSupport": true,     // NEW!
  
  // Git integration
  "linker.autoStageChanges": false
}
```

### Quick Settings Guide

| Setting | Description | Default |
|---------|-------------|---------|
| `fileExtensions` | File types to scan | All supported |
| `exclude` | Patterns to ignore | node_modules, .git |
| `preview.diffView` | Show visual preview | `true` |
| `preview.layout` | Diff layout style | `side-by-side` |
| `formatting.quoteStyle` | Quote preference | `auto` |
| `formatting.semicolons` | Semicolon usage | `auto` |
| `history.enabled` | Enable undo/redo | `true` |
| `history.maxEntries` | History limit | `50` |
| `autoStageChanges` | Auto-stage in Git | `false` |

**See [USER_GUIDE.md](USER_GUIDE.md) for detailed configuration options.**

---

## 🎯 Multi-Language Alias Support

**NEW in v1.3.0:** Linker now supports path aliases across ALL 4 languages!

### TypeScript/JavaScript Aliases

**Configuration:** `tsconfig.json`
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "~/*": ["src/*"]
    }
  }
}
```

**Example:**
```typescript
import { Button } from '@/components/Button';  // Before rename
import { ButtonNew } from '@/components/ButtonNew';  // After rename ✅
```

### Python Aliases

**Configuration:** `pyproject.toml` (optional)
```toml
[tool.linker.paths]
app = "src"
models = "src/models"
utils = "src/utils"
```

**Auto-Detection:** Linker automatically detects `src/`, `app/`, `lib/`, `utils/` directories

**Example:**
```python
from @.models.user import User  # Before rename
from @.models.account import User  # After rename ✅
```

### Go Aliases

**Configuration:** `go.mod`
```go
module github.com/user/myproject

replace github.com/user/myproject/old => ./new
```

**Example:**
```go
import "github.com/user/myproject/models"  // Before rename
import "github.com/user/myproject/entities"  // After rename ✅
```

### CSS Aliases

**Configuration:** `webpack.config.js` or `vite.config.js`
```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@assets': path.resolve(__dirname, 'src/assets')
    }
  }
};
```

**Example:**
```scss
@import '@styles/variables';  // Before rename
@import '@styles/theme';  // After rename ✅
```

---

## 💡 Examples

### Example 1: Simple File Rename

**Scenario:** Rename `utils.ts` → `helpers.ts`

```typescript
// Before
// src/utils.ts
export const formatDate = () => { /* ... */ };

// src/app.ts
import { formatDate } from './utils';
```

**After** (Linker auto-updates):
```typescript
// src/app.ts
import { formatDate } from './helpers'; // ✅ Updated!
```

### Example 2: Folder Rename

**Scenario:** Rename `services/` → `api/`

```typescript
// Before
import { fetchUsers } from '../services/userService';

// After (Linker auto-updates)
import { fetchUsers } from '../api/userService'; // ✅ Updated!
```

### Example 3: Python Imports

**Scenario:** Rename `helpers.py` → `utilities.py`

```python
# Before
from utils.helpers import format_date

# After (Linker auto-updates)
from utils.utilities import format_date  # ✅ Updated!
```

### Example 4: CSS Imports

**Scenario:** Rename `variables.css` → `vars.css`

```css
/* Before */
@import "partials/variables.css";

/* After (Linker auto-updates) */
@import "partials/vars.css";  /* ✅ Updated! */
```

---

## ⌨️ Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Undo last import changes | `Ctrl+Alt+Z` | `Cmd+Alt+Z` |
| Redo import changes | `Ctrl+Alt+Y` | `Cmd+Alt+Y` |
| Show import history | `Ctrl+Shift+P` → "Linker: Show History" | Same |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/soumen0818/Linker/issues)
- **Discussions:** [GitHub Discussions](https://github.com/soumen0818/Linker/discussions)
- **Documentation:** [Complete User Guide](USER_GUIDE.md)

---

## 🌟 Show Your Support

If Linker saves you time, please:
- ⭐ Star the [GitHub repository](https://github.com/soumen0818/Linker)
- ⭐ Rate on [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=linkerdev.import-linker)
- 💬 Share with your team

---

## 📊 Project Status

**Current Version:** 1.1.2 (Phase 2)  
**Status:** Production Ready ✅  
**Languages:** 4 (JavaScript/TypeScript, Python, Go, CSS)  
**Active Development:** Yes  
**Last Updated:** November 2025

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

<details>
<summary><strong>❌ Python imports not working / Pylance conflict</strong></summary>

**Problem:** Pylance and Linker both try to update Python imports, causing conflicts.

**Solution:** Linker automatically disables Pylance's auto-import features. If issues persist:

```json
// .vscode/settings.json
{
  "python.analysis.autoImportCompletions": false,
  "python.analysis.autoFormatStrings": false
}
```

**Full documentation:** See [PYLANCE-CONFLICT.md](./Doc/PYLANCE-CONFLICT.md)
</details>

---

## 📚 Documentation

- **[USER-GUIDE.md](./USER-GUIDE.md)** — Comprehensive user guide with examples
- **[PYLANCE-CONFLICT.md](./Doc/PYLANCE-CONFLICT.md)** — Python/Pylance conflict resolution (NEW!)
- **[TESTING-GUIDE.md](./Doc/TESTING-GUIDE.md)** — Multi-language testing guide (NEW!)
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

**Version 1.1.3** | [⬆ Back to Top](#-linker)

</div>

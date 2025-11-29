# Contributing to Linker

Thank you for your interest in contributing to Linker! We welcome contributions from the community and are grateful for any help you can provide.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

---

## Code of Conduct

This project and everyone participating in it is governed by our commitment to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

### Our Standards

- **Be respectful** of differing viewpoints and experiences
- **Be collaborative** and work together to improve the project
- **Be patient** with newcomers and help them learn
- **Be constructive** when giving or receiving feedback

---

## How Can I Contribute?

### 🐛 Reporting Bugs

Found a bug? Help us fix it!

1. **Search existing issues** to avoid duplicates
2. **Use the bug report template** when creating a new issue
3. **Include detailed information**:
   - VS Code version
   - Linker extension version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots or error messages

### 💡 Suggesting Enhancements

Have an idea to improve Linker?

1. **Check existing feature requests** first
2. **Open a new issue** with the enhancement label
3. **Describe your idea clearly**:
   - What problem does it solve?
   - How would it work?
   - Why is it valuable?
   - Any implementation ideas?

### 📝 Improving Documentation

Documentation improvements are always welcome!

- Fix typos or unclear explanations
- Add examples or use cases
- Translate documentation
- Update outdated information

### 💻 Contributing Code

Ready to write code? Great!

- Fix bugs from the issue tracker
- Implement new features
- Improve performance
- Add tests
- Refactor code

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** (v16 or higher)
- **npm** (v7 or higher)
- **Git**
- **VS Code** (v1.75.0 or higher)
- **TypeScript** knowledge

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Linker.git
   cd Linker
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/soumen0818/Linker.git
   ```

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### 3. Open in VS Code

```bash
code .
```

### 4. Run the Extension

1. Press `F5` or go to **Run > Start Debugging**
2. A new VS Code window (Extension Development Host) will open
3. The extension is now running in debug mode
4. You can set breakpoints and debug your code

### 5. Watch Mode (Auto-compile)

For development, use watch mode:

```bash
npm run watch
```

This automatically recompiles TypeScript when you save files.

---

## Project Structure

```
Linker/
├── src/                          # Source code
│   ├── extension.ts              # Main entry point
│   ├── renameHandler.ts          # File rename detection and handling
│   ├── importScanner.ts          # Import statement detection
│   ├── multiLanguageScanner.ts   # Multi-language import scanning
│   ├── aliasResolver.ts          # TypeScript alias resolution
│   ├── pythonAliasResolver.ts    # Python alias resolution
│   ├── goAliasResolver.ts        # Go module path resolution
│   ├── cssAliasResolver.ts       # CSS build tool alias resolution
│   ├── formatter.ts              # Code formatting preservation
│   ├── diffViewProvider.ts       # Preview UI with diff view
│   ├── historyManager.ts         # Undo/redo functionality
│   ├── gitIntegration.ts         # Git integration (git mv)
│   ├── pathUtils.ts              # Path manipulation utilities
│   ├── config.ts                 # Configuration management
│   └── performance.ts            # Performance optimization
│
├── dist/                         # Compiled JavaScript (generated)
├── images/                       # Extension icons and assets
├── Doc/                          # Documentation files
│
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
├── README.md                     # Main documentation
├── CHANGELOG.md                  # Version history
├── CONTRIBUTING.md               # This file
└── LICENSE                       # MIT License
```

### Key Files Explained

**`extension.ts`**
- Extension activation and deactivation
- Command registration
- Settings configuration prompt

**`renameHandler.ts`**
- Listens for file rename events
- Orchestrates the import update process
- Handles both files and folders

**`importScanner.ts`**
- Scans files for import statements
- Language-agnostic import detection
- Delegates to language-specific scanners

**`multiLanguageScanner.ts`**
- JavaScript/TypeScript imports (ES6, CommonJS, dynamic)
- Python imports (absolute, relative, dot notation)
- Go imports (single, block, with aliases)
- CSS imports (@import, @import url)

**`aliasResolver.ts`** (and language-specific resolvers)
- Resolves path aliases from config files
- TypeScript: reads `tsconfig.json`
- Python: reads `pyproject.toml`
- Go: reads `go.mod`
- CSS: reads `webpack.config.js`, `vite.config.js`

**`diffViewProvider.ts`**
- Creates WebView preview UI
- Displays before/after diff
- Handles apply/cancel actions
- Responsive design

**`historyManager.ts`**
- Tracks all import changes
- Implements undo/redo stack
- Stores operation history

**`gitIntegration.ts`**
- Git repository detection
- `git mv` for tracked files
- Auto-staging (optional)

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Write clean, readable code
- Follow the coding guidelines (see below)
- Add comments for complex logic
- Update documentation if needed

### 3. Test Your Changes

```bash
# Build the project
npm run build

# Run in debug mode (F5 in VS Code)
# Test all affected functionality
# Try edge cases
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature description"
```

**Commit Message Format:**
```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: add support for Vue.js imports
fix: resolve alias paths in nested folders
docs: update README with Python examples
refactor: improve import scanning performance
```

### 5. Push Your Changes

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

1. Go to GitHub and open a Pull Request
2. Fill in the PR template
3. Link related issues
4. Wait for review

---

## Coding Guidelines

### TypeScript Style

**General Rules:**
- Use **TypeScript** for all new code
- Follow existing code style
- Use **4 spaces** for indentation
- Use **single quotes** for strings
- Add **JSDoc comments** for public functions
- Use **meaningful variable names**

**Example:**

```typescript
/**
 * Scans a file for import statements
 * @param filePath - Absolute path to the file
 * @param language - Programming language of the file
 * @returns Array of import information objects
 */
async function scanImports(filePath: string, language: string): Promise<ImportInfo[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const imports: ImportInfo[] = [];
    
    // Scan based on language
    switch (language) {
        case 'typescript':
        case 'javascript':
            return scanJavaScriptImports(content, filePath);
        case 'python':
            return scanPythonImports(content, filePath);
        default:
            return [];
    }
}
```

### Code Organization

**Do:**
- ✅ Keep functions small and focused
- ✅ Use async/await instead of callbacks
- ✅ Handle errors gracefully
- ✅ Add comments for complex logic
- ✅ Extract reusable code into utilities

**Don't:**
- ❌ Use `any` type (use proper types)
- ❌ Leave console.log statements
- ❌ Ignore TypeScript errors
- ❌ Write functions longer than 50 lines
- ❌ Nest callbacks more than 2 levels

### Error Handling

Always handle errors gracefully:

```typescript
try {
    const result = await someOperation();
    return result;
} catch (error) {
    vscode.window.showErrorMessage(`Failed to perform operation: ${error.message}`);
    console.error('Detailed error:', error);
    return null;
}
```

### Performance Considerations

- Use **smart caching** to avoid redundant reads
- Implement **debouncing** for file system events
- Process files in **batches** for large codebases
- Respect **configurable limits** (maxFilesToScan, etc.)
- Use **async/await** for I/O operations

---

## Testing

### Manual Testing

Before submitting a PR, test your changes thoroughly:

**Test Checklist:**
- [ ] Test with JavaScript/TypeScript files
- [ ] Test with Python files
- [ ] Test with Go files
- [ ] Test with CSS/SCSS files
- [ ] Test file renames
- [ ] Test folder renames
- [ ] Test with path aliases
- [ ] Test undo/redo functionality
- [ ] Test preview UI
- [ ] Test with large codebases (1000+ files)
- [ ] Test edge cases (empty files, no imports, etc.)

### Test Scenarios

**Scenario 1: Basic File Rename**
1. Create two files: `utils.ts` and `app.ts`
2. Import utils in app: `import { helper } from './utils'`
3. Rename `utils.ts` to `helpers.ts`
4. Verify preview shows correct change
5. Apply and verify import updated

**Scenario 2: Folder Rename**
1. Create folder `services/` with file `userService.ts`
2. Import in another file: `import { getUser } from './services/userService'`
3. Rename `services/` to `api/`
4. Verify all imports updated

**Scenario 3: Path Aliases**
1. Configure tsconfig.json with paths
2. Use alias imports: `import { Button } from '@/components/Button'`
3. Rename the file
4. Verify alias import updated correctly

**Scenario 4: Multi-Language**
1. Create project with JS, Python, Go, CSS files
2. Set up imports in each language
3. Rename files and folders
4. Verify all languages handled correctly

### Debugging

**Enable Extension Development Tools:**

1. Open Extension Development Host window
2. Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Opt+I` (Mac)
3. View console logs and errors
4. Use debugger breakpoints in VS Code

**Useful Debug Commands:**

```typescript
// Log to Debug Console
console.log('Debug info:', variable);

// Show information message
vscode.window.showInformationMessage('Test message');

// Check extension logs
// Help > Toggle Developer Tools > Console tab
```

---

## Submitting Changes

### Pull Request Process

1. **Ensure your PR**:
   - Follows the coding guidelines
   - Includes appropriate documentation
   - Has been tested thoroughly
   - Has clear commit messages

2. **PR Description Should Include**:
   - What changes were made
   - Why these changes were needed
   - How to test the changes
   - Screenshots (if UI changes)
   - Related issue numbers

3. **PR Template**:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Tested with JavaScript/TypeScript
- [ ] Tested with Python
- [ ] Tested with Go
- [ ] Tested with CSS
- [ ] Tested undo/redo
- [ ] Tested preview UI

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Fixes #123
Related to #456
```

4. **Review Process**:
   - Maintainer will review your PR
   - Address any feedback or requested changes
   - Once approved, your PR will be merged

### After Your PR is Merged

1. **Update your local repository**:
   ```bash
   git checkout main
   git pull upstream main
   ```

2. **Delete your feature branch**:
   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

3. **Celebrate!** 🎉 You've contributed to Linker!

---

## Reporting Bugs

### Before Submitting a Bug Report

- **Check existing issues** for duplicates
- **Try the latest version** of the extension
- **Disable other extensions** to rule out conflicts
- **Reproduce the bug** consistently

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what the bug is

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment:**
- OS: [e.g., Windows 11, macOS 14]
- VS Code Version: [e.g., 1.85.0]
- Linker Version: [e.g., 1.1.6]
- Project Type: [e.g., TypeScript React]

**Additional context**
Any other relevant information
```

---

## Suggesting Enhancements

### Enhancement Request Template

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
What you want to happen

**Describe alternatives you've considered**
Other solutions you thought about

**Use Case**
Real-world scenario where this would help

**Additional context**
Mockups, examples, or relevant information
```

---

## Community

### Get Help

- **GitHub Issues**: Ask questions or report problems
- **Discussions**: Share ideas and get feedback
- **Email**: Contact the maintainer at [your-email]

### Stay Updated

- **Watch the repository** for updates
- **Star the project** to show support
- **Follow on GitHub** for notifications

---

## Recognition

Contributors will be recognized in:
- **README.md** - Contributors section
- **Release notes** - Mentioned in changelog
- **GitHub insights** - Contributor graph

---

## License

By contributing to Linker, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

## Questions?

If you have any questions about contributing, feel free to:
- Open an issue with the `question` label
- Reach out to the maintainer
- Start a discussion on GitHub

---

**Thank you for contributing to Linker! Your help makes this project better for everyone.** 🚀

---

*Last updated: November 2025*

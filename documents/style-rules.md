# Style Rules

## Code Formatting with Prettier

This project uses [Prettier](https://prettier.io/) to ensure consistent code
formatting across all files. Prettier is an opinionated code formatter that
supports TypeScript, JavaScript, JSON, and Markdown.

### Prettier Configuration

The project's Prettier configuration is defined in `.prettierrc` at the root
of the repository with the following settings:

- **Single Quotes**: `true` - Use single quotes instead of double quotes
- **Tab Width**: `4` - Use 4 spaces for indentation
- **Semicolons**: `true` - Always add semicolons at the end of statements
- **Trailing Commas**: `es5` - Add trailing commas where valid in ES5
  (objects, arrays, etc.)
- **Print Width**: `80` - Wrap lines at 80 characters
- **Arrow Function Parentheses**: `always` - Always include parentheses around
  arrow function parameters
- **End of Line**: `lf` - Use Unix-style line endings (LF)
- **Use Tabs**: `false` - Use spaces instead of tabs

### Running Prettier

#### Format All Files

To format all TypeScript, JavaScript, JSON, and Markdown files in the project:

```bash
npm run format
```

This command will automatically fix formatting issues in all matching files.

#### Check Formatting Without Changes

To check if files are formatted correctly without modifying them:

```bash
npm run format:check
```

This is useful for CI/CD pipelines to verify that all code is properly formatted.

### Best Practices

- **Run Prettier before committing**: Always format your code before creating
  a commit to maintain consistency
- **Editor Integration**: Consider installing the Prettier extension for your
  code editor to format files automatically on save
- **Don't fight Prettier**: Prettier is opinionated by design. Trust its
  formatting decisions to avoid bikeshedding discussions

### Files Covered

Prettier is configured to format the following file types:

- TypeScript (`.ts`)
- JavaScript (`.js`)
- JSON (`.json`)
- Markdown (`.md`)

## Markdown Linting with markdownlint

This project uses [markdownlint](https://github.com/DavidAnson/markdownlint)
to enforce consistent Markdown formatting and best practices. Markdownlint
helps catch common issues and ensures documentation is well-formatted.

### Markdownlint Configuration

The project uses the default markdownlint rules defined in
`.markdownlint.json` at the root of the repository. This configuration
includes all standard rules such as:

- **MD001**: Heading levels should only increment by one level at a time
- **MD003**: Heading style (consistent heading format)
- **MD004**: Unordered list style (consistent bullet characters)
- **MD005**: List indent (consistent indentation)
- **MD007**: Unordered list indentation (proper nesting)
- **MD009**: Trailing spaces (no trailing whitespace)
- **MD010**: Hard tabs (use spaces instead of tabs)
- **MD011**: Reversed link syntax
- **MD012**: Multiple consecutive blank lines
- **MD013**: Line length (maximum 80 characters by default)
- And many more...

For a complete list of rules, see the
[markdownlint rules documentation](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md).

### Running Markdownlint

#### Check All Markdown Files

To check all Markdown files for linting issues:

```bash
npm run lint:md
```

This command will report any formatting or style violations found in your
Markdown files.

#### Auto-fix Markdown Issues

To automatically fix issues that can be corrected:

```bash
npm run lint:md:fix
```

Note: Some issues (like line length violations) may need to be fixed manually
as they require content decisions.

### Markdownlint Best Practices

- **Run markdownlint before committing**: Check your Markdown files before
  creating a commit to ensure documentation quality
- **Fix issues promptly**: Address linting errors as they appear rather than
  letting them accumulate
- **Break long lines**: Keep lines under 80 characters for better readability
- **Use consistent formatting**: Let markdownlint guide you toward consistent
  Markdown style
- **Editor Integration**: Consider installing a markdownlint extension for your
  code editor to see issues in real-time


# PromptVault JavaScript SDK

A lightweight JavaScript/Node.js client for the PromptVault API that provides an elegant interface without dealing with HTTP requests directly.

## Installation

```bash
npm install ./javascript-sdk
```

Or copy the `promptvault.js` file directly into your project.

## Quick Start

```javascript
import PromptVault from 'promptvault-js';

// Configure once
const pv = new PromptVault({
  baseUrl: 'https://your-replit-url.replit.dev',
  apiKey: 'your_api_key'
});

// Method 1: Elegant dot notation (recommended)
const prompt = await pv.agents_lextenso.research_manager();
console.log(prompt.toString());

// Method 2: Function call syntax
const prompt2 = await pv.getPrompt('research-manager', 'agents-lextenso');
console.log(prompt2.toString());

// Method 3: With version specification
const promptV1 = await pv.getPrompt('research-manager', 'agents-lextenso', 1);

// Method 4: Variable substitution
const rendered = prompt.render({
  user_name: 'John Doe',
  topic: 'contract law'
});
```

## Features

- **No HTTP requests in your code**: The SDK handles all API communication internally
- **Elegant dot notation**: Access prompts like `pv.project_name.prompt_name()`
- **Template variables**: Built-in support for `${variable}` substitution
- **Version control**: Access specific prompt versions
- **Promise-based**: Uses modern async/await syntax
- **Error handling**: Clear error messages and proper exception handling
- **TypeScript compatible**: Works with TypeScript projects

## Template Variables

Use `${variable}` syntax in your prompts:

```javascript
// In your prompt: "Hello ${user_name}, please analyze ${topic}"
const rendered = prompt.render({
  user_name: 'Alice',
  topic: 'market trends'
});
// Result: "Hello Alice, please analyze market trends"
```

## Browser Usage

For browser usage, you may need to handle CORS and use a bundler like Webpack or Vite:

```html
<script type="module">
  import PromptVault from './promptvault.js';
  
  const pv = new PromptVault({
    baseUrl: 'https://your-app.replit.dev',
    apiKey: 'your_api_key'
  });
  
  // Use the SDK...
</script>
```

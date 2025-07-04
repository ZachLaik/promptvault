# PromptVault Python SDK

The simplest way to use prompts from your Prompt Manager in Python code.

## Installation

```bash
pip install promptvault
```

Or install from GitHub:
```bash
pip install git+https://github.com/your-username/promptvault.git
```

## Quick Start

```python
import promptvault

# Configure once (at app startup)
promptvault.configure(
    base_url="https://your-replit-url.replit.dev",
    api_key="your_api_key"
)

# Use elegant dot notation to access prompts
prompt = promptvault.agents_lextenso.research_manager

# That's it! Use the prompt content
print(prompt)
```

## Features

✅ **Elegant syntax**: `promptvault.project_name.prompt_name`  
✅ **Automatic latest version**: Always get the most recent prompt  
✅ **Simple configuration**: One-time setup  
✅ **Error handling**: Clear error messages  
✅ **Caching**: Requests are cached for performance  

## Advanced Usage

### Get Specific Versions
```python
# For specific versions, use the function syntax
specific_prompt = promptvault.get_prompt("research-manager", "agents-lextenso", version=3)
```

### Environment Variables
```python
import os
import promptvault

promptvault.configure(
    base_url=os.getenv("PROMPT_MANAGER_URL"),
    api_key=os.getenv("PROMPT_MANAGER_API_KEY")
)
```

### With OpenAI
```python
import promptvault
import openai

# Configure
promptvault.configure(base_url="...", api_key="...")
openai.api_key = "your_openai_key"

# Use prompt with OpenAI
system_prompt = promptvault.agents_lextenso.research_manager

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "What are contract termination rules?"}
    ]
)
print(response.choices[0].message.content)
```

## Naming Conventions

- Project slugs like `agents-lextenso` become `agents_lextenso`
- Prompt slugs like `research-manager` become `research_manager`
- Underscores in Python are automatically converted to hyphens for the API

## Error Handling

```python
try:
    prompt = promptvault.my_project.my_prompt
except ValueError as e:
    print(f"Configuration or access error: {e}")
except Exception as e:
    print(f"Network or API error: {e}")
```

## Requirements

- Python 3.7+
- requests library (automatically installed)

That's all you need to get started!
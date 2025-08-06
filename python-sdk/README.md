# PromptVault Python SDK

The simplest way to use prompts from your Prompt Manager in Python code.

## Installation

```bash
# Install from GitHub (replace with your actual repository URL)
pip install git+https://github.com/ZachLaik/prompt-manager.git#subdirectory=python-sdk

# Or clone and install locally
git clone https://github.com/ZachLaik/prompt-manager.git
cd prompt-manager/python-sdk
pip install -e .
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
prompt_template = promptvault.agents_lextenso.research_manager

# Use as-is (backward compatible)
print(prompt_template)

# Or render with variables
rendered_prompt = prompt_template.render(
    user_name="John Doe",
    topic="contract termination",
    urgency="high"
)
```

## Features

✅ **Elegant syntax**: `promptvault.project_name.prompt_name`  
✅ **Variable substitution**: Easy template rendering with `.render()`  
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

### Variable Substitution
```python
# In your prompt content, use {variable_name} placeholders:
# "You are a {role} assistant. Help with {task}: {user_question}"

prompt_template = promptvault.customer_support.chat_assistant

# Render with variables
rendered = prompt_template.render(
    role="customer service",
    task="billing questions", 
    user_question="How do I cancel my subscription?"
)

print(rendered)
# Output: "You are a customer service assistant. Help with billing questions: How do I cancel my subscription?"
```

### With OpenAI
```python
import promptvault
import openai

# Configure
promptvault.configure(base_url="...", api_key="...")
openai.api_key = "your_openai_key"

# Use prompt with variables
template = promptvault.agents_lextenso.research_manager
system_prompt = template.render(
    expertise="contract law",
    focus_area="termination clauses",
    detail_level="comprehensive"
)

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
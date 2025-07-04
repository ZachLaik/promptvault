# Prompt Manager - Python Integration

This Prompt Manager provides multiple ways to integrate prompts into your Python applications. Choose the method that best fits your needs.

## Option 1: PromptVault SDK (Recommended)

The easiest way to use prompts with elegant syntax:

### Installation
```bash
pip install git+https://github.com/ZachLaik/promptvault.git
```

### Usage
```python
import promptvault

# Configure once
promptvault.configure(
    base_url="https://your-replit-url.replit.dev",
    api_key="your_api_key"
)

# Use elegant dot notation
prompt = promptvault.agents_lextenso.research_manager

# That's it! Use the prompt content
print(prompt)
```

### Features
- ✅ **Elegant syntax**: `promptvault.project_name.prompt_name`
- ✅ **One-time setup**: Configure once, use everywhere  
- ✅ **Latest version**: Always get the most recent prompt
- ✅ **Error handling**: Clear error messages
- ✅ **Specific versions**: `promptvault.get_prompt("slug", "project", version=3)`

## Option 2: Direct HTTP API (30 seconds)

For developers who prefer direct API calls:

```python
import requests

def get_prompt(slug, project_slug, api_key, base_url):
    """Fetch a prompt from Prompt Manager"""
    response = requests.get(
        f"{base_url}/api/prompts/{slug}",
        headers={"x-api-key": api_key},
        params={"projectSlug": project_slug}
    )
    return response.json()["content"]

# Usage
prompt = get_prompt(
    slug="research-manager",
    project_slug="agents-lextenso", 
    api_key="your_api_key",
    base_url="https://your-replit-url.replit.dev"
)

print(prompt)  # Your full prompt content ready to use
```

## Real-World Examples

### With PromptVault SDK + OpenAI

```python
import promptvault
import openai

# Setup
promptvault.configure(
    base_url="https://your-replit-url.replit.dev",
    api_key="your_api_key"
)
openai.api_key = "your_openai_key"

# Use elegant syntax directly
system_prompt = promptvault.agents_lextenso.research_manager

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "What are contract termination rules in French law?"}
    ]
)

print(response.choices[0].message.content)
```

### With Direct HTTP API + OpenAI

```python
import requests
import openai

def get_prompt(slug, project_slug, api_key, base_url):
    response = requests.get(
        f"{base_url}/api/prompts/{slug}",
        headers={"x-api-key": api_key},
        params={"projectSlug": project_slug}
    )
    return response.json()["content"]

# Use with OpenAI
system_prompt = get_prompt(
    "research-manager", 
    "agents-lextenso",
    "your_api_key",
    "https://your-replit-url.replit.dev"
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

## Getting Started

### Step 1: Get Your API Key
1. Log into your Prompt Manager
2. Go to API Keys section  
3. Generate a new API key

### Step 2: Choose Your Integration Method
- **Recommended**: Use the PromptVault SDK for elegant syntax
- **Alternative**: Use direct HTTP calls for more control

### Step 3: Start Using Prompts
Both methods support:
- ✅ **Latest Version**: Always get the most recent prompt
- ✅ **Specific Versions**: Access any version with `version=N` 
- ✅ **Error Handling**: Clear error messages and status codes
- ✅ **Performance**: Built-in request optimization

## API Documentation

For complete API reference and testing, visit your Prompt Manager's Swagger UI at:
`https://your-replit-url.replit.dev/docs`

Ready to get started? Choose Option 1 (PromptVault SDK) for the best developer experience!

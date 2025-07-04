# Python Integration Guide

The easiest way for developers to include prompts in their Python code is through a simple HTTP request to your Prompt Manager API.

## Quick Start (30 seconds)

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
    api_key="pk_752b437b3cfa01f9913a930c9734bcb600db30a1606fa291a3a67140b8be4978",
    base_url="https://c8c51686-0d9b-4c30-bcd2-157601544ed8-00-gf8yvovkz2td.riker.replit.dev"
)

print(prompt)  # Your full prompt content ready to use
```

## With OpenAI Integration

```python
import requests
import openai

class PromptManager:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key
    
    def get_prompt(self, slug, project_slug):
        response = requests.get(
            f"{self.base_url}/api/prompts/{slug}",
            headers={"x-api-key": self.api_key},
            params={"projectSlug": project_slug}
        )
        return response.json()["content"]

# Initialize
pm = PromptManager(
    base_url="https://your-replit-url.replit.dev",
    api_key="your_api_key"
)

# Use with OpenAI
def ask_legal_question(question):
    system_prompt = pm.get_prompt("research-manager", "agents-lextenso")
    
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question}
        ]
    )
    return response.choices[0].message.content

# Example
answer = ask_legal_question("What are the contract termination rules in French law?")
print(answer)
```

## Features Available

- ✅ **Latest Version**: Always get the most recent prompt version
- ✅ **Specific Versions**: Add `version=N` parameter for specific versions  
- ✅ **Metadata**: Get title, author, creation date, and version info
- ✅ **Caching**: Implement client-side caching for better performance
- ✅ **Error Handling**: Proper HTTP status codes and error messages

## Installation

```bash
pip install requests openai  # or your preferred AI library
```

That's it! Your developers can now easily fetch and use your managed prompts in any Python application.
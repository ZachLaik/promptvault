"""
PromptVault - Simple Python client for Prompt Manager API

Usage:
    import promptvault

    # Configure once
    promptvault.configure(
        base_url="https://your-replit-url.replit.dev",
        api_key="your_api_key"
    )

    # Use elegant syntax to access prompts
    prompt = promptvault.agents_lextenso.research_manager

    # Or access with strings if needed
    prompt = promptvault.get_prompt("research-manager", "agents-lextenso")
"""

import os
import requests
from typing import Optional, Dict, Any


# Global configuration
_config = {
    'base_url': None,
    'api_key': None
}


def configure(base_url: str, api_key: str):
    """
    Configure PromptVault with your API credentials

    Args:
        base_url: Your Prompt Manager base URL (e.g., "https://your-app.replit.dev")
        api_key: Your API key from the Prompt Manager
    """
    global _config
    _config['base_url'] = base_url.rstrip('/')
    _config['api_key'] = api_key


class PromptTemplate:
    """A prompt template that supports variable substitution"""

    def __init__(self, content: str):
        self.content = content

    def render(self, **variables) -> str:
        """
        Render the prompt with variables using string formatting

        Args:
            **variables: Variable name-value pairs to substitute

        Returns:
            The rendered prompt with variables substituted
        """
        try:
            return self.content.format(**variables)
        except KeyError as e:
            raise ValueError(f"Missing variable: {e}")

    def __str__(self) -> str:
        """Return raw content when used as string"""
        return self.content


def get_prompt(slug: str, project_slug: str, version: Optional[int] = None) -> PromptTemplate:
    """
    Fetch a prompt from the Prompt Manager API

    Args:
        slug: The prompt slug
        project_slug: The project slug  
        version: Optional version number (defaults to latest)

    Returns:
        A PromptTemplate object that supports variable substitution

    Raises:
        ValueError: If not configured or prompt not found
        Exception: For network or API errors
    """
    if not _config['base_url'] or not _config['api_key']:
        raise ValueError("PromptVault not configured. Call promptvault.configure() first.")

    params = {'projectSlug': project_slug}
    if version:
        params['version'] = version

    try:
        response = requests.get(
            f"{_config['base_url']}/api/prompts/{slug}",
            headers={'x-api-key': _config['api_key']},
            params=params,
            timeout=30
        )

        if response.status_code == 404:
            raise ValueError(f"Prompt '{slug}' not found in project '{project_slug}'")
        elif response.status_code == 403:
            raise ValueError(f"Access denied to project '{project_slug}'")
        elif response.status_code != 200:
            raise Exception(f"API request failed: {response.status_code}")

        data = response.json()
        return PromptTemplate(data['content'])

    except requests.RequestException as e:
        raise Exception(f"Network error: {e}")


class PromptProxy:
    """Proxy class to enable dot notation access to prompts"""

    def __init__(self, project_slug: str):
        self._project_slug = project_slug

    def __getattr__(self, name: str) -> PromptTemplate:
        # Convert python attribute name to kebab-case for API
        slug = name.replace('_', '-')
        return get_prompt(slug, self._project_slug)


class PromptVaultModule:
    """Main module class that provides dot notation access"""

    def __getattr__(self, name: str) -> PromptProxy:
        # Convert python attribute name to kebab-case for project slug
        project_slug = name.replace('_', '-')
        return PromptProxy(project_slug)

    def configure(self, base_url: str, api_key: str):
        """Configure PromptVault (alias for module-level configure)"""
        configure(base_url, api_key)

    def get_prompt(self, slug: str, project_slug: str, version: Optional[int] = None) -> PromptTemplate:
        """Get a prompt (alias for module-level get_prompt)"""
        return get_prompt(slug, project_slug, version)


# Create the module instance that will be imported
import sys
sys.modules[__name__] = PromptVaultModule()
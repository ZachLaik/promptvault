#!/usr/bin/env python3
"""
Example usage of the PromptVault Python SDK
"""

import promptvault

def main():
    # Configure the client with your Prompt Manager
    promptvault.configure(
        base_url="https://c8c51686-0d9b-4c30-bcd2-157601544ed8-00-gf8yvovkz2td.riker.replit.dev",
        api_key="pk_752b437b3cfa01f9913a930c9734bcb600db30a1606fa291a3a67140b8be4978"
    )
    
    print("=== PromptVault Example ===\n")
    
    # Method 1: Elegant dot notation (recommended)
    print("1. Using dot notation:")
    try:
        prompt = promptvault.agents_lextenso.research_manager
        print(f"✅ Prompt fetched successfully!")
        print(f"📝 Content preview: {prompt[:100]}...")
        print(f"📊 Full length: {len(prompt)} characters\n")
    except Exception as e:
        print(f"❌ Error: {e}\n")
    
    # Method 2: Function call syntax
    print("2. Using function syntax:")
    try:
        prompt = promptvault.get_prompt("research-manager", "agents-lextenso")
        print(f"✅ Prompt fetched successfully!")
        print(f"📝 Content preview: {prompt[:100]}...")
        print(f"📊 Full length: {len(prompt)} characters\n")
    except Exception as e:
        print(f"❌ Error: {e}\n")
    
    # Method 3: With version specification
    print("3. Getting specific version:")
    try:
        prompt_v1 = promptvault.get_prompt("research-manager", "agents-lextenso", version=1)
        print(f"✅ Version 1 fetched successfully!")
        print(f"📝 Content preview: {prompt_v1[:100]}...")
        print(f"📊 Full length: {len(prompt_v1)} characters\n")
    except Exception as e:
        print(f"❌ Error: {e}\n")

if __name__ == "__main__":
    main()
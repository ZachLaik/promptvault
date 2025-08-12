#!/usr/bin/env python3
"""
Example usage of the PromptVault Python SDK
"""

import promptvault

def main():
    # Configure the client with your Prompt Manager
    promptvault.configure(
        base_url="https://prompting-manager.replit.app",
        api_key="pk_752b437b3cfa01f9913a930c9734bcb600db30a1606fa291a3a67140b8be4978"
    )
    
    print("=== PromptVault Example ===\n")
    
    # Method 1: Elegant dot notation (recommended)
    print("1. Using dot notation:")
    try:
        prompt_template = promptvault.agents_research-agents.research_manager
        print(f"✅ Prompt template fetched successfully!")
        print(f"📝 Raw content preview: {str(prompt_template)[:100]}...")
        print(f"📊 Full length: {len(str(prompt_template))} characters\n")
        
        # Example with variables
        if "{" in str(prompt_template):
            print("🔧 Template contains variables - rendering with example data:")
            rendered = prompt_template.render(
                user_name="John Doe",
                topic="contract law",
                urgency="high"
            )
            print(f"📝 Rendered preview: {rendered[:100]}...")
        
    except Exception as e:
        print(f"❌ Error: {e}\n")
    
    # Method 2: Function call syntax
    print("2. Using function syntax:")
    try:
        prompt = promptvault.get_prompt("research-manager", "agents-research-agents")
        print(f"✅ Prompt fetched successfully!")
        print(f"📝 Content preview: {prompt[:100]}...")
        print(f"📊 Full length: {len(prompt)} characters\n")
    except Exception as e:
        print(f"❌ Error: {e}\n")
    
    # Method 3: With version specification
    print("3. Getting specific version:")
    try:
        prompt_v1 = promptvault.get_prompt("research-manager", "agents-research-agents", version=1)
        print(f"✅ Version 1 fetched successfully!")
        print(f"📝 Content preview: {prompt_v1[:100]}...")
        print(f"📊 Full length: {len(prompt_v1)} characters\n")
    except Exception as e:
        print(f"❌ Error: {e}\n")

if __name__ == "__main__":
    main()
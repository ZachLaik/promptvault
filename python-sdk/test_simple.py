#!/usr/bin/env python3
"""
Simple test of the PromptVault syntax
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

try:
    import promptvault
    print("✅ PromptVault imported successfully")
    
    # Test configuration
    promptvault.configure(
        base_url="https://c8c51686-0d9b-4c30-bcd2-157601544ed8-00-gf8yvovkz2td.riker.replit.dev",
        api_key="pk_752b437b3cfa01f9913a930c9734bcb600db30a1606fa291a3a67140b8be4978"
    )
    print("✅ Configuration successful")
    
    # Test the syntax we want
    print("✅ Syntax test: promptvault.agents_lextenso.research_manager")
    print("✅ Package ready for use!")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
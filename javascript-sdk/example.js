
/**
 * Example usage of the PromptVault JavaScript SDK
 */

import PromptVault from './promptvault.js';

async function main() {
  // Configure the client with your Prompt Manager
  const pv = new PromptVault({
    baseUrl: 'https://prompting-manager.replit.app',
    apiKey: 'pk_752b437b3cfa01f9913a930c9734bcb600db30a1606fa291a3a67140b8be4978'
  });

  console.log('=== PromptVault JavaScript Example ===\n');

  // Method 1: Elegant dot notation (recommended)
  console.log('1. Using dot notation:');
  try {
    const promptTemplate = await pv.agents_research-agents.research_manager();
    console.log('✅ Prompt template fetched successfully!');
    console.log(`📝 Raw content preview: ${promptTemplate.toString().slice(0, 100)}...`);
    console.log(`📊 Full length: ${promptTemplate.toString().length} characters\n`);

    // Example with variables using ${variable} syntax
    if (promptTemplate.toString().includes('${')) {
      console.log('🔧 Template contains variables - rendering with example data:');
      const rendered = promptTemplate.render({
        user_name: 'John Doe',
        topic: 'contract law',
        urgency: 'high'
      });
      console.log(`📝 Rendered preview: ${rendered.slice(0, 100)}...`);
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Method 2: Function call syntax
  console.log('2. Using function syntax:');
  try {
    const prompt = await pv.getPrompt('research-manager', 'agents-research-agents');
    console.log('✅ Prompt fetched successfully!');
    console.log(`📝 Content preview: ${prompt.toString().slice(0, 100)}...`);
    console.log(`📊 Full length: ${prompt.toString().length} characters\n`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Method 3: With version specification
  console.log('3. Getting specific version:');
  try {
    const promptV1 = await pv.getPrompt('research-manager', 'agents-research-agents', 1);
    console.log('✅ Version 1 fetched successfully!');
    console.log(`📝 Content preview: ${promptV1.toString().slice(0, 100)}...`);
    console.log(`📊 Full length: ${promptV1.toString().length} characters\n`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Method 4: Creating a new prompt version
  console.log('4. Creating a new prompt version:');
  try {
    const newVersion = await pv.createPromptVersion(
      'test-prompt',
      'agents-research-agents',
      'This is a test prompt with ${variable} support',
      'Added variable support'
    );
    console.log('✅ New version created successfully!');
    console.log(`📝 Version: ${newVersion.version}`);
    console.log(`📝 Message: ${newVersion.message}`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }
}

// Run the example
main().catch(console.error);

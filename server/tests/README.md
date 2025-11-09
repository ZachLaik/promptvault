
# PromptVault API Tests

This directory contains comprehensive tests for all PromptVault API endpoints.

## Setup

1. **Get your API key** from the PromptVault dashboard (API Keys page)

2. **Set the environment variable**:
   ```bash
   export PROMPTVAULT_API_KEY="pk_your_api_key_here"
   ```

3. **Install dependencies** (if not already installed):
   ```bash
   npm install --save-dev @jest/globals ts-jest jest @types/jest
   ```

4. **Run the tests**:
   ```bash
   npm test
   ```

## Test Coverage

The test suite covers:

### Project Endpoints
- ✅ Create new project
- ✅ List all projects
- ✅ Authentication validation
- ✅ Duplicate slug prevention

### Prompt Endpoints
- ✅ Create new prompt
- ✅ Get latest prompt version
- ✅ Create new prompt version
- ✅ Get specific prompt version
- ✅ List all versions
- ✅ List prompts in project
- ✅ Authentication validation
- ✅ 404 handling for non-existent prompts/versions

### Edge Cases
- ✅ Missing project slug
- ✅ Invalid API key
- ✅ Empty prompt content
- ✅ Template variable handling

## Running Individual Tests

```bash
# Run only project tests
npm test -- --testNamePattern="Project Endpoints"

# Run only prompt tests
npm test -- --testNamePattern="Prompt Endpoints"

# Run with coverage
npm test -- --coverage
```

## Notes

- Tests create temporary projects and prompts with timestamps to avoid conflicts
- All test data is created under your account using your API key
- Tests run against the local development server at http://0.0.0.0:5000
- Make sure the development server is running before executing tests

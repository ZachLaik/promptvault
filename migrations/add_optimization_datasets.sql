-- Add user_openrouter_keys table for storing encrypted API keys
CREATE TABLE IF NOT EXISTS user_openrouter_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for user_openrouter_keys
CREATE INDEX IF NOT EXISTS idx_user_openrouter_keys_user_id ON user_openrouter_keys(user_id);

-- Add optimization_datasets table for reusable Q&A examples
CREATE TABLE IF NOT EXISTS optimization_datasets (
    id SERIAL PRIMARY KEY,
    prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    examples TEXT NOT NULL,  -- JSON array of {question, answer}
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for optimization_datasets
CREATE INDEX IF NOT EXISTS idx_optimization_datasets_prompt_id ON optimization_datasets(prompt_id);

-- Add dataset_id column to prompt_optimizations to link to a dataset
ALTER TABLE prompt_optimizations
ADD COLUMN IF NOT EXISTS dataset_id INTEGER REFERENCES optimization_datasets(id) ON DELETE SET NULL;

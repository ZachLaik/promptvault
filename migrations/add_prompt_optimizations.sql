-- Add prompt_optimizations table for storing DSPy optimization runs
-- This migration adds the ability to track prompt optimization history

CREATE TABLE IF NOT EXISTS prompt_optimizations (
    id SERIAL PRIMARY KEY,
    prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    prompt_version_id INTEGER REFERENCES prompt_versions(id) ON DELETE SET NULL,
    original_content TEXT NOT NULL,
    optimized_content TEXT,
    qa_examples TEXT NOT NULL,  -- JSON string of [{question, answer}]
    settings TEXT NOT NULL,     -- JSON string of optimization settings
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
    baseline_score TEXT,        -- Score before optimization (stored as text for precision)
    optimized_score TEXT,       -- Score after optimization
    iterations TEXT,            -- JSON string of iteration details with judge remarks
    error_message TEXT,         -- Error message if optimization failed
    author_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_prompt_optimizations_prompt_id ON prompt_optimizations(prompt_id);
CREATE INDEX idx_prompt_optimizations_author_id ON prompt_optimizations(author_id);
CREATE INDEX idx_prompt_optimizations_status ON prompt_optimizations(status);
CREATE INDEX idx_prompt_optimizations_created_at ON prompt_optimizations(created_at DESC);


-- Add GitHub fields to users table
ALTER TABLE users 
ADD COLUMN github_id VARCHAR(255),
ADD COLUMN github_access_token TEXT;

-- Create index on github_id for faster lookups
CREATE INDEX idx_users_github_id ON users(github_id);

-- Make password nullable for GitHub users
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

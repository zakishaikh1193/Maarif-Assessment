-- Create settings table for SSO configuration
CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY DEFAULT 1,
    sso_enabled TINYINT(1) DEFAULT 0,
    sso_secret_key VARCHAR(255) NULL,
    moodle_url VARCHAR(500) NULL,
    power_school_enabled TINYINT(1) DEFAULT 0,
    power_school_url VARCHAR(500) NULL,
    power_school_client_id VARCHAR(255) NULL,
    power_school_client_secret VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings row
INSERT INTO settings (id, sso_enabled, sso_secret_key, moodle_url, power_school_enabled, power_school_url, power_school_client_id, power_school_client_secret) 
VALUES (1, 0, NULL, NULL, 0, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE id = id;

-- Add PowerSchool columns if they don't exist (for existing installations)
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS power_school_enabled TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS power_school_url VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS power_school_client_id VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS power_school_client_secret VARCHAR(255) NULL;


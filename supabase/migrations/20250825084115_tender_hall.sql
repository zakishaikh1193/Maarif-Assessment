-- Maarif-Style Adaptive Assessment Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS map_assessment;
USE map_assessment;

-- Users table for both admins and students
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Questions table with enhanced fields
CREATE TABLE IF NOT EXISTS questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    question_text TEXT NOT NULL,
    options JSON NOT NULL,
    correct_option_index INT NOT NULL,
    difficulty_level INT NOT NULL CHECK (difficulty_level BETWEEN 100 AND 350),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_subject_difficulty (subject_id, difficulty_level)
);

-- Assessments table for tracking student tests
CREATE TABLE IF NOT EXISTS assessments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    assessment_period ENUM('Fall', 'Winter', 'Spring') NOT NULL,
    final_score INT,
    total_questions INT DEFAULT 10,
    correct_answers INT DEFAULT 0,
    date_taken TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INT,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_subject_period (student_id, subject_id, assessment_period),
    INDEX idx_student_subject (student_id, subject_id)
);

-- Assessment responses for detailed tracking
CREATE TABLE IF NOT EXISTS assessment_responses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assessment_id INT NOT NULL,
    question_id INT NOT NULL,
    question_order INT NOT NULL,
    selected_option_index INT,
    is_correct BOOLEAN,
    response_time_seconds INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Insert default subjects
INSERT INTO subjects (name, description) VALUES 
('Math', 'Mathematics assessment covering various mathematical concepts'),
('Reading', 'Reading comprehension and language arts assessment'),
('Science', 'Science concepts and scientific reasoning assessment')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, role, first_name, last_name) VALUES 
('admin', '$2a$10$8K1p/a0dRT..X.TApq0uIe4k8QX6VBgqMO8ibZTQDTYVz6VtCZcDW', 'admin', 'System', 'Administrator')
ON DUPLICATE KEY UPDATE username=VALUES(username);

-- Insert sample students (password: student123)
INSERT INTO users (username, password, role, first_name, last_name) VALUES 
('student1', '$2a$10$8K1p/a0dRT..X.TApq0uIe4k8QX6VBgqMO8ibZTQDTYVz6VtCZcDW', 'student', 'John', 'Doe'),
('student2', '$2a$10$8K1p/a0dRT..X.TApq0uIe4k8QX6VBgqMO8ibZTQDTYVz6VtCZcDW', 'student', 'Jane', 'Smith')
ON DUPLICATE KEY UPDATE username=VALUES(username);
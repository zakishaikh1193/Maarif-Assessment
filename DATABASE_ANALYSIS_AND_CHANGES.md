# Database Analysis and Changes for Multi-Mode Assessment System

## Current Database Structure Analysis

### Key Tables and Their Relationships

#### 1. **assessments** Table
- **Purpose**: Stores individual assessment instances taken by students
- **Key Fields**:
  - `id`: Primary key
  - `student_id`: Links to student user
  - `subject_id`: Subject being assessed
  - `grade_id`: Student's grade level
  - `assessment_period`: Fall/Winter/Spring
  - `total_questions`: Number of questions in assessment
  - `correct_answers`: Number of correct responses
  - `rit_score`: Growth Metric score (adaptive algorithm result)
  - `time_limit_minutes`: Time limit for assessment
  - `year`: Academic year

- **Current Behavior**: 
  - All assessments are currently **Adaptive**
  - Questions are selected dynamically based on student responses
  - Next question difficulty is adjusted based on previous answer correctness

#### 2. **questions** Table
- **Purpose**: Stores all questions in the question bank
- **Key Fields**:
  - `id`: Primary key
  - `subject_id`: Subject category
  - `grade_id`: Target grade level
  - `question_text`: The question content
  - `options`: JSON array of answer options (currently only MCQ)
  - `correct_option_index`: Index of correct answer (0-based)
  - `difficulty_level`: RIT difficulty level (100-350 range)
  - `primary_competency_id`: Main competency this question tests

- **Current Behavior**:
  - Only supports MCQ (Multiple Choice Questions)
  - Options stored as JSON array: `["option1", "option2", "option3", "option4"]`

#### 3. **assessment_responses** Table
- **Purpose**: Links assessments to questions with student responses
- **Key Fields**:
  - `assessment_id`: Links to assessment
  - `question_id`: Links to question
  - `question_order`: Order in which question was presented
  - `selected_option_index`: Student's selected answer
  - `is_correct`: Whether answer was correct
  - `response_time_seconds`: Time taken to answer
  - `question_difficulty`: Difficulty level when question was shown

- **Current Behavior**:
  - Questions are added dynamically as student progresses
  - Order is determined by adaptive algorithm

#### 4. **assessment_configurations** Table
- **Purpose**: Stores default settings for assessments per grade-subject
- **Key Fields**:
  - `grade_id`: Grade level
  - `subject_id`: Subject
  - `time_limit_minutes`: Default time limit
  - `question_count`: Default number of questions
  - `is_active`: Whether configuration is active

- **Current Behavior**:
  - Used for Adaptive assessments only
  - Determines starting parameters for adaptive algorithm

### Current Adaptive Assessment Flow

1. **Start Assessment**:
   - Student selects subject and period
   - System checks `assessment_configurations` for grade-subject settings
   - Looks up previous RIT score to determine starting difficulty
   - Creates assessment record in `assessments` table
   - Selects first question based on starting difficulty

2. **Answer Submission**:
   - Student submits answer
   - System records response in `assessment_responses`
   - Calculates next question difficulty based on:
     - Current difficulty level
     - Whether answer was correct
     - Progressive adjustment algorithm
   - Selects next question closest to target difficulty
   - Excludes already-used questions

3. **Completion**:
   - Final RIT score calculated based on highest correct difficulty
   - Assessment marked as complete
   - Results stored in `assessments` table

## Required Changes for Multi-Mode System

### Overview
The system needs to support two distinct modes:

1. **Adaptive Mode** (Existing):
   - Questions selected dynamically
   - Difficulty adjusted based on responses
   - No pre-selection of questions

2. **Standard Mode** (New):
   - Questions pre-selected from question bank
   - Fixed question set and order
   - Admin creates assignment templates
   - Students take assigned assessments

### Database Changes Summary

#### 1. **assessments Table Changes**
```sql
-- Add mode field
assessment_mode ENUM('Standard', 'Adaptive') DEFAULT 'Adaptive'

-- Link to assignment template (for Standard mode)
assignment_id INT NULL
```

**Rationale**:
- `assessment_mode`: Distinguishes between the two modes
- `assignment_id`: Links Standard assessments to their template (assignment)

#### 2. **questions Table Changes**
```sql
-- Support multiple question types
question_type ENUM('MCQ', 'TrueFalse', 'Matching', ...) DEFAULT 'MCQ'

-- For non-MCQ question types
correct_answer TEXT NULL  -- JSON for complex answers
question_metadata JSON NULL  -- Additional data for question types
```

**Rationale**:
- Future-proofing for multiple question types
- Allows different answer formats beyond MCQ

#### 3. **New Table: assignments**
**Purpose**: Stores Standard mode assignment templates created by admins

**Key Fields**:
- `id`: Primary key
- `name`: Assignment name/title
- `subject_id`: Subject
- `grade_id`: Target grade (optional)
- `created_by`: Admin who created it
- `time_limit_minutes`: Time limit
- `total_questions`: Number of questions
- `is_active`: Whether available
- `is_published`: Whether visible to students

**Rationale**:
- Admins create assignment templates
- Templates define which questions and in what order
- Can be published/unpublished
- Can be grade-specific or general

#### 4. **New Table: assignment_questions**
**Purpose**: Links questions to assignments with specific order

**Key Fields**:
- `assignment_id`: Links to assignment
- `question_id`: Links to question
- `question_order`: Order in assignment (1, 2, 3, ...)
- `points`: Points for correct answer

**Rationale**:
- Defines exact question set for Standard assessments
- Maintains order (important for Standard mode)
- Allows point weighting per question

#### 5. **New Table: assignment_students** (Optional)
**Purpose**: Allows targeted assignment distribution

**Key Fields**:
- `assignment_id`: Links to assignment
- `student_id`: Links to student
- `assigned_by`: Admin who assigned it
- `due_date`: Optional deadline
- `is_completed`: Completion status

**Rationale**:
- Admins can assign specific assignments to specific students
- Track completion
- Set deadlines

#### 6. **assessment_configurations Table Changes**
```sql
-- Default mode for grade-subject combination
default_mode ENUM('Standard', 'Adaptive') DEFAULT 'Adaptive'
```

**Rationale**:
- Allows setting default mode per grade-subject
- Can be overridden when creating assignments

## Data Flow Comparison

### Adaptive Mode (Current)
```
Student starts assessment
  ↓
System creates assessment record (mode='Adaptive')
  ↓
System selects first question based on starting difficulty
  ↓
Student answers → System records response
  ↓
System calculates next difficulty → Selects next question
  ↓
Repeat until question_count reached
  ↓
Calculate final RIT score
```

### Standard Mode (New)
```
Admin creates assignment template
  ↓
Admin selects questions from bank → Creates assignment_questions records
  ↓
Admin publishes assignment (or assigns to specific students)
  ↓
Student starts assessment → System creates assessment (mode='Standard', assignment_id=X)
  ↓
System loads questions from assignment_questions in order
  ↓
Student answers → System records response
  ↓
Next question from pre-selected list
  ↓
Repeat until all questions answered
  ↓
Calculate score based on points
```

## Key Differences

| Aspect | Adaptive Mode | Standard Mode |
|--------|--------------|---------------|
| **Question Selection** | Dynamic, based on responses | Pre-selected, fixed order |
| **Question Order** | Determined by algorithm | Defined in assignment |
| **Difficulty** | Adjusts based on performance | Fixed (question's difficulty_level) |
| **Scoring** | RIT score (Growth Metric) | Points-based or percentage |
| **Creation** | System-generated | Admin-created templates |
| **Flexibility** | Adapts to student level | Same for all students |

## Migration Strategy

1. **Backward Compatibility**:
   - All existing assessments default to 'Adaptive'
   - All existing questions default to 'MCQ'
   - No data loss

2. **Gradual Rollout**:
   - Add Standard mode support
   - Keep Adaptive mode fully functional
   - Admins can create Standard assignments
   - Students can take either type

3. **Future Enhancements**:
   - Multiple question types (True/False, Matching, etc.)
   - Question type support in both modes
   - Enhanced scoring for Standard mode

## Indexes Added

Performance indexes added for:
- Finding assessments by mode
- Finding assignments by subject/grade
- Finding questions by type
- Linking assignments to questions efficiently
- Student-assignment relationships

## Next Steps

1. **Execute Migration**: Run `migration_add_standard_mode.sql`
2. **Update Backend**: Modify controllers to handle both modes
3. **Update Frontend**: Add UI for creating/managing Standard assignments
4. **Testing**: Test both modes independently
5. **Question Types**: Implement support for different question types

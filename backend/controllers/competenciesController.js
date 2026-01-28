import { executeQuery } from '../config/database.js';

// Helper function to check for circular reference
const checkCircularReference = async (competencyId, parentId) => {
  if (!parentId || parentId === 0) return false;
  if (competencyId === parentId) return true;
  
  // Check if parentId is an ancestor of competencyId
  let currentParentId = parentId;
  const visited = new Set([competencyId]);
  
  while (currentParentId && currentParentId !== 0) {
    if (visited.has(currentParentId)) return true;
    visited.add(currentParentId);
    
    const parent = await executeQuery(
      'SELECT parent_id FROM competencies WHERE id = ?',
      [currentParentId]
    );
    
    if (parent.length === 0) break;
    currentParentId = parent[0].parent_id || 0;
  }
  
  return false;
};

// Helper function to recursively fetch all descendants of a competency
const getAllDescendants = async (parentId, allCompetencies) => {
  const descendants = [];
  const children = allCompetencies.filter(c => (c.parent_id || 0) === parentId);
  
  for (const child of children) {
    descendants.push(child);
    const grandChildren = await getAllDescendants(child.id, allCompetencies);
    descendants.push(...grandChildren);
  }
  
  return descendants;
};

// Get all competencies with pagination (only top-level competencies are paginated)
export const getAllCompetencies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.search || '';

    // Validate and sanitize limit and offset
    const validatedLimit = Math.max(1, Math.min(1000, limit));
    const validatedOffset = Math.max(0, offset);

    // Get all competencies first (needed for finding descendants and search logic)
    const allCompetencies = await executeQuery(`
      SELECT id, parent_id, code, name, description, strong_threshold, neutral_threshold, is_active, created_at, updated_at 
      FROM competencies 
      ORDER BY code ASC
    `);

    let topLevelCompetenciesToPaginate = [];
    let searchParams = [];
    
    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`;
      searchParams = [searchPattern, searchPattern, searchPattern];
      
      // Find all competencies that match the search
      const matchingCompetencies = allCompetencies.filter(c => 
        c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      // Find all top-level competencies that either:
      // 1. Match the search themselves, OR
      // 2. Have a descendant that matches the search
      const matchingIds = new Set(matchingCompetencies.map(c => c.id));
      
      // Helper to check if a competency has a matching descendant
      const hasMatchingDescendant = (compId) => {
        const children = allCompetencies.filter(c => (c.parent_id || 0) === compId);
        for (const child of children) {
          if (matchingIds.has(child.id)) return true;
          if (hasMatchingDescendant(child.id)) return true;
        }
        return false;
      };
      
      // Get all top-level competencies
      topLevelCompetenciesToPaginate = allCompetencies.filter(c => 
        (c.parent_id === 0 || c.parent_id === null) &&
        (matchingIds.has(c.id) || hasMatchingDescendant(c.id))
      );
    } else {
      // No search - get all top-level competencies
      topLevelCompetenciesToPaginate = allCompetencies.filter(c => 
        c.parent_id === 0 || c.parent_id === null
      );
    }

    // Get total count of top-level competencies (after search filtering)
    const total = topLevelCompetenciesToPaginate.length;

    // Apply pagination to top-level competencies
    const paginatedTopLevel = topLevelCompetenciesToPaginate.slice(
      validatedOffset,
      validatedOffset + validatedLimit
    );

    // For each paginated top-level competency, get all its descendants
    const resultCompetencies = [];
    for (const topLevel of paginatedTopLevel) {
      resultCompetencies.push(topLevel);
      
      // Get all descendants of this top-level competency
      const descendants = await getAllDescendants(topLevel.id, allCompetencies);
      
      // If searching, filter descendants to only show those that match the search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const filteredDescendants = descendants.filter(desc => 
          desc.code?.toLowerCase().includes(searchLower) ||
          desc.name?.toLowerCase().includes(searchLower) ||
          desc.description?.toLowerCase().includes(searchLower)
        );
        resultCompetencies.push(...filteredDescendants);
      } else {
        resultCompetencies.push(...descendants);
      }
    }

    const totalPages = Math.ceil(total / limit);

    res.json({
      competencies: resultCompetencies,
      pagination: {
        currentPage: page,
        totalPages,
        total, // Total count of top-level competencies
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching competencies:', error);
    res.status(500).json({ error: 'Failed to fetch competencies', code: 'FETCH_COMPETENCIES_ERROR' });
  }
};

// Get active competencies only
export const getActiveCompetencies = async (req, res) => {
  try {
    const competencies = await executeQuery(
      'SELECT id, parent_id, code, name, description, strong_threshold, neutral_threshold FROM competencies WHERE is_active = 1 ORDER BY code ASC'
    );
    res.json(competencies);
  } catch (error) {
    console.error('Error fetching active competencies:', error);
    res.status(500).json({ error: 'Failed to fetch active competencies', code: 'FETCH_ACTIVE_COMPETENCIES_ERROR' });
  }
};

// Get competency by ID
export const getCompetencyById = async (req, res) => {
  try {
    const { id } = req.params;
    const competencies = await executeQuery(
      'SELECT * FROM competencies WHERE id = ?',
      [id]
    );

    if (competencies.length === 0) {
      return res.status(404).json({
        error: 'Competency not found',
        code: 'COMPETENCY_NOT_FOUND'
      });
    }

    res.json(competencies[0]);
  } catch (error) {
    console.error('Error fetching competency:', error);
    res.status(500).json({ error: 'Failed to fetch competency', code: 'FETCH_COMPETENCY_ERROR' });
  }
};

// Create new competency
export const createCompetency = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      strong_description,
      neutral_description,
      growth_description,
      strong_threshold,
      neutral_threshold,
      is_active = 1,
      parent_id = 0
    } = req.body;

    // Validate parent_id
    const parentId = parent_id === null || parent_id === undefined ? 0 : parseInt(parent_id);
    
    // If parent_id is provided and not 0, verify it exists
    if (parentId !== 0) {
      const parentExists = await executeQuery(
        'SELECT id FROM competencies WHERE id = ?',
        [parentId]
      );
      
      if (parentExists.length === 0) {
        return res.status(400).json({
          error: 'Parent competency not found',
          code: 'PARENT_COMPETENCY_NOT_FOUND'
        });
      }
    }

    // Check if competency code already exists
    const existingCode = await executeQuery(
      'SELECT id FROM competencies WHERE code = ?',
      [code]
    );

    if (existingCode.length > 0) {
      return res.status(400).json({
        error: 'Competency code already exists',
        code: 'COMPETENCY_CODE_EXISTS'
      });
    }

    // Check if competency name already exists
    const existingName = await executeQuery(
      'SELECT id FROM competencies WHERE name = ?',
      [name]
    );

    if (existingName.length > 0) {
      return res.status(400).json({
        error: 'Competency name already exists',
        code: 'COMPETENCY_NAME_EXISTS'
      });
    }

    // Validate thresholds if both are provided
    if (strong_threshold !== undefined && strong_threshold !== null && strong_threshold !== '' &&
        neutral_threshold !== undefined && neutral_threshold !== null && neutral_threshold !== '') {
      const strong = typeof strong_threshold === 'string' ? parseInt(strong_threshold) : strong_threshold;
      const neutral = typeof neutral_threshold === 'string' ? parseInt(neutral_threshold) : neutral_threshold;
      if (strong <= neutral) {
        return res.status(400).json({
          error: 'Strong threshold must be greater than neutral threshold',
          code: 'INVALID_THRESHOLDS'
        });
      }
    }

    // Handle optional fields - convert empty strings to null
    const strongDesc = strong_description && strong_description.trim() !== '' ? strong_description : null;
    const neutralDesc = neutral_description && neutral_description.trim() !== '' ? neutral_description : null;
    const growthDesc = growth_description && growth_description.trim() !== '' ? growth_description : null;
    const strongThresh = (strong_threshold !== undefined && strong_threshold !== null && strong_threshold !== '') 
      ? (typeof strong_threshold === 'string' ? parseInt(strong_threshold) : strong_threshold) 
      : null;
    const neutralThresh = (neutral_threshold !== undefined && neutral_threshold !== null && neutral_threshold !== '') 
      ? (typeof neutral_threshold === 'string' ? parseInt(neutral_threshold) : neutral_threshold) 
      : null;

    const result = await executeQuery(
      `INSERT INTO competencies (
        parent_id, code, name, description, strong_description, neutral_description, 
        growth_description, strong_threshold, neutral_threshold, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [parentId, code, name, description || null, strongDesc, neutralDesc, 
       growthDesc, strongThresh, neutralThresh, is_active]
    );

    // Fetch the created competency
    const newCompetency = await executeQuery(
      'SELECT * FROM competencies WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Competency created successfully',
      competency: newCompetency[0]
    });
  } catch (error) {
    console.error('Error creating competency:', error);
    res.status(500).json({ error: 'Failed to create competency', code: 'CREATE_COMPETENCY_ERROR' });
  }
};

// Update competency
export const updateCompetency = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      description,
      strong_description,
      neutral_description,
      growth_description,
      strong_threshold,
      neutral_threshold,
      is_active,
      parent_id
    } = req.body;

    // Check if competency exists
    const existingCompetency = await executeQuery(
      'SELECT id, parent_id FROM competencies WHERE id = ?',
      [id]
    );

    if (existingCompetency.length === 0) {
      return res.status(404).json({
        error: 'Competency not found',
        code: 'COMPETENCY_NOT_FOUND'
      });
    }

    // Validate parent_id if provided
    if (parent_id !== undefined) {
      const parentId = parent_id === null || parent_id === undefined ? 0 : parseInt(parent_id);
      
      // Check for circular reference
      const hasCircularRef = await checkCircularReference(parseInt(id), parentId);
      if (hasCircularRef) {
        return res.status(400).json({
          error: 'Cannot set parent: would create circular reference',
          code: 'CIRCULAR_REFERENCE_ERROR'
        });
      }
      
      // If parent_id is provided and not 0, verify it exists
      if (parentId !== 0) {
        const parentExists = await executeQuery(
          'SELECT id FROM competencies WHERE id = ?',
          [parentId]
        );
        
        if (parentExists.length === 0) {
          return res.status(400).json({
            error: 'Parent competency not found',
            code: 'PARENT_COMPETENCY_NOT_FOUND'
          });
        }
      }
    }

    // Check if code already exists (excluding current competency)
    if (code) {
      const existingCode = await executeQuery(
        'SELECT id FROM competencies WHERE code = ? AND id != ?',
        [code, id]
      );

      if (existingCode.length > 0) {
        return res.status(400).json({
          error: 'Competency code already exists',
          code: 'COMPETENCY_CODE_EXISTS'
        });
      }
    }

    // Check if name already exists (excluding current competency)
    if (name) {
      const existingName = await executeQuery(
        'SELECT id FROM competencies WHERE name = ? AND id != ?',
        [name, id]
      );

      if (existingName.length > 0) {
        return res.status(400).json({
          error: 'Competency name already exists',
          code: 'COMPETENCY_NAME_EXISTS'
        });
      }
    }

    // Validate thresholds if both are provided
    if (strong_threshold !== undefined && strong_threshold !== null && strong_threshold !== '' &&
        neutral_threshold !== undefined && neutral_threshold !== null && neutral_threshold !== '') {
      const strong = typeof strong_threshold === 'string' ? parseInt(strong_threshold) : strong_threshold;
      const neutral = typeof neutral_threshold === 'string' ? parseInt(neutral_threshold) : neutral_threshold;
      if (strong <= neutral) {
        return res.status(400).json({
          error: 'Strong threshold must be greater than neutral threshold',
          code: 'INVALID_THRESHOLDS'
        });
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    if (parent_id !== undefined) {
      const parentId = parent_id === null || parent_id === undefined ? 0 : parseInt(parent_id);
      updateFields.push('parent_id = ?');
      updateValues.push(parentId);
    }
    if (code !== undefined) {
      updateFields.push('code = ?');
      updateValues.push(code);
    }
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (strong_description !== undefined) {
      updateFields.push('strong_description = ?');
      updateValues.push(strong_description && strong_description.trim() !== '' ? strong_description : null);
    }
    if (neutral_description !== undefined) {
      updateFields.push('neutral_description = ?');
      updateValues.push(neutral_description && neutral_description.trim() !== '' ? neutral_description : null);
    }
    if (growth_description !== undefined) {
      updateFields.push('growth_description = ?');
      updateValues.push(growth_description && growth_description.trim() !== '' ? growth_description : null);
    }
    if (strong_threshold !== undefined) {
      updateFields.push('strong_threshold = ?');
      const strongThresh = (strong_threshold !== null && strong_threshold !== '') 
        ? (typeof strong_threshold === 'string' ? parseInt(strong_threshold) : strong_threshold) 
        : null;
      updateValues.push(strongThresh);
    }
    if (neutral_threshold !== undefined) {
      updateFields.push('neutral_threshold = ?');
      const neutralThresh = (neutral_threshold !== null && neutral_threshold !== '') 
        ? (typeof neutral_threshold === 'string' ? parseInt(neutral_threshold) : neutral_threshold) 
        : null;
      updateValues.push(neutralThresh);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
        code: 'NO_FIELDS_TO_UPDATE'
      });
    }

    updateValues.push(id);

    await executeQuery(
      `UPDATE competencies SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Fetch the updated competency
    const updatedCompetency = await executeQuery(
      'SELECT * FROM competencies WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Competency updated successfully',
      competency: updatedCompetency[0]
    });
  } catch (error) {
    console.error('Error updating competency:', error);
    res.status(500).json({ error: 'Failed to update competency', code: 'UPDATE_COMPETENCY_ERROR' });
  }
};

// Delete competency
export const deleteCompetency = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if competency exists
    const existingCompetency = await executeQuery(
      'SELECT id FROM competencies WHERE id = ?',
      [id]
    );

    if (existingCompetency.length === 0) {
      return res.status(404).json({
        error: 'Competency not found',
        code: 'COMPETENCY_NOT_FOUND'
      });
    }

    // Check if competency has children
    const children = await executeQuery(
      'SELECT COUNT(*) as count FROM competencies WHERE parent_id = ?',
      [id]
    );

    if (children[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete competency that has child competencies. Please delete or reassign child competencies first.',
        code: 'COMPETENCY_HAS_CHILDREN'
      });
    }

    // Check if competency is linked to any questions
    const linkedQuestions = await executeQuery(
      'SELECT COUNT(*) as count FROM questions_competencies WHERE competency_id = ?',
      [id]
    );

    if (linkedQuestions[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete competency that is linked to questions',
        code: 'COMPETENCY_LINKED_TO_QUESTIONS'
      });
    }

    // Check if competency has any student scores
    const studentScores = await executeQuery(
      'SELECT COUNT(*) as count FROM student_competency_scores WHERE competency_id = ?',
      [id]
    );

    if (studentScores[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete competency that has student scores',
        code: 'COMPETENCY_HAS_STUDENT_SCORES'
      });
    }

    await executeQuery('DELETE FROM competencies WHERE id = ?', [id]);

    res.json({
      message: 'Competency deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting competency:', error);
    res.status(500).json({ error: 'Failed to delete competency', code: 'DELETE_COMPETENCY_ERROR' });
  }
};

// Get competency statistics
export const getCompetencyStats = async (req, res) => {
  try {
    const stats = await executeQuery(`
      SELECT 
        c.id,
        c.code,
        c.name,
        COUNT(DISTINCT qc.question_id) as questions_linked,
        COUNT(DISTINCT scs.student_id) as students_assessed,
        AVG(scs.final_score) as average_score,
        COUNT(CASE WHEN scs.feedback_type = 'strong' THEN 1 END) as strong_count,
        COUNT(CASE WHEN scs.feedback_type = 'neutral' THEN 1 END) as neutral_count,
        COUNT(CASE WHEN scs.feedback_type = 'growth' THEN 1 END) as growth_count
      FROM competencies c
      LEFT JOIN questions_competencies qc ON c.id = qc.competency_id
      LEFT JOIN student_competency_scores scs ON c.id = scs.competency_id
      GROUP BY c.id, c.code, c.name
      ORDER BY c.code ASC
    `);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching competency stats:', error);
    res.status(500).json({ error: 'Failed to fetch competency statistics', code: 'FETCH_COMPETENCY_STATS_ERROR' });
  }
};

// Get questions linked to a competency
export const getCompetencyQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    
    const questions = await executeQuery(`
      SELECT 
        q.id,
        q.question_text,
        q.difficulty_level,
        qc.weight,
        s.name as subject_name,
        q.created_at
      FROM questions q
      JOIN questions_competencies qc ON q.id = qc.question_id
      JOIN subjects s ON q.subject_id = s.id
      WHERE qc.competency_id = ?
      ORDER BY q.difficulty_level ASC
    `, [id]);

    res.json(questions);
  } catch (error) {
    console.error('Error fetching competency questions:', error);
    res.status(500).json({ error: 'Failed to fetch competency questions', code: 'FETCH_COMPETENCY_QUESTIONS_ERROR' });
  }
};

// Import competencies from CSV
export const importCompetenciesFromCSV = async (req, res) => {
  try {
    const { csvData } = req.body;

    if (!Array.isArray(csvData) || csvData.length === 0) {
      return res.status(400).json({
        error: 'CSV data is required and must be a non-empty array',
        code: 'INVALID_CSV_DATA'
      });
    }

    const success = [];
    const errors = [];
    const codeToIdMap = new Map(); // Map competency codes to their IDs (for parent mapping)

    // First, get all existing competencies to build code-to-id map
    const existingCompetencies = await executeQuery(
      'SELECT id, code FROM competencies'
    );
    existingCompetencies.forEach(comp => {
      codeToIdMap.set(comp.code, comp.id);
    });

    // Process competencies in multiple passes:
    // Pass 1: Create top-level competencies (no parent or parent doesn't exist in CSV)
    // Pass 2+: Create competencies whose parents were created in previous passes
    const processed = new Set();
    let pass = 0;
    const maxPasses = 10; // Prevent infinite loops

    while (processed.size < csvData.length && pass < maxPasses) {
      pass++;
      let progressMade = false;

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rowNumber = i + 1;

        // Skip if already processed
        if (processed.has(i)) continue;

        const { compCode, compName, description, parentCompetency } = row;

        // Validate required fields
        if (!compCode || !compName) {
          errors.push({
            row: rowNumber,
            error: 'Comp Code and Comp Name are required',
            data: row
          });
          processed.add(i);
          continue;
        }

        // Check if competency code already exists
        if (codeToIdMap.has(compCode)) {
          errors.push({
            row: rowNumber,
            error: `Competency code "${compCode}" already exists`,
            data: row
          });
          processed.add(i);
          continue;
        }

        // Determine parent_id
        let parentId = 0;
        if (parentCompetency && parentCompetency.trim()) {
          const parentCode = parentCompetency.trim();
          
          // Check if parent exists in codeToIdMap (either existing or newly created)
          if (codeToIdMap.has(parentCode)) {
            parentId = codeToIdMap.get(parentCode);
          } else {
            // Parent doesn't exist yet - skip this row for now (will process in next pass)
            continue;
          }
        }

        // Create competency
        try {
          const result = await executeQuery(
            `INSERT INTO competencies (
              parent_id, code, name, description, is_active
            ) VALUES (?, ?, ?, ?, ?)`,
            [
              parentId,
              compCode.trim(),
              compName.trim(),
              description && description.trim() ? description.trim() : null,
              1 // is_active = true by default
            ]
          );

          const newId = result.insertId;
          codeToIdMap.set(compCode.trim(), newId);

          success.push({
            row: rowNumber,
            competencyId: newId,
            code: compCode.trim(),
            name: compName.trim(),
            parentCode: parentCompetency && parentCompetency.trim() ? parentCompetency.trim() : undefined
          });

          processed.add(i);
          progressMade = true;
        } catch (error) {
          console.error(`Error creating competency at row ${rowNumber}:`, error);
          errors.push({
            row: rowNumber,
            error: error.message || 'Failed to create competency',
            data: row
          });
          processed.add(i);
        }
      }

      // If no progress was made in this pass, break to avoid infinite loop
      if (!progressMade) {
        // Mark remaining as errors
        for (let i = 0; i < csvData.length; i++) {
          if (!processed.has(i)) {
            const row = csvData[i];
            errors.push({
              row: i + 1,
              error: `Parent competency "${row.parentCompetency || ''}" not found in CSV or database`,
              data: row
            });
            processed.add(i);
          }
        }
        break;
      }
    }

    res.json({
      results: {
        success,
        errors,
        summary: {
          total: csvData.length,
          successful: success.length,
          failed: errors.length
        }
      }
    });
  } catch (error) {
    console.error('Error importing competencies from CSV:', error);
    res.status(500).json({
      error: 'Failed to import competencies from CSV',
      code: 'IMPORT_COMPETENCIES_ERROR'
    });
  }
};

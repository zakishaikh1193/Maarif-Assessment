import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { executeQuery } from '../config/database.js';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Login user
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get user from database with school and grade info
    const users = await executeQuery(`
      SELECT 
        u.id, u.username, u.password, u.role, u.first_name, u.last_name, u.created_at,
        s.name as school_name, s.id as school_id,
        g.display_name as grade_name, g.id as grade_id, g.grade_level
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN grades g ON u.grade_id = g.id
      WHERE u.username = ?
    `, [username]);

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response and format user data
    const { password: _, first_name, last_name, ...userWithoutPassword } = user;
    const formattedUser = {
      ...userWithoutPassword,
      firstName: first_name,
      lastName: last_name,
      school: user.school_name ? {
        id: user.school_id,
        name: user.school_name
      } : null,
      grade: user.grade_name ? {
        id: user.grade_id,
        name: user.grade_name,
        display_name: user.grade_name,
        level: user.grade_level || null
      } : null
    };

    // Update last login (optional)
    await executeQuery(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    res.json({
      message: 'Login successful',
      token,
      user: formattedUser
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'LOGIN_ERROR'
    });
  }
};

// Register new user
export const register = async (req, res) => {
  try {
    const { username, password, role, firstName, lastName, schoolId, gradeId } = req.body;

    // Check if username already exists
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Username already exists',
        code: 'USERNAME_EXISTS'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await executeQuery(
      'INSERT INTO users (username, password, role, first_name, last_name, school_id, grade_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, role, firstName || null, lastName || null, schoolId || null, gradeId || null]
    );

    // Get the created user with school and grade info
    const newUsers = await executeQuery(`
      SELECT 
        u.id, u.username, u.role, u.first_name, u.last_name, u.created_at,
        s.name as school_name, s.id as school_id,
        g.display_name as grade_name, g.id as grade_id, g.grade_level
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN grades g ON u.grade_id = g.id
      WHERE u.id = ?
    `, [result.insertId]);

    const newUser = newUsers[0];

    // Format user data for frontend
    const { first_name, last_name, ...userWithoutNames } = newUser;
    const formattedUser = {
      ...userWithoutNames,
      firstName: first_name,
      lastName: last_name,
      school: newUser.school_name ? {
        id: newUser.school_id,
        name: newUser.school_name
      } : null,
              grade: newUser.grade_name ? {
          id: newUser.grade_id,
          name: newUser.grade_name,
          level: newUser.grade_level || null
        } : null
    };

    // Generate token
    const token = generateToken(newUser.id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: formattedUser
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'REGISTRATION_ERROR'
    });
  }
};

  // Verify token
  export const verifyToken = async (req, res) => {
    try {
      // Get fresh user data with school and grade info
      const users = await executeQuery(`
        SELECT 
          u.id, u.username, u.role, u.first_name, u.last_name, u.created_at,
          s.name as school_name, s.id as school_id,
          g.display_name as grade_name, g.id as grade_id, g.grade_level
        FROM users u
        LEFT JOIN schools s ON u.school_id = s.id
        LEFT JOIN grades g ON u.grade_id = g.id
        WHERE u.id = ?
      `, [req.user.id]);

      if (users.length === 0) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const user = users[0];
      const { first_name, last_name, ...userWithoutNames } = user;
      const formattedUser = {
        ...userWithoutNames,
        firstName: first_name,
        lastName: last_name,
        school: user.school_name ? {
          id: user.school_id,
          name: user.school_name
        } : null,
        grade: user.grade_name ? {
          id: user.grade_id,
          name: user.grade_name,
          level: user.grade_level || null
        } : null
      };
      
      res.json({
        message: 'Token is valid',
        user: formattedUser
      });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'VERIFICATION_ERROR'
    });
  }
};

  // Get current user profile
  export const getProfile = async (req, res) => {
    try {
      const { password, first_name, last_name, ...userWithoutPassword } = req.user;
      const formattedUser = {
        ...userWithoutPassword,
        firstName: first_name,
        lastName: last_name
      };
      
      res.json({
        user: formattedUser
      });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'PROFILE_ERROR'
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.user.id;

    // Update user profile
    await executeQuery(
      'UPDATE users SET first_name = ?, last_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [firstName, lastName, userId]
    );

    // Get updated user
    const updatedUsers = await executeQuery(
      'SELECT id, username, role, first_name, last_name, created_at FROM users WHERE id = ?',
      [userId]
    );

    const updatedUser = updatedUsers[0];

    // Format user data for frontend
    const { first_name, last_name, ...userWithoutNames } = updatedUser;
    const formattedUser = {
      ...userWithoutNames,
      firstName: first_name,
      lastName: last_name
    };

    res.json({
      message: 'Profile updated successfully',
      user: formattedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'UPDATE_PROFILE_ERROR'
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current password hash
    const users = await executeQuery(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await executeQuery(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, userId]
    );

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'CHANGE_PASSWORD_ERROR'
    });
  }
};

// Logout (client-side token removal, but we can track it)
export const logout = async (req, res) => {
  try {
    // In a more advanced implementation, you might want to:
    // 1. Add token to a blacklist
    // 2. Track logout events
    // 3. Invalidate refresh tokens
    
    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'LOGOUT_ERROR'
    });
  }
};

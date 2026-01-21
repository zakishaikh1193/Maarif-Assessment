import crypto from 'crypto';
import { executeQuery } from '../config/database.js';
import jwt from 'jsonwebtoken';

/**
 * Validate token locally using secret key (faster, no network call)
 */
function validateTokenLocally(token, secretKey) {
  // Parse token: base64(payload).signature
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid token format');
  }

  const [encodedPayload, signature] = parts;

  // Verify signature
  // Note: PHP base64_encode() uses standard base64 (with + and /)
  // Node.js base64url uses - and _. We need to handle both formats.
  // Also, some implementations might use hex encoding instead of base64
  
  // Compute HMAC signature using the encodedPayload as-is (before any normalization)
  const expectedSignatureBase64 = crypto
    .createHmac('sha256', secretKey)
    .update(encodedPayload)
    .digest('base64');
  
  // Also compute hex signature (some Moodle implementations might use hex)
  const expectedSignatureHex = crypto
    .createHmac('sha256', secretKey)
    .update(encodedPayload)
    .digest('hex');
  
  // Normalize received signature (handle base64url to base64 conversion)
  // Also handle URL-encoded base64 characters
  let normalizedReceived = signature.replace(/-/g, '+').replace(/_/g, '/');
  
  // PHP base64_encode() produces standard base64 with = padding
  // Ensure proper padding for comparison (base64 strings must be multiples of 4)
  while (normalizedReceived.length % 4) {
    normalizedReceived += '=';
  }
  
  // Compare signatures - try base64 first, then hex
  const base64Match = normalizedReceived === expectedSignatureBase64 || signature === expectedSignatureBase64;
  const hexMatch = signature === expectedSignatureHex;
  
  if (!base64Match && !hexMatch) {
    console.log('[SSO] Signature mismatch:', {
      received: signature.substring(0, 30) + '...',
      receivedLength: signature.length,
      expectedBase64: expectedSignatureBase64.substring(0, 30) + '...',
      expectedHex: expectedSignatureHex.substring(0, 30) + '...',
      normalizedReceived: normalizedReceived.substring(0, 30) + '...'
    });
    throw new Error('Invalid token signature');
  }

  // Decode payload - PHP uses standard base64, try that first
  let payload;
  try {
    // Try standard base64 first (PHP format), then fall back to base64url for compatibility
    let decoded;
    try {
      // PHP uses standard base64_encode() - normalize base64url to base64 if needed
      const normalizedPayload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      decoded = Buffer.from(normalizedPayload, 'base64').toString('utf-8');
    } catch {
      // Fall back to base64url format
      decoded = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    }
    payload = JSON.parse(decoded);
  } catch (error) {
    throw new Error('Invalid token payload');
  }

  // Check expiration (5 minutes) - handle both 'exp' and 'expires' fields
  const now = Math.floor(Date.now() / 1000);
  const expirationTime = payload.exp || payload.expires;
  if (expirationTime && expirationTime < now) {
    throw new Error('Token has expired');
  }

  // Validate required fields - handle both user_id and userid
  const userId = payload.user_id || payload.userid;
  if (!payload.username || !userId) {
    throw new Error('Token missing required fields');
  }

  return {
    username: payload.username,
    user_id: payload.user_id || payload.userid,
    first_name: payload.first_name || payload.firstname,
    last_name: payload.last_name || payload.lastname,
    firstname: payload.first_name || payload.firstname,
    lastname: payload.last_name || payload.lastname,
    email: payload.email,
    role: payload.role || 'student',
    school_id: payload.school_id,
    grade_id: payload.grade_id
  };
}

/**
 * Process validated user (from local or Moodle validation)
 */
async function processValidatedUser(moodleUser, res) {
  // Find user in Maarif Assessment Portal database by username
  let users = await executeQuery(
    'SELECT id, username, role, first_name, last_name, school_id, grade_id FROM users WHERE username = ?',
    [moodleUser.username]
  );

  let user;
  
  // Auto-provision user if they don't exist
  if (users.length === 0) {
    // Generate a random password (user will never use it since they SSO)
    const bcrypt = (await import('bcryptjs')).default;
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 12);
    
    // Determine role from Moodle data or default to 'student'
    const userRole = moodleUser.role === 'admin' ? 'admin' : 'student';
    
    // Extract school_id and grade_id from Moodle user data if available
    const schoolId = moodleUser.school_id || null;
    const gradeId = moodleUser.grade_id || null;
    
    try {
      // Insert new user
      const insertResult = await executeQuery(
        'INSERT INTO users (username, password, role, first_name, last_name, school_id, grade_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          moodleUser.username,
          hashedPassword,
          userRole,
          moodleUser.first_name || moodleUser.firstname || null,
          moodleUser.last_name || moodleUser.lastname || null,
          schoolId,
          gradeId
        ]
      );
      
      // Fetch the newly created user
      const newUsers = await executeQuery(
        'SELECT id, username, role, first_name, last_name, school_id, grade_id FROM users WHERE id = ?',
        [insertResult.insertId]
      );
      
      if (newUsers.length === 0) {
        return res.status(500).json({
          error: 'Failed to create user account',
          code: 'USER_CREATION_FAILED'
        });
      }
      
      user = newUsers[0];
      console.log(`Auto-provisioned user: ${moodleUser.username} (ID: ${user.id})`);
    } catch (error) {
      // Handle race condition: user might have been created by another request
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        console.log(`User ${moodleUser.username} already exists (race condition), fetching existing user`);
        // Fetch the existing user
        const existingUsers = await executeQuery(
          'SELECT id, username, role, first_name, last_name, school_id, grade_id FROM users WHERE username = ?',
          [moodleUser.username]
        );
        if (existingUsers.length > 0) {
          user = existingUsers[0];
        } else {
          return res.status(500).json({
            error: 'User creation failed and user not found',
            code: 'USER_CREATION_FAILED'
          });
        }
      } else {
        // Re-throw if it's not a duplicate entry error
        throw error;
      }
    }
  } else {
    user = users[0];
  }

  // Generate JWT token for Maarif Assessment Portal platform
  const mapToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  // Get user with school and grade info
  const userWithDetails = await executeQuery(`
    SELECT 
      u.id, u.username, u.role, u.first_name, u.last_name, u.created_at,
      s.name as school_name, s.id as school_id,
      g.display_name as grade_name, g.id as grade_id, g.grade_level
    FROM users u
    LEFT JOIN schools s ON u.school_id = s.id
    LEFT JOIN grades g ON u.grade_id = g.id
    WHERE u.id = ?
  `, [user.id]);

  const userData = userWithDetails[0];
  const { first_name, last_name, ...userWithoutNames } = userData;
  const formattedUser = {
    ...userWithoutNames,
    firstName: first_name,
    lastName: last_name,
    school: userData.school_name ? {
      id: userData.school_id,
      name: userData.school_name
    } : null,
    grade: userData.grade_name ? {
      id: userData.grade_id,
      name: userData.grade_name,
      display_name: userData.grade_name,
      level: userData.grade_level || null
    } : null
  };

  return res.json({
    message: 'SSO token validated successfully',
    token: mapToken,
    user: formattedUser
  });
}

/**
 * Validate SSO token by calling Moodle's validation endpoint
 * This acts as a proxy to Moodle's validate_sso.php endpoint
 * If secret key is provided, it will try local validation first (faster)
 */
export const validateSSOToken = async (req, res) => {
  try {
    let { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'SSO token is required',
        code: 'TOKEN_MISSING'
      });
    }

    // URL-decode the token if it contains encoded characters (e.g., %3D%3D -> ==)
    try {
      token = decodeURIComponent(token);
    } catch {
      // Token is already decoded or not URL-encoded, use as-is
    }

    // Get SSO settings
    const settings = await executeQuery(
      'SELECT sso_enabled, moodle_url, sso_secret_key FROM settings WHERE id = 1'
    );

    if (settings.length === 0 || !settings[0].sso_enabled) {
      return res.status(403).json({
        error: 'SSO is not enabled',
        code: 'SSO_DISABLED'
      });
    }

    const moodleUrl = settings[0].moodle_url;
    if (!moodleUrl) {
      return res.status(500).json({
        error: 'Moodle URL not configured',
        code: 'MOODLE_URL_NOT_CONFIGURED'
      });
    }

    const secretKey = settings[0].sso_secret_key;
    
    // Option 1: Local validation (if secret key is provided) - FASTER, no network call
    if (secretKey && secretKey.trim() !== '') {
      try {
        const localValidation = validateTokenLocally(token, secretKey);
        if (localValidation) {
          console.log('[SSO] Token validated locally (fast path)');
          // Token is valid locally, proceed with user lookup
          return await processValidatedUser(localValidation, res);
        }
      } catch (localError) {
        // If local validation fails, fall back to Moodle endpoint
        console.log('[SSO] Local validation failed, falling back to Moodle endpoint:', localError.message);
      }
    }

    // Option 2: Validate via Moodle endpoint (always used as fallback or if no secret key)
    // Construct Moodle validation endpoint URL
    // Remove trailing slash if present
    const baseUrl = moodleUrl.replace(/\/$/, '');
    const validateUrl = `${baseUrl}/local/maptest/validate_sso.php?token=${encodeURIComponent(token)}`;

    console.log(`[SSO] Calling Moodle validation endpoint: ${validateUrl}`);

    try {
      // Call Moodle's validation endpoint
      const moodleResponse = await fetch(validateUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      console.log(`[SSO] Moodle response status: ${moodleResponse.status} ${moodleResponse.statusText}`);

      if (!moodleResponse.ok) {
        // Try to get error details from response
        let errorDetails = '';
        try {
          const errorText = await moodleResponse.text();
          errorDetails = errorText.substring(0, 200); // Limit error text length
        } catch (e) {
          // Ignore error reading response
        }
        
        console.error(`[SSO] Moodle validation failed:`, {
          status: moodleResponse.status,
          statusText: moodleResponse.statusText,
          url: validateUrl,
          errorDetails: errorDetails || 'No error details available'
        });
        
        throw new Error(
          `Moodle validation failed: ${moodleResponse.status} ${moodleResponse.statusText}. ` +
          `Endpoint: ${validateUrl}. ` +
          `Make sure the Moodle validation endpoint exists at this path.`
        );
      }

      const moodleData = await moodleResponse.json();

      // Check if Moodle validation was successful
      if (moodleData.status !== 'success' || !moodleData.user) {
        return res.status(401).json({
          error: moodleData.message || 'Token validation failed',
          code: 'MOODLE_VALIDATION_FAILED'
        });
      }

      const moodleUser = moodleData.user;
      
      // Process the validated user
      return await processValidatedUser(moodleUser, res);

    } catch (fetchError) {
      console.error('[SSO] Error calling Moodle validation endpoint:', {
        error: fetchError.message,
        url: validateUrl,
        name: fetchError.name
      });
      
      // Handle network errors
      if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
        return res.status(504).json({
          error: 'Moodle validation endpoint timeout. The endpoint did not respond within 10 seconds.',
          code: 'MOODLE_TIMEOUT',
          endpoint: validateUrl
        });
      }

      if (fetchError.message.includes('fetch failed') || fetchError.message.includes('ECONNREFUSED')) {
        return res.status(503).json({
          error: `Cannot connect to Moodle server at ${moodleUrl}. Please check the Moodle URL in SSO settings.`,
          code: 'MOODLE_CONNECTION_ERROR',
          moodleUrl: moodleUrl
        });
      }

      // Handle 404 specifically
      if (fetchError.message.includes('404')) {
        return res.status(404).json({
          error: `Moodle validation endpoint not found at: ${validateUrl}. ` +
                 `Please ensure the endpoint exists in your Moodle installation.`,
          code: 'MOODLE_ENDPOINT_NOT_FOUND',
          endpoint: validateUrl,
          expectedPath: '/local/maptest/validate_sso.php'
        });
      }

      throw fetchError;
    }

  } catch (error) {
    console.error('SSO validation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'SSO_VALIDATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get SSO settings (admin only)
 */
export const getSSOSettings = async (req, res) => {
  try {
    const settings = await executeQuery(
      'SELECT sso_enabled, sso_secret_key, moodle_url FROM settings WHERE id = 1'
    );

    if (settings.length === 0) {
      // Initialize default settings
      await executeQuery(
        'INSERT INTO settings (id, sso_enabled, sso_secret_key, moodle_url) VALUES (1, 0, NULL, NULL)'
      );
      return res.json({
        sso_enabled: false,
        sso_secret_key: '',
        moodle_url: ''
      });
    }

    const setting = settings[0];
    res.json({
      sso_enabled: Boolean(setting.sso_enabled),
      sso_secret_key: setting.sso_secret_key || '',
      moodle_url: setting.moodle_url || ''
    });

  } catch (error) {
    console.error('Error fetching SSO settings:', error);
    res.status(500).json({
      error: 'Failed to fetch SSO settings',
      code: 'FETCH_SETTINGS_ERROR'
    });
  }
};

/**
 * Update SSO settings (admin only)
 */
export const updateSSOSettings = async (req, res) => {
  try {
    const { sso_enabled, sso_secret_key, moodle_url } = req.body;

    // Validate inputs
    if (sso_enabled === undefined) {
      return res.status(400).json({
        error: 'sso_enabled is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Note: SSO secret key is optional - if provided, enables fast local validation
    // If not provided, system will always use Moodle endpoint validation

    // Check if settings exist
    const existing = await executeQuery('SELECT id FROM settings WHERE id = 1');
    
    if (existing.length === 0) {
      // Create new settings
      await executeQuery(
        'INSERT INTO settings (id, sso_enabled, sso_secret_key, moodle_url) VALUES (1, ?, ?, ?)',
        [sso_enabled ? 1 : 0, sso_secret_key || null, moodle_url || null]
      );
    } else {
      // Update existing settings
      await executeQuery(
        'UPDATE settings SET sso_enabled = ?, sso_secret_key = ?, moodle_url = ? WHERE id = 1',
        [sso_enabled ? 1 : 0, sso_secret_key || null, moodle_url || null]
      );
    }

    res.json({
      message: 'SSO settings updated successfully',
      settings: {
        sso_enabled: Boolean(sso_enabled),
        sso_secret_key: sso_secret_key ? '***hidden***' : '',
        moodle_url: moodle_url || ''
      }
    });

  } catch (error) {
    console.error('Error updating SSO settings:', error);
    res.status(500).json({
      error: 'Failed to update SSO settings',
      code: 'UPDATE_SETTINGS_ERROR'
    });
  }
};

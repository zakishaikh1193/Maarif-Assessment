# SSO Integration Guide: Moodle to Maarif Assessment Portal

This document describes how to integrate Single Sign-On (SSO) between Moodle and the Maarif Assessment Portal platform.

## Overview

The SSO integration allows users authenticated in Moodle to seamlessly access the Maarif Assessment Portal platform without re-entering credentials. The integration uses HMAC-SHA256 signed tokens for secure authentication.

## Architecture

```
Moodle → Generates SSO Token → Maarif Assessment Portal → Validates Token → Auto-login User
```

## Token Format

SSO tokens use the following format:
```
base64url(JSON_PAYLOAD).HMAC_SHA256_SIGNATURE
```

### Token Payload Structure

```json
{
  "username": "student1",
  "user_id": 123,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "school_id": 1,
  "grade_id": 6,
  "exp": 1704067200,
  "iat": 1704066900
}
```

### Token Fields

- `username` (required): Moodle username
- `user_id` (required): Moodle user ID
- `first_name` (optional): User's first name
- `last_name` (optional): User's last name
- `email` (optional): User's email address
- `school_id` (optional): School ID in Maarif Assessment Portal system
- `grade_id` (optional): Grade ID in Maarif Assessment Portal system
- `exp` (required): Token expiration timestamp (Unix epoch)
- `iat` (required): Token issued at timestamp (Unix epoch)

## Implementation Steps

### 1. Configure SSO in Maarif Assessment Portal

1. Log in to Maarif Assessment Portal as an administrator
2. Navigate to **Admin Dashboard** → **SSO Settings** tab
3. Enable SSO by toggling the "Enable SSO" switch
4. Enter your Moodle base URL (e.g., `https://your-moodle-site.com`)
5. Enter the shared secret key (must match Moodle configuration)
6. Click **Save Settings**

### 2. Moodle Implementation

#### Step 1: Create SSO Token Generation Endpoint

Create a file at: `iomad/local/maptest/sso.php`

```php
<?php
require_once(__DIR__ . '/../../../../config.php');
require_login();

// Get SSO secret from plugin settings
$sso_secret = get_config('local_maptest', 'sso_secret_key');
$map_test_url = get_config('local_maptest', 'map_test_url');

if (empty($sso_secret) || empty($map_test_url)) {
    die('SSO not configured');
}

// Get current user
global $USER;

// Prepare token payload
$payload = [
    'username' => $USER->username,
    'user_id' => $USER->id,
    'first_name' => $USER->firstname,
    'last_name' => $USER->lastname,
    'email' => $USER->email,
    'exp' => time() + 300, // 5 minutes expiration
    'iat' => time()
];

// Encode payload
$encoded_payload = base64_encode(json_encode($payload));

// Create HMAC signature
$signature = hash_hmac('sha256', $encoded_payload, $sso_secret, true);
$encoded_signature = base64_encode($signature);

// Combine token
$token = $encoded_payload . '.' . $encoded_signature;

// Return redirect URL
$redirect_url = $map_test_url . '/login?sso_token=' . urlencode($token) . '&username=' . urlencode($USER->username);

header('Content-Type: application/json');
echo json_encode([
    'redirect_url' => $redirect_url,
    'token' => $token
]);
```

#### Step 2: Add SSO Settings to Moodle Plugin

In your Moodle plugin's `settings.php`:

```php
$settings->add(new admin_setting_configtext(
    'local_maptest/sso_secret_key',
    get_string('sso_secret_key', 'local_maptest'),
    get_string('sso_secret_key_desc', 'local_maptest'),
    '',
    PARAM_TEXT
));

$settings->add(new admin_setting_configtext(
    'local_maptest/map_test_url',
    get_string('map_test_url', 'local_maptest'),
    get_string('map_test_url_desc', 'local_maptest'),
    'http://localhost:5173',
    PARAM_URL
));
```

#### Step 3: Update Template to Use SSO

In your Moodle template (e.g., `templates/dashboard.mustache`):

```javascript
// When user clicks "Start Maarif Assessment Portal" button
document.querySelectorAll('[data-sso-enabled="1"]').forEach(button => {
    button.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const mapTestUrl = this.dataset.mapTestUrl;
        
        try {
            // Fetch SSO token
            const response = await fetch('/local/maptest/sso.php');
            const data = await response.json();
            
            // Open Maarif Assessment Portal in popup with SSO token
            const popup = window.open(
                data.redirect_url,
                'MaarifTest',
                'width=1200,height=800,scrollbars=yes,resizable=yes'
            );
        } catch (error) {
            console.error('SSO error:', error);
            // Fallback to regular URL
            window.open(mapTestUrl, 'MaarifTest', 'width=1200,height=800');
        }
    });
});
```

### 3. Maarif Assessment Portal Validation Endpoint

The Maarif Assessment Portal platform provides a validation endpoint at:
```
POST /api/sso/validate
```

**Request Body:**
```json
{
  "token": "base64_payload.signature"
}
```

**Success Response (200):**
```json
{
  "message": "SSO token validated successfully",
  "token": "jwt_token_for_map_test",
  "user": {
    "id": 1,
    "username": "student1",
    "role": "student",
    "firstName": "John",
    "lastName": "Doe",
    "school": {
      "id": 1,
      "name": "Example School"
    },
    "grade": {
      "id": 6,
      "name": "Grade 6",
      "level": 6
    }
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid token format or missing fields
- `401 Unauthorized`: Invalid signature or expired token
- `403 Forbidden`: SSO not enabled
- `404 Not Found`: User not found in Maarif Assessment Portal system
- `500 Internal Server Error`: Server error

## Security Considerations

1. **Token Expiration**: Tokens expire after 5 minutes to prevent replay attacks
2. **HMAC Signature**: All tokens are signed with HMAC-SHA256 to prevent tampering
3. **Secret Key**: Use a strong, randomly generated secret key (minimum 32 characters)
4. **HTTPS**: Always use HTTPS in production to protect tokens in transit
5. **User Matching**: Users must exist in both systems with matching usernames

## Testing

### Test Token Generation (PHP)

```php
<?php
$secret = 'your_secret_key_here';
$payload = [
    'username' => 'testuser',
    'user_id' => 123,
    'exp' => time() + 300,
    'iat' => time()
];

$encoded = base64_encode(json_encode($payload));
$signature = base64_encode(hash_hmac('sha256', $encoded, $secret, true));
$token = $encoded . '.' . $signature;

echo "Token: " . $token . "\n";
echo "Test URL: http://localhost:5173/login?sso_token=" . urlencode($token) . "\n";
```

### Test Token Validation (cURL)

```bash
curl -X POST http://localhost:5000/api/sso/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_HERE"}'
```

## Troubleshooting

### Token Validation Fails

1. **Check secret key**: Ensure the secret key matches in both systems
2. **Check token format**: Verify the token has the correct format (payload.signature)
3. **Check expiration**: Ensure the token hasn't expired (5-minute window)
4. **Check user exists**: Verify the username exists in Maarif Assessment Portal database

### User Not Found

- Users must be created in Maarif Assessment Portal before SSO can work
- Username must match exactly between Moodle and Maarif Assessment Portal
- Consider implementing auto-provisioning if needed

### SSO Not Enabled

- Verify SSO is enabled in Maarif Assessment Portal admin settings
- Check that the secret key is configured
- Ensure the settings were saved successfully

## API Endpoints

### GET /api/sso/settings
Get current SSO settings (Admin only)

**Response:**
```json
{
  "sso_enabled": true,
  "sso_secret_key": "***hidden***",
  "moodle_url": "https://your-moodle-site.com"
}
```

### PUT /api/sso/settings
Update SSO settings (Admin only)

**Request Body:**
```json
{
  "sso_enabled": true,
  "sso_secret_key": "your_secret_key_here",
  "moodle_url": "https://your-moodle-site.com"
}
```

## Database Schema

The SSO settings are stored in the `settings` table:

```sql
CREATE TABLE settings (
    id INT PRIMARY KEY DEFAULT 1,
    sso_enabled TINYINT(1) DEFAULT 0,
    sso_secret_key VARCHAR(255) NULL,
    moodle_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify token format and signature generation
4. Ensure both systems have matching configurations


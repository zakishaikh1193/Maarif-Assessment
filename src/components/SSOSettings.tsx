import React, { useState, useEffect } from 'react';
import { ssoAPI } from '../services/api';
import { Settings, Save, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface SSOSettingsProps {
  onClose?: () => void;
}

const SSOSettings: React.FC<SSOSettingsProps> = ({ onClose }) => {
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoSecretKey, setSsoSecretKey] = useState('');
  const [moodleUrl, setMoodleUrl] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await ssoAPI.getSettings();
      setSsoEnabled(settings.sso_enabled);
      setSsoSecretKey(settings.sso_secret_key || '');
      setMoodleUrl(settings.moodle_url || '');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to load SSO settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await ssoAPI.updateSettings({
        sso_enabled: ssoEnabled,
        sso_secret_key: ssoSecretKey,
        moodle_url: moodleUrl
      });

      setMessage({
        type: 'success',
        text: 'SSO settings saved successfully'
      });

      // Reload settings to get updated values
      await loadSettings();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to save SSO settings'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Settings className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SSO Settings</h2>
          <p className="text-gray-600 text-sm">Configure Single Sign-On with Moodle</p>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <p
            className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Enable SSO Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="text-sm font-medium text-gray-900">Enable SSO</label>
            <p className="text-xs text-gray-600 mt-1">
              Allow users to sign in via Moodle SSO
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={ssoEnabled}
              onChange={(e) => setSsoEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Moodle URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Moodle URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={moodleUrl}
            onChange={(e) => setMoodleUrl(e.target.value)}
            placeholder="http://localhost/kodeit or https://your-moodle-site.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={ssoEnabled}
          />
          <p className="text-xs text-gray-500 mt-1">
            Base URL of your Moodle installation (required when SSO is enabled)
          </p>
        </div>

        {/* SSO Secret Key (Optional - for reference) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SSO Secret Key <span className="text-gray-500 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type={showSecretKey ? 'text' : 'password'}
              value={ssoSecretKey}
              onChange={(e) => setSsoSecretKey(e.target.value)}
              placeholder="Enter shared secret key (optional - kept for reference)"
              className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showSecretKey ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Optional: Shared secret key for reference. Maarif Assessment Portal validates tokens via Moodle's endpoint.
          </p>
        </div>

        {/* Info Box */}
        {ssoEnabled && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">SSO Integration Active</p>
                <p className="text-xs">
                  Users can now sign in via Moodle SSO. Maarif Assessment Portal will call Moodle's validation endpoint
                  at: <code className="bg-blue-100 px-1 rounded">{moodleUrl}/local/maptest/validate_sso.php</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || (ssoEnabled && !moodleUrl.trim())}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SSOSettings;


import React, { useState, useEffect } from 'react';
import { ssoAPI } from '../services/api';
import { Settings, Save, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import powerSchoolLogo from '../images/images.png';

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

  // PowerSchool API states
  const [powerSchoolEnabled, setPowerSchoolEnabled] = useState(false);
  const [powerSchoolUrl, setPowerSchoolUrl] = useState('');
  const [powerSchoolClientId, setPowerSchoolClientId] = useState('');
  const [powerSchoolClientSecret, setPowerSchoolClientSecret] = useState('');
  const [showPowerSchoolSecret, setShowPowerSchoolSecret] = useState(false);

  // SSO Container state - controls visibility/enablement of SSO Settings section
  const [ssoContainerEnabled, setSsoContainerEnabled] = useState(true);

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

      // Load PowerSchool settings
      try {
        const powerSchoolSettings = await ssoAPI.getPowerSchoolSettings();
        setPowerSchoolEnabled(powerSchoolSettings.power_school_enabled || false);
        setPowerSchoolUrl(powerSchoolSettings.power_school_url || '');
        setPowerSchoolClientId(powerSchoolSettings.power_school_client_id || '');
        setPowerSchoolClientSecret(powerSchoolSettings.power_school_client_secret || '');
      } catch (error) {
        // PowerSchool settings might not exist yet, that's okay
        console.log('PowerSchool settings not found, using defaults');
      }
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

      // Save PowerSchool settings
      await ssoAPI.updatePowerSchoolSettings({
        power_school_enabled: powerSchoolEnabled,
        power_school_url: powerSchoolUrl,
        power_school_client_id: powerSchoolClientId,
        power_school_client_secret: powerSchoolClientSecret
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
          <h2 className="text-2xl font-bold text-gray-900">Integration Settings</h2>
          <p className="text-gray-600 text-sm">Configure API integrations and SSO</p>
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
        {/* PowerSchool API Configuration Section - Moved to top */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3 mb-6">
            <img 
              src={powerSchoolLogo} 
              alt="PowerSchool Logo" 
              className="h-24 w-24 object-contain"
            />
            <div>
              <h3 className="text-xl font-bold text-gray-900">PowerSchool API Configuration</h3>
              <p className="text-gray-600 text-sm">Configure PowerSchool API integration</p>
            </div>
          </div>

          {/* Enable PowerSchool Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-900">Enable PowerSchool API</label>
              <p className="text-xs text-gray-600 mt-1">
                Allow integration with PowerSchool API for student data synchronization
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={powerSchoolEnabled}
                onChange={(e) => setPowerSchoolEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* PowerSchool URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PowerSchool API URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={powerSchoolUrl}
              onChange={(e) => setPowerSchoolUrl(e.target.value)}
              placeholder="https://your-powerschool-instance.powerschool.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={powerSchoolEnabled}
              disabled={!powerSchoolEnabled}
            />
            <p className="text-xs text-gray-500 mt-1">
              Base URL of your PowerSchool API instance (required when PowerSchool API is enabled)
            </p>
          </div>

          {/* PowerSchool Client ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={powerSchoolClientId}
              onChange={(e) => setPowerSchoolClientId(e.target.value)}
              placeholder="Enter PowerSchool API Client ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={powerSchoolEnabled}
              disabled={!powerSchoolEnabled}
            />
            <p className="text-xs text-gray-500 mt-1">
              PowerSchool API Client ID (required when PowerSchool API is enabled)
            </p>
          </div>

          {/* PowerSchool Client Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Secret <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPowerSchoolSecret ? 'text' : 'password'}
                value={powerSchoolClientSecret}
                onChange={(e) => setPowerSchoolClientSecret(e.target.value)}
                placeholder="Enter PowerSchool API Client Secret"
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={powerSchoolEnabled}
                disabled={!powerSchoolEnabled}
              />
              <button
                type="button"
                onClick={() => setShowPowerSchoolSecret(!showPowerSchoolSecret)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                disabled={!powerSchoolEnabled}
              >
                {showPowerSchoolSecret ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              PowerSchool API Client Secret (required when PowerSchool API is enabled)
            </p>
          </div>

          {/* PowerSchool Info Box */}
          {powerSchoolEnabled && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">PowerSchool API Integration Active</p>
                  <p className="text-xs">
                    PowerSchool API integration is enabled. Maarif Assessment Portal will synchronize student data
                    with PowerSchool at: <code className="bg-blue-100 px-1 rounded">{powerSchoolUrl}</code>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-8"></div>

        {/* Moodle SSO Configuration Section - Separate Container */}
        <div className={`bg-gray-50 rounded-xl border-2 ${ssoContainerEnabled ? 'border-blue-200' : 'border-gray-300'} p-6 transition-all`}>
          {/* SSO Container Enable/Disable Toggle */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">SSO Settings</h3>
                <p className="text-gray-600 text-sm">Configure Single Sign-On with Moodle</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${ssoContainerEnabled ? 'text-gray-700' : 'text-gray-400'}`}>
                {ssoContainerEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ssoContainerEnabled}
                  onChange={(e) => setSsoContainerEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* SSO Settings Content - Only visible when container is enabled */}
          {ssoContainerEnabled ? (
            <div className="space-y-6">

              {/* Enable SSO Toggle */}
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">SSO Settings container is disabled. Enable it to configure Moodle SSO integration.</p>
            </div>
          )}
        </div>

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
            disabled={saving || (ssoEnabled && !moodleUrl.trim()) || (powerSchoolEnabled && (!powerSchoolUrl.trim() || !powerSchoolClientId.trim() || !powerSchoolClientSecret.trim()))}
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


import { useState } from 'react';
import { Settings as SettingsIcon, X, Moon, Sun, Monitor, Keyboard, Volume2, VolumeX, Bell, BellOff, Globe, Save, RefreshCw, User, Code, Palette } from 'lucide-react';

interface Settings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  soundEnabled: boolean;
  notifications: boolean;
  language: string;
  autoSave: boolean;
  tabSize: number;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
}

export function SettingsPanel({ isOpen, onClose, settings, onSave }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [activeTab, setActiveTab] = useState<'appearance' | 'editor' | 'general'>('appearance');

  if (!isOpen) return null;

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveAndClose = () => {
    onSave(localSettings);
    onClose();
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: <Palette size={14} /> },
    { id: 'editor', label: 'Editor', icon: <Code size={14} /> },
    { id: 'general', label: 'General', icon: <SettingsIcon size={14} /> },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2><SettingsIcon size={18} /> Settings</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        
        <div className="settings-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h3>Theme</h3>
              <div className="settings-options theme-options">
                <button
                  className={`settings-option ${localSettings.theme === 'light' ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', 'light')}
                >
                  <Sun size={16} />
                  <span>Light</span>
                </button>
                <button
                  className={`settings-option ${localSettings.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', 'dark')}
                >
                  <Moon size={16} />
                  <span>Dark</span>
                </button>
                <button
                  className={`settings-option ${localSettings.theme === 'system' ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', 'system')}
                >
                  <Monitor size={16} />
                  <span>System</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="settings-section">
              <label>
                <span>Font Family</span>
                <input
                  type="text"
                  value={localSettings.fontFamily}
                  onChange={(e) => updateSetting('fontFamily', e.target.value)}
                  placeholder="JetBrains Mono, monospace"
                />
              </label>
              <label>
                <span>Font Size</span>
                <input
                  type="number"
                  value={localSettings.fontSize}
                  onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                  min={10}
                  max={24}
                />
              </label>
              <label>
                <span>Tab Size</span>
                <select
                  value={localSettings.tabSize}
                  onChange={(e) => updateSetting('tabSize', parseInt(e.target.value))}
                >
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                </select>
              </label>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="settings-section">
              <label>
                <span>Language</span>
                <select
                  value={localSettings.language}
                  onChange={(e) => updateSetting('language', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                  <option value="zh">Chinese</option>
                </select>
              </label>
              <label className="toggle">
                <span>Sound Effects</span>
                <button
                  className={`toggle-btn ${localSettings.soundEnabled ? 'active' : ''}`}
                  onClick={() => updateSetting('soundEnabled', !localSettings.soundEnabled)}
                >
                  {localSettings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
              </label>
              <label className="toggle">
                <span>Notifications</span>
                <button
                  className={`toggle-btn ${localSettings.notifications ? 'active' : ''}`}
                  onClick={() => updateSetting('notifications', !localSettings.notifications)}
                >
                  {localSettings.notifications ? <Bell size={14} /> : <BellOff size={14} />}
                </button>
              </label>
              <label className="toggle">
                <span>Auto-save</span>
                <button
                  className={`toggle-btn ${localSettings.autoSave ? 'active' : ''}`}
                  onClick={() => updateSetting('autoSave', !localSettings.autoSave)}
                >
                  {localSettings.autoSave ? <Save size={14} /> : <RefreshCw size={14} />}
                </button>
              </label>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={saveAndClose}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
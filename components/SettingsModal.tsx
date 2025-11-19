import React, { useState, useEffect } from 'react';
import { AppSettings, AVAILABLE_EDIT_MODELS, AVAILABLE_ANALYSIS_MODELS } from '../types';
import { X, Save, Key, Cpu, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-500" />
            إعدادات المزود (AIML API)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-800/50 p-3 rounded-lg text-xs text-blue-200 flex gap-2 items-start">
            <ExternalLink className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              نستخدم مزود <strong>aimlapi.com</strong> لأنه يقبل جميع طرق الدفع (بما فيها التي ترفضها جوجل) ويوفر موديلات Gemini و Flux في مكان واحد.
            </p>
          </div>

          {/* API Key Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              مفتاح API Key
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                value={localSettings.apiKey}
                onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                placeholder="sk-..."
                className="block w-full pr-10 pl-3 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-slate-500">
                يتم الحصول عليه من موقع aimlapi.com
              </p>
              <a 
                href="https://aimlapi.com/dashboard/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-brand-400 hover:text-brand-300 underline"
              >
                احصل على المفتاح من هنا &larr;
              </a>
            </div>
          </div>

          {/* Analysis Model */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              موديل التحليل (Vision)
            </label>
            <select
              value={localSettings.analysisModel}
              onChange={(e) => setLocalSettings({ ...localSettings, analysisModel: e.target.value })}
              className="block w-full py-3 px-4 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {AVAILABLE_ANALYSIS_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Generation Model */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              موديل توليد الخلفيات (Background Gen)
            </label>
             <div className="flex gap-2">
                <select
                  value={localSettings.generationModel}
                  onChange={(e) => setLocalSettings({ ...localSettings, generationModel: e.target.value })}
                  className="block flex-1 py-3 px-4 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {AVAILABLE_EDIT_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
             </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition text-sm font-medium"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition flex items-center gap-2 shadow-lg shadow-brand-900/50 font-bold"
          >
            <Save className="w-4 h-4" />
            حفظ وتشغيل
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
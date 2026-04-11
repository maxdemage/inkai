import { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { useConfig, useUpdateConfig } from '../hooks';
import type { InkaiConfig, LLMProviderName, LLMTier } from '../types';

const PROVIDERS: { id: LLMProviderName; label: string; placeholder: string }[] = [
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIza...' },
];

const TIER_MODELS: Record<LLMProviderName, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-haiku-3-5-20241022'],
  gemini: ['gemini-2.5-pro-preview-03-25', 'gemini-2.0-flash-001', 'gemini-1.5-pro'],
};

const TIER_LABELS: Record<LLMTier, { label: string; desc: string }> = {
  small: { label: 'Small (Fast)', desc: 'Used for quick tasks: suggestions, questions' },
  medium: { label: 'Medium', desc: 'Used for planning, lore operations' },
  writer: { label: 'Writer (Best)', desc: 'Used for writing chapters, reviews, rewrites' },
};

function ApiKeyField({ provId, label, placeholder, value, onChange }: {
  provId: string; label: string; placeholder: string;
  value: string; onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const masked = value === '***';
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="w-full bg-ink-700 border border-white/[0.1] rounded-lg px-3 py-2 pr-9 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-colors"
          placeholder={masked ? '(key already set — enter new value to change)' : placeholder}
          value={masked ? '' : value}
          onChange={e => onChange(e.target.value)}
          autoComplete="off"
          data-1p-ignore
          id={`apikey-${provId}`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {masked && (
        <p className="text-xs text-slate-600">API key is already configured. Leave blank to keep current.</p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { data: config, isLoading } = useConfig();
  const updateConfig = useUpdateConfig();

  // Local draft state
  const [apiKeys, setApiKeys] = useState<Partial<Record<LLMProviderName, string>>>({});
  const [tiers, setTiers] = useState<Partial<Record<LLMTier, { provider: LLMProviderName; model: string }>>>({});
  const [git, setGit] = useState<{ enabled: boolean; autoCommit: boolean }>({ enabled: false, autoCommit: true });
  const [language, setLanguage] = useState('en');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!config) return;
    // Show masked keys
    const keys: Partial<Record<LLMProviderName, string>> = {};
    for (const [name, conf] of Object.entries(config.providers)) {
      if (conf?.apiKey) keys[name as LLMProviderName] = '***';
    }
    setApiKeys(keys);
    setTiers(config.tiers as Partial<Record<LLMTier, { provider: LLMProviderName; model: string }>>);
    setGit({ ...config.git });
    setLanguage(config.language);
  }, [config]);

  const save = async () => {
    const patch: Partial<InkaiConfig> = { git, language };

    // Build providers — only include non-empty, non-masked keys
    const providers: Partial<Record<LLMProviderName, { apiKey: string }>> = {};
    for (const [name, key] of Object.entries(apiKeys)) {
      if (key && key !== '***') providers[name as LLMProviderName] = { apiKey: key };
    }
    if (Object.keys(providers).length > 0) patch.providers = providers;

    patch.tiers = tiers as InkaiConfig['tiers'];

    await updateConfig.mutateAsync(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>;

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <button
          onClick={save}
          disabled={updateConfig.isPending}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {updateConfig.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="space-y-8">
        {/* ── API Keys ────────────────────────────────────────── */}
        <section className="bg-ink-800 border border-white/[0.07] rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">LLM Providers</h2>
            <p className="text-sm text-slate-500 mt-0.5">Configure API keys for the AI providers you want to use.</p>
          </div>

          {PROVIDERS.map(p => (
            <ApiKeyField
              key={p.id}
              provId={p.id}
              label={p.label}
              placeholder={p.placeholder}
              value={apiKeys[p.id] ?? ''}
              onChange={v => setApiKeys(prev => ({ ...prev, [p.id]: v }))}
            />
          ))}
        </section>

        {/* ── Model tiers ─────────────────────────────────────── */}
        <section className="bg-ink-800 border border-white/[0.07] rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">Model Tiers</h2>
            <p className="text-sm text-slate-500 mt-0.5">Assign providers and models to each tier.</p>
          </div>

          {(Object.entries(TIER_LABELS) as [LLMTier, typeof TIER_LABELS[LLMTier]][]).map(([tierId, tierInfo]) => {
            const current = tiers[tierId] ?? config?.tiers[tierId] ?? { provider: 'openai', model: '' };
            return (
              <div key={tierId} className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-slate-300">{tierInfo.label}</label>
                  <p className="text-xs text-slate-500">{tierInfo.desc}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="bg-ink-700 border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500/60 transition-colors"
                    value={current.provider}
                    onChange={e => setTiers(prev => ({
                      ...prev,
                      [tierId]: { ...current, provider: e.target.value as LLMProviderName },
                    }))}
                  >
                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <input
                    className="bg-ink-700 border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors"
                    placeholder="Model name"
                    list={`models-${tierId}`}
                    value={current.model}
                    onChange={e => setTiers(prev => ({
                      ...prev,
                      [tierId]: { ...current, model: e.target.value },
                    }))}
                  />
                  <datalist id={`models-${tierId}`}>
                    {TIER_MODELS[current.provider]?.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
              </div>
            );
          })}
        </section>

        {/* ── General settings ─────────────────────────────────── */}
        <section className="bg-ink-800 border border-white/[0.07] rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">General</h2>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-300">Git integration</label>
              <p className="text-xs text-slate-500">Auto-commit changes to a local git repo</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={git.autoCommit}
                onChange={e => setGit(prev => ({ ...prev, autoCommit: e.target.checked }))}
              />
              <div className="w-10 h-5 bg-ink-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Language</label>
            <select
              className="w-full bg-ink-700 border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500/60 transition-colors"
              value={language}
              onChange={e => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="pl">Polish</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
        </section>

        {config?.booksDir && (
          <p className="text-xs text-slate-600">
            Books directory: <span className="text-slate-500 font-mono">{config.booksDir}</span>
          </p>
        )}
      </div>
    </div>
  );
}

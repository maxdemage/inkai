import { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useConfig, useUpdateConfig } from '../hooks';
import type { InkaiConfig, LLMProviderName, LLMTier } from '../types';
import { useTheme } from '../theme';

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
  provId: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const masked = value === '***';

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium app-text">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="w-full app-input rounded-lg px-3 py-2 pr-9 text-sm"
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
          className="absolute right-2.5 top-1/2 -translate-y-1/2 app-text-faint hover:text-[color:var(--text)] transition-colors"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {masked && (
        <p className="text-xs app-text-faint">API key is already configured. Leave blank to keep current.</p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { data: config, isLoading } = useConfig();
  const updateConfig = useUpdateConfig();
  const { themeId, setThemeId, themes } = useTheme();
  const currentTheme = themes.find(theme => theme.id === themeId) ?? themes[0];

  const [apiKeys, setApiKeys] = useState<Partial<Record<LLMProviderName, string>>>({});
  const [tiers, setTiers] = useState<Partial<Record<LLMTier, { provider: LLMProviderName; model: string }>>>({});
  const [git, setGit] = useState<{ enabled: boolean; autoCommit: boolean }>({ enabled: false, autoCommit: true });
  const [language, setLanguage] = useState('en');
  const [saved, setSaved] = useState(false);
  const [showThemes, setShowThemes] = useState(false);

  useEffect(() => {
    if (!config) return;
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

  if (isLoading) return <div className="flex items-center justify-center h-64 app-text-faint">Loading…</div>;

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold app-text-primary">Settings</h1>
        <button
          onClick={save}
          disabled={updateConfig.isPending}
          className="flex items-center gap-2 px-4 py-2.5 app-accent-button text-sm font-medium rounded-xl transition-colors"
        >
          {updateConfig.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="space-y-8">
        <section className="app-panel rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold app-text-primary">Appearance</h2>
            <p className="text-sm app-text-muted mt-0.5">
              Choose a color atmosphere for the Inkai workspace.
              <br />
              Theme changes apply instantly and stay saved in this browser.
            </p>
          </div>

          <div className="rounded-2xl border app-divider px-4 py-3 app-panel-strong">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold app-text-primary">{currentTheme.name}</span>
                  <Check size={14} className="text-[color:var(--accent-strong)] shrink-0" />
                </div>
                <p className="text-xs app-text-muted mt-1 leading-relaxed line-clamp-1">{currentTheme.description}</p>
              </div>

              <div className="flex items-center justify-between gap-3 md:justify-end shrink-0">
                <div className="flex items-center gap-1.5">
                  {currentTheme.swatches.map(color => (
                    <span
                      key={color}
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: color, borderColor: 'var(--border-strong)' }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowThemes(prev => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg app-ghost-button transition-colors"
                  aria-expanded={showThemes}
                >
                  {showThemes ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {showThemes ? 'Hide Themes' : 'Browse Themes'}
                </button>
              </div>
            </div>
          </div>

          {showThemes && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {themes.map(theme => {
                const isSelected = theme.id === themeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setThemeId(theme.id)}
                    className={`rounded-2xl p-4 text-left transition-all border ${
                      isSelected ? 'app-nav-link-active shadow-lg' : 'app-panel-hover'
                    }`}
                    style={isSelected ? undefined : { borderColor: 'var(--border)', background: 'var(--surface)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold app-text-primary">{theme.name}</span>
                          {isSelected && <Check size={14} className="text-[color:var(--accent-strong)]" />}
                        </div>
                        <p className="text-xs app-text-muted mt-1 leading-relaxed">{theme.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {theme.swatches.map(color => (
                          <span
                            key={color}
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: color, borderColor: 'var(--border-strong)' }}
                          />
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="app-panel rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold app-text-primary">LLM Providers</h2>
            <p className="text-sm app-text-muted mt-0.5">Configure API keys for the AI providers you want to use.</p>
          </div>

          {PROVIDERS.map(provider => (
            <ApiKeyField
              key={provider.id}
              provId={provider.id}
              label={provider.label}
              placeholder={provider.placeholder}
              value={apiKeys[provider.id] ?? ''}
              onChange={value => setApiKeys(prev => ({ ...prev, [provider.id]: value }))}
            />
          ))}
        </section>

        <section className="app-panel rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold app-text-primary">Model Tiers</h2>
            <p className="text-sm app-text-muted mt-0.5">Assign providers and models to each tier.</p>
          </div>

          {(Object.entries(TIER_LABELS) as [LLMTier, typeof TIER_LABELS[LLMTier]][]).map(([tierId, tierInfo]) => {
            const current = tiers[tierId] ?? config?.tiers[tierId] ?? { provider: 'openai', model: '' };
            return (
              <div key={tierId} className="space-y-2">
                <div>
                  <label className="text-sm font-medium app-text">{tierInfo.label}</label>
                  <p className="text-xs app-text-muted">{tierInfo.desc}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="app-input rounded-lg px-3 py-2 text-sm"
                    value={current.provider}
                    onChange={e => setTiers(prev => ({
                      ...prev,
                      [tierId]: { ...current, provider: e.target.value as LLMProviderName },
                    }))}
                  >
                    {PROVIDERS.map(provider => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
                  </select>
                  <input
                    className="app-input rounded-lg px-3 py-2 text-sm"
                    placeholder="Model name"
                    list={`models-${tierId}`}
                    value={current.model}
                    onChange={e => setTiers(prev => ({
                      ...prev,
                      [tierId]: { ...current, model: e.target.value },
                    }))}
                  />
                  <datalist id={`models-${tierId}`}>
                    {TIER_MODELS[current.provider]?.map(model => <option key={model} value={model} />)}
                  </datalist>
                </div>
              </div>
            );
          })}
        </section>

        <section className="app-panel rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-semibold app-text-primary">General</h2>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium app-text">Git integration</label>
              <p className="text-xs app-text-muted">Auto-commit changes to a local git repo</p>
            </div>
            <button
              type="button"
              onClick={() => setGit(prev => ({ ...prev, autoCommit: !prev.autoCommit }))}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ background: git.autoCommit ? 'linear-gradient(135deg, var(--accent), var(--accent-strong))' : 'var(--surface-muted)' }}
              aria-pressed={git.autoCommit}
            >
              <span
                className="inline-block h-5 w-5 transform rounded-full transition-transform"
                style={{
                  background: 'var(--accent-contrast)',
                  transform: git.autoCommit ? 'translateX(22px)' : 'translateX(2px)',
                }}
              />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium app-text">Language</label>
            <select
              className="w-full app-input rounded-lg px-3 py-2 text-sm"
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
          <p className="text-xs app-text-faint">
            Books directory: <span className="app-text-muted font-mono">{config.booksDir}</span>
          </p>
        )}
      </div>
    </div>
  );
}

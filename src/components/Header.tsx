import { Icon } from './Icon';

type ThemeMode = 'light' | 'dark' | 'system';

/** Figma: Header (3159:8206) — 1492x56 */
export function Header({ mode = 'light' }: { mode?: ThemeMode }) {
  const modes: { id: ThemeMode; icon: string; label: string }[] = [
    { id: 'light', icon: 'sun', label: 'Light theme' },
    { id: 'dark', icon: 'moon', label: 'Dark theme' },
    { id: 'system', icon: 'laptop', label: 'System theme' },
  ];

  return (
    <div className="header">
      <div className="breadcrumb">
        <span className="breadcrumb__item">Energy Monitoring System</span>
        <span className="breadcrumb__sep">
          <Icon name="chevronRight" size={16} />
        </span>
        <span className="breadcrumb__item breadcrumb__item--current">Dashboard</span>
      </div>

      <div className="tab-switcher">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-label={m.label}
            aria-pressed={m.id === mode}
            className={`tab-switcher__btn${m.id === mode ? ' tab-switcher__btn--active' : ''}`}
          >
            <Icon name={m.icon} size={18} strokeWidth={1.8} filled={m.id !== 'system'} />
          </button>
        ))}
      </div>

      <button className="icon-button" type="button" aria-label="Settings">
        <Icon name="settings" size={16} strokeWidth={1.8} />
      </button>
    </div>
  );
}

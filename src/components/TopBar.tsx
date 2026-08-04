import { Icon } from './Icon';

/** Figma: Frame 408 (3159:8134) — 1728x52 */
export function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <div className="topbar__wordmark">
          <span>
            EnerSen<span className="topbar__wordmark-accent">X</span>
          </span>
          <span className="topbar__tm">TM</span>
        </div>
        <button className="topbar__toggle" type="button" aria-label="Toggle sidebar">
          <Icon name="sidebarToggle" size={16} />
        </button>
      </div>

      <div className="topbar__search-wrap">
        <button className="topbar__search" type="button">
          <Icon name="search" size={14} color="var(--icon-secondary)" />
          <span className="topbar__search-label">Search</span>
          <span className="topbar__kbd">⌘K</span>
        </button>
      </div>

      <div className="topbar__account">
        <div className="topbar__account-inner">
          <div className="topbar__avatar">
            HM
            <span className="topbar__presence" />
          </div>
          <Icon name="chevronDown" size={10} color="var(--icon-secondary)" />
        </div>
      </div>
    </header>
  );
}

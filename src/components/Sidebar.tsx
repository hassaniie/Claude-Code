import { deviceStatus, facility, navItems } from '../data/dashboard';
import { Icon } from './Icon';

/** Figma: Sidebar Tabs (3180:9554) — 236px wide, full height */
export function Sidebar({ activeId = 'dashboard' }: { activeId?: string }) {
  return (
    <nav className="sidebar">
      <div className="sidebar__top">
        <div className="sidebar__title-row">
          <div className="sidebar__title">Energy Monitoring System</div>
        </div>

        <div className="sidebar__nav">
          {navItems.map((item) => {
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                className={`side-tab${active ? ' side-tab--active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  name={item.icon}
                  size={14}
                  color={active ? 'var(--icon-primary)' : 'var(--icon-secondary)'}
                  filled={active}
                />
                <span className="side-tab__label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sidebar__bottom">
        <div className="field">
          <label className="field__label" htmlFor="facility-select">
            {facility.label}
          </label>
          <button className="field__control" id="facility-select" type="button">
            <span className="field__value">{facility.value}</span>
            <Icon name="chevronDown" size={16} color="var(--icon-secondary)" />
          </button>
        </div>

        <div className="devices">
          <div className="devices__row">
            <span className="devices__dot" />
            <span className="devices__label">
              <strong>{deviceStatus.online}</strong> of{' '}
              <strong>{deviceStatus.total}</strong> devices online
            </span>
          </div>
          <div className="devices__row">
            <span className="devices__note">{deviceStatus.note}</span>
            <button className="devices__refresh" type="button" aria-label="Refresh device status">
              <Icon name="refresh" size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

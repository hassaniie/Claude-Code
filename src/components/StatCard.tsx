import type { StatCard as StatCardData } from '../data/dashboard';
import { Icon } from './Icon';

/** Figma: Frame 403 (3159:8234) and siblings — 238x97 */
export function StatCard({ data }: { data: StatCardData }) {
  return (
    <article className="stat-card">
      <div className="stat-card__body">
        <div className="stat-card__label">{data.label}</div>
        <div className="stat-card__figures">
          <div className="stat-card__value-row">
            <span className="stat-card__value">{data.value}</span>
            {data.unit ? <span className="stat-card__unit">{data.unit}</span> : null}
          </div>
          <div className={`stat-card__caption tone-${data.captionTone}`}>{data.caption}</div>
        </div>
      </div>
      <div className={`stat-card__tile tile-${data.tone}`}>
        <Icon name={data.icon} size={24} strokeWidth={1.5} />
      </div>
    </article>
  );
}

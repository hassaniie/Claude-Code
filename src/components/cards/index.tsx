import { Fragment } from 'react';
import {
  energyBreakdown,
  energyIntensity,
  energySavingTrend,
  powerQuality,
  savingSummary,
  topEquipment,
  utilityOverview,
} from '../../data/dashboard';
import { Card } from '../Card';
import { Icon } from '../Icon';
import { AreaTrendChart } from '../charts/AreaTrendChart';
import { CostComparisonChart } from '../charts/CostComparisonChart';
import { DonutChart } from '../charts/DonutChart';
import { LoadCurveChart } from '../charts/LoadCurveChart';
import { SavingGauge } from '../charts/SavingGauge';

/* ------------------------------------------------- row 2: real-time load */

export function LoadCurveCard() {
  return (
    <Card title="Real-Time Load Curve" meta="(24h)" className="col-578 card--gap-14">
      <LoadCurveChart />
      <div className="legend legend--split">
        <span className="legend__unit">MW</span>
        <div className="legend__group">
          <span className="legend__item">
            <svg className="legend__dash" viewBox="0 0 22 6" width="22" height="6">
              <line
                x1="0"
                y1="3"
                x2="22"
                y2="3"
                stroke="var(--status-danger-border)"
                strokeWidth="2"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />
            </svg>
            Yesterday
          </span>
          <span className="legend__item">
            <svg className="legend__dash" viewBox="0 0 22 6" width="22" height="6">
              <line x1="0" y1="3" x2="22" y2="3" stroke="#2bb3d6" strokeWidth="2" strokeLinecap="round" />
              <circle cx="11" cy="3" r="2.5" fill="#2bb3d6" />
            </svg>
            Today
          </span>
        </div>
        <span className="legend__unit" aria-hidden="true" style={{ visibility: 'hidden' }}>
          MW
        </span>
      </div>
    </Card>
  );
}

/* -------------------------------------------- row 2: energy cost comparison */

export function CostComparisonCard() {
  return (
    <Card title="Energy Cost Comparison" meta="Monthly" className="col-578 card--gap-14">
      <CostComparisonChart />
      <div className="legend legend--split">
        <span className="legend__unit">PKR (Millions)</span>
        <div className="legend__group">
          <span className="legend__item">
            <span className="legend__swatch" style={{ background: 'var(--brand-muted)' }} />
            Baseline Cost
          </span>
          <span className="legend__item">
            <span className="legend__swatch" style={{ background: 'var(--brand-primary)' }} />
            Actual Cost
          </span>
        </div>
        <span className="legend__unit" aria-hidden="true" style={{ visibility: 'hidden' }}>
          PKR (Millions)
        </span>
      </div>
    </Card>
  );
}

/* ------------------------------------------------ row 2: saving summary */

export function SavingSummaryCard() {
  return (
    <Card title="Saving Summary" meta="Monthly" className="col-292 card--gap-19">
      <SavingGauge />
      <div className="summary-rows">
        {savingSummary.groups.map((group, gi) => (
          <div className="summary-group" key={gi}>
            <span className="summary-group__rule" />
            <div className="summary-group__lines">
              {group.map((row) => (
                <div className="summary-row" key={row.label}>
                  <span className="summary-row__label">{row.label}</span>
                  <span className="summary-row__figure">
                    <span className="summary-row__value">{row.value}</span>
                    <span className="summary-row__unit">{row.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* --------------------------------------------- row 3: energy breakdown */

export function EnergyBreakdownCard() {
  return (
    <Card title="Energy Breakdown" className="col-529 card--gap-22">
      <div className="breakdown">
        <div className="breakdown__row">
          <DonutChart />
          <div className="breakdown__legend">
            {energyBreakdown.slices.map((slice) => (
              <div className="breakdown__item" key={slice.label}>
                <span className="breakdown__dot" style={{ background: slice.color }} />
                <span className="breakdown__name">{slice.label}</span>
                <span className="breakdown__pct">{slice.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="breakdown__footer">
          <span>Total Zones:</span>
          <strong>{energyBreakdown.totalZones}</strong>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------- row 3: top equipment */

export function TopEquipmentCard() {
  return (
    <Card title="Top Energy Consuming Equipment" className="col-529 card--gap-22">
      <div className="equip">
        <div className="equip__row equip__row--head">
          <div className="equip__name">
            <span className="equip__head-label equip__head-label--first">
              {topEquipment.columns[0]}
            </span>
          </div>
          <div className="equip__figures equip__figures--head">
            <span className="equip__head-label">{topEquipment.columns[1]}</span>
            <span className="equip__head-label">{topEquipment.columns[2]}</span>
          </div>
        </div>

        {topEquipment.rows.map((row) => (
          <div className="equip__row" key={row.name}>
            <div className="equip__name">
              <Icon name={row.icon} size={14} color="var(--icon-secondary)" />
              <span className="equip__label">{row.name}</span>
            </div>
            <div className="equip__figures">
              <span className="equip__consumption">{row.consumption}</span>
              <span className="equip__bar-wrap">
                {/* fixed pixel width, straight from the design — there is no track */}
                <span className="equip__bar" style={{ width: row.bar }} />
              </span>
              <span className="equip__percent">{row.percent}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ----------------------------------------------- row 3: utility overview */

export function UtilityOverviewCard() {
  return (
    <Card title="Utility Overview" className="col-390">
      <div className="utility">
        {utilityOverview.map((item, i) => (
          <Fragment key={item.name}>
            {i > 0 ? <span className="utility__divider" /> : null}
            <div className="utility__row">
              <div className="utility__lead">
                <span className="utility__tile" style={{ background: item.tile }}>
                  <Icon
                    name={item.icon}
                    size={18}
                    color="var(--icon-on-color)"
                    strokeWidth={2}
                    filled={item.icon === 'sun' || item.icon === 'flame'}
                  />
                </span>
                <span className="utility__name">{item.name}</span>
              </div>
              <div className="utility__figures">
                <span className="utility__amount" style={{ color: item.amountColor }}>
                  {item.amount}
                  {item.amountSuffix ? <sup>{item.amountSuffix}</sup> : null}
                </span>
                <span className="utility__cost">{item.cost}</span>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </Card>
  );
}

/* -------------------------------------------------- row 4: power quality */

/**
 * Not built on <Card>: this one is full-bleed (Figma 3159:8696 has no padding
 * on the container — only the 16px head), and its rows alternate white with
 * status/neutral/background.
 */
export function PowerQualityCard() {
  const [param, ...lanes] = powerQuality.columns;
  const avg = lanes.pop() as string;

  return (
    <section className="card card--flush col-564">
      <div className="pq__title">
        <h2 className="card__title">Power Quality</h2>
      </div>

      <div className="pq">
        <div className="pq__head">
          <div className="pq__cell pq__cell--param">
            <span className="pq__head-label">{param}</span>
          </div>
          {lanes.map((c) => (
            <div className="pq__cell pq__cell--lane" key={c}>
              <span className="pq__head-label">{c}</span>
            </div>
          ))}
          <div className="pq__cell pq__cell--avg">
            <span className="pq__head-label pq__avg-width">{avg}</span>
          </div>
        </div>

        <div className="pq__body">
          {powerQuality.rows.map((row, i) => (
            <div className={`pq__row${i % 2 === 1 ? ' pq__row--alt' : ''}`} key={row.parameter}>
              <div className="pq__cell pq__cell--param">
                <span className="pq__param">{row.parameter}</span>
              </div>
              <div className="pq__cell pq__cell--lane">
                <span className="pq__value">{row.l1}</span>
              </div>
              <div className="pq__cell pq__cell--lane">
                <span className="pq__value">{row.l2}</span>
              </div>
              <div className="pq__cell pq__cell--lane">
                <span className="pq__value">{row.l3}</span>
              </div>
              <div className="pq__cell pq__cell--avg">
                <span className="pq__value pq__value--avg pq__avg-width">{row.avg}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------ row 4: energy intensity */

export function EnergyIntensityCard() {
  return (
    <section className="card card--flush col-442">
      <div className="pq__title">
        <h2 className="card__title">
          Energy Intensity
          <span className="card__subtitle"> {energyIntensity.subtitle}</span>
        </h2>
      </div>

      <div className="intensity">
        {energyIntensity.stats.map((stat, i) => (
          <Fragment key={stat.label}>
            {i > 0 ? <span className="intensity__rule" /> : null}
            <div className="intensity__stat">
              <span className="intensity__label">{stat.label}</span>
              <div className="intensity__figure">
                <span className="intensity__value" style={{ color: stat.color }}>
                  {stat.value}
                </span>
                <span className="intensity__unit">{stat.unit}</span>
              </div>
            </div>
          </Fragment>
        ))}
        <span className="intensity__rule" />
        <div className="intensity__stat">
          <span className="intensity__label">{energyIntensity.improvement.label}</span>
          <span className="intensity__improve">{energyIntensity.improvement.value}</span>
        </div>
      </div>

      <AreaTrendChart
        series={energyIntensity.series}
        labels={energyIntensity.months}
        yTicks={energyIntensity.yTicks}
        color="#8286e0"
        gradientId="intensityFill"
        ariaLabel="Energy intensity trend"
        height={177}
      />
    </section>
  );
}

/* --------------------------------------------- row 4: energy saving trend */

export function EnergySavingTrendCard() {
  return (
    <section className="card card--flush col-442">
      <div className="pq__title">
        <h2 className="card__title">Energy Saving Trend</h2>
      </div>

      <div className="trend">
        <span className="trend__label">{energySavingTrend.label}</span>
        <span className="trend__value">{energySavingTrend.value}</span>
      </div>

      <AreaTrendChart
        series={energySavingTrend.series}
        labels={energySavingTrend.months}
        yTicks={energySavingTrend.yTicks}
        color="#22b14c"
        formatTick={energySavingTrend.yFormat}
        gradientId="savingFill"
        ariaLabel="Energy saving trend"
        height={197}
      />
    </section>
  );
}

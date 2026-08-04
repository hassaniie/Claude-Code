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
    <Card title="Real-Time Load Curve" meta="(24h)" className="col-578">
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
    <Card title="Energy Cost Comparison" meta="Monthly" className="col-578">
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
    <Card title="Saving Summary" meta="Monthly" className="col-292">
      <SavingGauge />
      <div className="summary-rows">
        {savingSummary.rows.map((row) => (
          <div className="summary-row" key={row.label}>
            <span className="summary-row__label">{row.label}</span>
            <span>
              <span className="summary-row__value">{row.value}</span>
              <span className="summary-row__unit">{row.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* --------------------------------------------- row 3: energy breakdown */

export function EnergyBreakdownCard() {
  return (
    <Card title="Energy Breakdown" className="col-529">
      <div className="breakdown">
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
        Total Zones: <strong>{energyBreakdown.totalZones}</strong>
      </div>
    </Card>
  );
}

/* ------------------------------------------------- row 3: top equipment */

const equipmentIcons = ['boiler', 'chiller', 'compressor', 'productionLine', 'ahu'];

export function TopEquipmentCard() {
  const max = Math.max(...topEquipment.rows.map((r) => r.percent));

  return (
    <Card title="Top Energy Consuming Equipment" className="col-529">
      <table className="table">
        <thead>
          <tr>
            <th>{topEquipment.columns[0]}</th>
            <th className="table__num">{topEquipment.columns[1]}</th>
            <th className="table__meter-cell">{topEquipment.columns[2]}</th>
          </tr>
        </thead>
        <tbody>
          {topEquipment.rows.map((row, i) => (
            <tr key={row.name}>
              <td>
                <span className="table__equipment">
                  <Icon name={equipmentIcons[i]} size={14} color="var(--icon-secondary)" />
                  {row.name}
                </span>
              </td>
              <td className="table__num">{row.consumption}</td>
              <td className="table__meter-cell">
                <span className="meter">
                  <span className="meter__track">
                    <span
                      className="meter__fill"
                      style={{ width: `${(row.percent / max) * 100}%` }}
                    />
                  </span>
                  <span className="meter__value">{row.percent}%</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

export function PowerQualityCard() {
  return (
    <Card title="Power Quality" className="col-564">
      <table className="table table--banded">
        <thead>
          <tr>
            <th>{powerQuality.columns[0]}</th>
            {powerQuality.columns.slice(1).map((c) => (
              <th key={c} className="table__num">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {powerQuality.rows.map((row) => (
            <tr key={row.parameter}>
              <td>{row.parameter}</td>
              <td className="table__num">{row.l1}</td>
              <td className="table__num">{row.l2}</td>
              <td className="table__num">{row.l3}</td>
              <td className="table__num table__avg">{row.avg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* ------------------------------------------------ row 4: energy intensity */

export function EnergyIntensityCard() {
  return (
    <Card title="Energy Intensity" subtitle={energyIntensity.subtitle} className="col-442">
      <div className="intensity">
        {energyIntensity.stats.map((stat) => (
          <div className="intensity__stat" key={stat.label}>
            <span className="intensity__label">{stat.label}</span>
            <span
              className={`intensity__value${stat.tone === 'brand' ? ' intensity__value--brand' : ''}`}
            >
              {stat.value}
            </span>
            <span className="intensity__unit">{stat.unit}</span>
          </div>
        ))}
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
        height={128}
      />
    </Card>
  );
}

/* --------------------------------------------- row 4: energy saving trend */

export function EnergySavingTrendCard() {
  return (
    <Card title="Energy Saving Trend" className="col-442">
      <div>
        <div className="trend__label">{energySavingTrend.label}</div>
        <div className="trend__value">{energySavingTrend.value}</div>
      </div>

      <AreaTrendChart
        series={energySavingTrend.series}
        labels={energySavingTrend.months}
        yTicks={energySavingTrend.yTicks}
        color="#22b14c"
        formatTick={energySavingTrend.yFormat}
        gradientId="savingFill"
        ariaLabel="Energy saving trend"
        height={150}
      />
    </Card>
  );
}

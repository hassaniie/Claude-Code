import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { StatCard } from './components/StatCard';
import { TopBar } from './components/TopBar';
import {
  CostComparisonCard,
  EnergyBreakdownCard,
  EnergyIntensityCard,
  EnergySavingTrendCard,
  LoadCurveCard,
  PowerQualityCard,
  SavingSummaryCard,
  TopEquipmentCard,
  UtilityOverviewCard,
} from './components/cards';
import { statCards } from './data/dashboard';

/**
 * EnerSenX — Energy Monitoring System dashboard.
 * Figma: node 3159:8131 in "General BMS Design".
 */
export default function App() {
  return (
    <div className="app">
      <TopBar />

      <div className="shell">
        <Sidebar activeId="dashboard" />

        <main className="main">
          <Header mode="light" />

          <div className="content">
            <div className="row row--stats">
              {statCards.map((card) => (
                <StatCard key={card.label} data={card} />
              ))}
            </div>

            <div className="row row--charts">
              <LoadCurveCard />
              <CostComparisonCard />
              <SavingSummaryCard />
            </div>

            <div className="row row--data">
              <EnergyBreakdownCard />
              <TopEquipmentCard />
              <UtilityOverviewCard />
            </div>

            <div className="row row--wide">
              <PowerQualityCard />
              <EnergyIntensityCard />
              <EnergySavingTrendCard />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

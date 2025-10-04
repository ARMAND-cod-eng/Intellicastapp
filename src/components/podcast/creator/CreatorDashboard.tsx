import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Play,
  DollarSign,
  MapPin,
  Clock,
  Award,
  BarChart3,
  PieChart,
  Upload,
} from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '../../ui/GlassCard';
import {
  CreatorAnalyticsService,
  DemographicsService,
  MonetizationService,
  type CreatorAnalytics,
} from '../../../services/creatorService';

interface CreatorDashboardProps {
  showId: string;
}

const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ showId }) => {
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [showId]);

  const loadAnalytics = () => {
    const data = CreatorAnalyticsService.getAnalytics(showId);
    setAnalytics(data);
  };

  if (!analytics) {
    return (
      <div className="p-8">
        <GlassCard className="p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4" style={{ color: '#00D4E4', opacity: 0.3 }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
            Loading analytics...
          </h3>
        </GlassCard>
      </div>
    );
  }

  const revenueBreakdown = MonetizationService.getRevenueBreakdown(showId);
  const topAgeGroup = DemographicsService.getTopAgeGroup(showId);
  const topLocation = DemographicsService.getTopLocation(showId);
  const peakHour = DemographicsService.getPeakListeningTime(showId);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
          Creator Dashboard
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          Analytics and insights for your podcast
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(['7d', '30d', '90d'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className="px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor:
                selectedPeriod === period ? 'rgba(0, 212, 228, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: selectedPeriod === period ? '#00D4E4' : 'rgba(255, 255, 255, 0.6)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: selectedPeriod === period ? '#00D4E4' : 'transparent',
            }}
          >
            {period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
          </button>
        ))}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={Play}
          iconColor="#00D4E4"
          title="Total Plays"
          value={analytics.totalPlays.toLocaleString()}
          change={`+${analytics.growthRate}%`}
          changePositive={true}
        />

        <MetricCard
          icon={Users}
          iconColor="#EC4899"
          title="Total Listeners"
          value={analytics.totalListeners.toLocaleString()}
          change="+12.5%"
          changePositive={true}
        />

        <MetricCard
          icon={Award}
          iconColor="#F59E0B"
          title="Avg. Completion"
          value={`${analytics.averageCompletion}%`}
          change="+3.2%"
          changePositive={true}
        />

        <MetricCard
          icon={DollarSign}
          iconColor="#10B981"
          title="Total Revenue"
          value={`$${analytics.monetization.totalRevenue.toLocaleString()}`}
          change="+18.7%"
          changePositive={true}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Plays Over Time */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5" style={{ color: '#00D4E4' }} />
              <h3 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
                Plays Over Time
              </h3>
            </div>
          </div>

          {/* Simple Line Chart Visualization */}
          <div className="h-48 flex items-end gap-1">
            {analytics.recentActivity.slice(-30).map((point, index) => {
              const maxPlays = Math.max(...analytics.recentActivity.map((a) => a.plays));
              const height = (point.plays / maxPlays) * 100;

              return (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: index * 0.02 }}
                  className="flex-1 rounded-t"
                  style={{
                    background: 'linear-gradient(180deg, #00D4E4 0%, #00E8FA 100%)',
                    minHeight: '4px',
                  }}
                  title={`${point.plays} plays`}
                />
              );
            })}
          </div>

          <div className="mt-4 text-sm text-center" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Last 30 days
          </div>
        </GlassCard>

        {/* Revenue Breakdown */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-5 h-5" style={{ color: '#10B981' }} />
            <h3 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
              Revenue Breakdown
            </h3>
          </div>

          <div className="space-y-4">
            <RevenueBar
              label="Sponsorships"
              amount={revenueBreakdown.sponsorships}
              total={analytics.monetization.totalRevenue}
              color="#00D4E4"
            />
            <RevenueBar
              label="Donations"
              amount={revenueBreakdown.donations}
              total={analytics.monetization.totalRevenue}
              color="#EC4899"
            />
            <RevenueBar
              label="Subscriptions"
              amount={revenueBreakdown.subscriptions}
              total={analytics.monetization.totalRevenue}
              color="#F59E0B"
            />
            <RevenueBar
              label="Ad Revenue"
              amount={revenueBreakdown.ads}
              total={analytics.monetization.totalRevenue}
              color="#10B981"
            />
          </div>
        </GlassCard>
      </div>

      {/* Top Episodes */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5" style={{ color: '#F59E0B' }} />
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
            Top Performing Episodes
          </h2>
        </div>

        <div className="space-y-3">
          {analytics.topEpisodes.map((episode, index) => (
            <motion.div
              key={episode.episodeId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                    style={{
                      background:
                        index === 0
                          ? 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
                          : 'rgba(0, 212, 228, 0.2)',
                      color: index === 0 ? '#FFFFFF' : '#00D4E4',
                    }}
                  >
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold mb-1" style={{ color: '#FFFFFF' }}>
                      {episode.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      <span>{episode.plays.toLocaleString()} plays</span>
                      <span>•</span>
                      <span>{episode.completion}% completion</span>
                      <span>•</span>
                      <span>⭐ {episode.averageRating}</span>
                    </div>
                  </div>

                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold" style={{ color: '#00D4E4' }}>
                        {episode.comments}
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Comments</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold" style={{ color: '#EC4899' }}>
                        {episode.shares}
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Shares</div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Demographics */}
      <div className="grid grid-cols-3 gap-6">
        {/* Age Groups */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5" style={{ color: '#00D4E4' }} />
            <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
              Age Distribution
            </h3>
          </div>

          <div className="space-y-3">
            {analytics.demographics.ageGroups.map((group) => (
              <div key={group.range}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{group.range}</span>
                  <span style={{ color: '#00D4E4' }}>{group.percentage}%</span>
                </div>
                <div className="h-2 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${group.percentage}%`,
                      background: 'linear-gradient(90deg, #00D4E4 0%, #00E8FA 100%)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Top Age Group
            </div>
            <div className="text-xl font-bold" style={{ color: '#00D4E4' }}>
              {topAgeGroup}
            </div>
          </div>
        </GlassCard>

        {/* Top Locations */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-5 h-5" style={{ color: '#EC4899' }} />
            <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
              Top Locations
            </h3>
          </div>

          <div className="space-y-3">
            {analytics.demographics.topLocations.map((location, index) => (
              <div key={location.country} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: 'rgba(236, 72, 153, 0.2)', color: '#EC4899' }}
                  >
                    {index + 1}
                  </div>
                  <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {location.country}
                  </span>
                </div>
                <span className="text-sm font-bold" style={{ color: '#EC4899' }}>
                  {location.percentage}%
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              #1 Country
            </div>
            <div className="text-xl font-bold" style={{ color: '#EC4899' }}>
              {topLocation}
            </div>
          </div>
        </GlassCard>

        {/* Listening Times */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <h3 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>
              Peak Hours
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {analytics.demographics.listeningTimes.map((time) => {
              const intensity = time.percentage / 15; // Scale to 0-1
              return (
                <div
                  key={time.hour}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: `rgba(245, 158, 11, ${0.1 + intensity * 0.3})`,
                  }}
                >
                  <div className="text-xs font-bold" style={{ color: '#F59E0B' }}>
                    {time.hour}:00
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {time.percentage}%
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Peak Time
            </div>
            <div className="text-xl font-bold" style={{ color: '#F59E0B' }}>
              {peakHour}:00 - {peakHour + 1}:00
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  icon: React.ElementType;
  iconColor: string;
  title: string;
  value: string;
  change: string;
  changePositive: boolean;
}> = ({ icon: Icon, iconColor, title, value, change, changePositive }) => {
  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <Icon className="w-6 h-6" style={{ color: iconColor }} />
        </div>

        <div
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: changePositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: changePositive ? '#10B981' : '#EF4444',
          }}
        >
          {change}
        </div>
      </div>

      <div className="text-3xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
        {title}
      </div>
    </GlassCard>
  );
};

// Revenue Bar Component
const RevenueBar: React.FC<{
  label: string;
  amount: number;
  total: number;
  color: string;
}> = ({ label, amount, total, color }) => {
  const percentage = (amount / total) * 100;

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{label}</span>
        <span style={{ color }}>${amount.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default CreatorDashboard;

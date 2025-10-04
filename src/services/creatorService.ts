// Creator Tools Service - Analytics, Demographics, Monetization

export interface CreatorAnalytics {
  showId: string;
  totalPlays: number;
  totalListeners: number;
  averageCompletion: number;
  totalListeningTime: number; // minutes
  growthRate: number; // percentage
  topEpisodes: EpisodeStats[];
  recentActivity: ActivityPoint[];
  demographics: Demographics;
  monetization: MonetizationStats;
}

export interface EpisodeStats {
  episodeId: string;
  title: string;
  plays: number;
  completion: number;
  averageRating: number;
  comments: number;
  shares: number;
  publishDate: Date;
}

export interface ActivityPoint {
  date: Date;
  plays: number;
  newListeners: number;
}

export interface Demographics {
  ageGroups: { range: string; percentage: number }[];
  topLocations: { country: string; percentage: number }[];
  listeningTimes: { hour: number; percentage: number }[];
  platforms: { platform: string; percentage: number }[];
  gender: { male: number; female: number; other: number };
}

export interface MonetizationStats {
  totalRevenue: number;
  sponsorships: SponsorshipDeal[];
  donations: number;
  subscriptions: number;
  adRevenue: number;
}

export interface SponsorshipDeal {
  id: string;
  sponsor: string;
  amount: number;
  episodeCount: number;
  status: 'active' | 'completed' | 'pending';
  startDate: Date;
  endDate?: Date;
}

export interface EpisodeUpload {
  id: string;
  title: string;
  description: string;
  audioFile?: File;
  coverArt?: File;
  status: 'draft' | 'processing' | 'published' | 'scheduled';
  publishDate?: Date;
  duration?: number;
  fileSize?: number;
}

const STORAGE_KEYS = {
  CREATOR_ANALYTICS: 'creator_analytics',
  EPISODE_UPLOADS: 'episode_uploads',
};

// ============= Analytics Service =============

export class CreatorAnalyticsService {
  static getAnalytics(showId: string): CreatorAnalytics {
    const stored = localStorage.getItem(`${STORAGE_KEYS.CREATOR_ANALYTICS}_${showId}`);
    if (stored) {
      return this.parseAnalytics(JSON.parse(stored));
    }
    return this.generateMockAnalytics(showId);
  }

  private static parseAnalytics(data: any): CreatorAnalytics {
    return {
      ...data,
      topEpisodes: data.topEpisodes.map((ep: any) => ({
        ...ep,
        publishDate: new Date(ep.publishDate),
      })),
      recentActivity: data.recentActivity.map((a: any) => ({
        ...a,
        date: new Date(a.date),
      })),
      monetization: {
        ...data.monetization,
        sponsorships: data.monetization.sponsorships.map((s: any) => ({
          ...s,
          startDate: new Date(s.startDate),
          endDate: s.endDate ? new Date(s.endDate) : undefined,
        })),
      },
    };
  }

  private static generateMockAnalytics(showId: string): CreatorAnalytics {
    // Generate realistic mock data
    const now = new Date();
    const recentActivity: ActivityPoint[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      recentActivity.push({
        date,
        plays: Math.floor(Math.random() * 500 + 200),
        newListeners: Math.floor(Math.random() * 50 + 10),
      });
    }

    return {
      showId,
      totalPlays: 125000,
      totalListeners: 45000,
      averageCompletion: 78,
      totalListeningTime: 180000,
      growthRate: 15.5,
      topEpisodes: [
        {
          episodeId: 'ep1',
          title: 'The Future of AI',
          plays: 12500,
          completion: 85,
          averageRating: 4.7,
          comments: 234,
          shares: 89,
          publishDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          episodeId: 'ep2',
          title: 'Quantum Computing Explained',
          plays: 10200,
          completion: 82,
          averageRating: 4.5,
          comments: 198,
          shares: 67,
          publishDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
        {
          episodeId: 'ep3',
          title: 'Machine Learning Basics',
          plays: 9800,
          completion: 79,
          averageRating: 4.6,
          comments: 156,
          shares: 54,
          publishDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        },
      ],
      recentActivity,
      demographics: {
        ageGroups: [
          { range: '18-24', percentage: 15 },
          { range: '25-34', percentage: 35 },
          { range: '35-44', percentage: 28 },
          { range: '45-54', percentage: 15 },
          { range: '55+', percentage: 7 },
        ],
        topLocations: [
          { country: 'United States', percentage: 45 },
          { country: 'United Kingdom', percentage: 12 },
          { country: 'Canada', percentage: 8 },
          { country: 'Germany', percentage: 7 },
          { country: 'Australia', percentage: 6 },
        ],
        listeningTimes: [
          { hour: 6, percentage: 8 },
          { hour: 7, percentage: 12 },
          { hour: 8, percentage: 15 },
          { hour: 9, percentage: 10 },
          { hour: 12, percentage: 8 },
          { hour: 17, percentage: 12 },
          { hour: 18, percentage: 14 },
          { hour: 19, percentage: 11 },
          { hour: 20, percentage: 10 },
        ],
        platforms: [
          { platform: 'Web', percentage: 40 },
          { platform: 'iOS', percentage: 35 },
          { platform: 'Android', percentage: 20 },
          { platform: 'Desktop App', percentage: 5 },
        ],
        gender: {
          male: 58,
          female: 38,
          other: 4,
        },
      },
      monetization: {
        totalRevenue: 12500,
        sponsorships: [
          {
            id: 'sp1',
            sponsor: 'TechCorp Inc.',
            amount: 5000,
            episodeCount: 4,
            status: 'active',
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
          {
            id: 'sp2',
            sponsor: 'Innovation Labs',
            amount: 3500,
            episodeCount: 3,
            status: 'completed',
            startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
        ],
        donations: 2500,
        subscriptions: 1000,
        adRevenue: 500,
      },
    };
  }

  static saveAnalytics(showId: string, analytics: CreatorAnalytics): void {
    localStorage.setItem(`${STORAGE_KEYS.CREATOR_ANALYTICS}_${showId}`, JSON.stringify(analytics));
  }

  static getGrowthTrend(showId: string, days: number = 30): { date: Date; value: number }[] {
    const analytics = this.getAnalytics(showId);
    return analytics.recentActivity.slice(-days).map((a) => ({
      date: a.date,
      value: a.plays,
    }));
  }

  static getTopPerformers(showId: string, limit: number = 5): EpisodeStats[] {
    const analytics = this.getAnalytics(showId);
    return analytics.topEpisodes.slice(0, limit);
  }

  static calculateEngagementRate(showId: string): number {
    const analytics = this.getAnalytics(showId);
    const totalEngagement =
      analytics.topEpisodes.reduce((sum, ep) => sum + ep.comments + ep.shares, 0);
    const engagementRate = (totalEngagement / analytics.totalPlays) * 100;
    return Math.round(engagementRate * 100) / 100;
  }
}

// ============= Episode Upload Service =============

export class EpisodeUploadService {
  static getUploads(): EpisodeUpload[] {
    const stored = localStorage.getItem(STORAGE_KEYS.EPISODE_UPLOADS);
    if (!stored) return [];
    return JSON.parse(stored).map((u: any) => ({
      ...u,
      publishDate: u.publishDate ? new Date(u.publishDate) : undefined,
    }));
  }

  static saveUploads(uploads: EpisodeUpload[]): void {
    localStorage.setItem(STORAGE_KEYS.EPISODE_UPLOADS, JSON.stringify(uploads));
  }

  static createUpload(data: Partial<EpisodeUpload>): EpisodeUpload {
    const uploads = this.getUploads();

    const newUpload: EpisodeUpload = {
      id: `upload_${Date.now()}`,
      title: data.title || 'Untitled Episode',
      description: data.description || '',
      status: 'draft',
      ...data,
    };

    uploads.push(newUpload);
    this.saveUploads(uploads);
    return newUpload;
  }

  static updateUpload(id: string, data: Partial<EpisodeUpload>): void {
    const uploads = this.getUploads();
    const index = uploads.findIndex((u) => u.id === id);

    if (index >= 0) {
      uploads[index] = { ...uploads[index], ...data };
      this.saveUploads(uploads);
    }
  }

  static deleteUpload(id: string): void {
    const uploads = this.getUploads();
    const filtered = uploads.filter((u) => u.id !== id);
    this.saveUploads(filtered);
  }

  static publishEpisode(id: string, publishDate?: Date): void {
    this.updateUpload(id, {
      status: 'published',
      publishDate: publishDate || new Date(),
    });
  }

  static scheduleEpisode(id: string, publishDate: Date): void {
    this.updateUpload(id, {
      status: 'scheduled',
      publishDate,
    });
  }

  static getByStatus(status: EpisodeUpload['status']): EpisodeUpload[] {
    return this.getUploads().filter((u) => u.status === status);
  }
}

// ============= Monetization Service =============

export class MonetizationService {
  static addSponsorship(
    showId: string,
    sponsorship: Omit<SponsorshipDeal, 'id'>
  ): void {
    const analytics = CreatorAnalyticsService.getAnalytics(showId);

    const newSponsorship: SponsorshipDeal = {
      ...sponsorship,
      id: `sp_${Date.now()}`,
    };

    analytics.monetization.sponsorships.push(newSponsorship);
    analytics.monetization.totalRevenue += sponsorship.amount;

    CreatorAnalyticsService.saveAnalytics(showId, analytics);
  }

  static updateSponsorship(
    showId: string,
    sponsorshipId: string,
    updates: Partial<SponsorshipDeal>
  ): void {
    const analytics = CreatorAnalyticsService.getAnalytics(showId);
    const index = analytics.monetization.sponsorships.findIndex(
      (s) => s.id === sponsorshipId
    );

    if (index >= 0) {
      analytics.monetization.sponsorships[index] = {
        ...analytics.monetization.sponsorships[index],
        ...updates,
      };
      CreatorAnalyticsService.saveAnalytics(showId, analytics);
    }
  }

  static getActiveDeals(showId: string): SponsorshipDeal[] {
    const analytics = CreatorAnalyticsService.getAnalytics(showId);
    return analytics.monetization.sponsorships.filter((s) => s.status === 'active');
  }

  static getRevenueBreakdown(showId: string): {
    sponsorships: number;
    donations: number;
    subscriptions: number;
    ads: number;
  } {
    const analytics = CreatorAnalyticsService.getAnalytics(showId);
    const sponsorshipRevenue = analytics.monetization.sponsorships
      .filter((s) => s.status === 'completed' || s.status === 'active')
      .reduce((sum, s) => sum + s.amount, 0);

    return {
      sponsorships: sponsorshipRevenue,
      donations: analytics.monetization.donations,
      subscriptions: analytics.monetization.subscriptions,
      ads: analytics.monetization.adRevenue,
    };
  }
}

// ============= Demographics Service =============

export class DemographicsService {
  static getDemographics(showId: string): Demographics {
    const analytics = CreatorAnalyticsService.getAnalytics(showId);
    return analytics.demographics;
  }

  static getTopAgeGroup(showId: string): string {
    const demographics = this.getDemographics(showId);
    const top = demographics.ageGroups.reduce((max, group) =>
      group.percentage > max.percentage ? group : max
    );
    return top.range;
  }

  static getTopLocation(showId: string): string {
    const demographics = this.getDemographics(showId);
    return demographics.topLocations[0].country;
  }

  static getPeakListeningTime(showId: string): number {
    const demographics = this.getDemographics(showId);
    const peak = demographics.listeningTimes.reduce((max, time) =>
      time.percentage > max.percentage ? time : max
    );
    return peak.hour;
  }

  static getTopPlatform(showId: string): string {
    const demographics = this.getDemographics(showId);
    return demographics.platforms[0].platform;
  }
}

// ============= Export Combined Service =============

export const CreatorService = {
  analytics: CreatorAnalyticsService,
  uploads: EpisodeUploadService,
  monetization: MonetizationService,
  demographics: DemographicsService,
};

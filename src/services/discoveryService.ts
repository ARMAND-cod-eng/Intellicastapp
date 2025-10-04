// Discovery Enhancements - Playlists, Topics, Guest Tracking, Cross-Episode Recommendations

import { PREBUILT_SHOWS, PREBUILT_EPISODES } from '../data/prebuiltPodcasts';
import type { PodcastShow, PodcastEpisode } from '../types/podcast';

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverArt: string;
  creator: string;
  episodeIds: string[];
  isOfficial: boolean;
  followers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  icon: string;
  episodeCount: number;
  relatedTopics: string[];
  trending: boolean;
}

export interface Guest {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  expertise: string[];
  appearances: GuestAppearance[];
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}

export interface GuestAppearance {
  episodeId: string;
  showId: string;
  role: 'host' | 'co-host' | 'guest' | 'interviewer';
  timestamp?: number;
}

export interface CrossEpisodeRecommendation {
  episodeId: string;
  reason: string;
  score: number;
  relatedEpisodeIds: string[];
}

const STORAGE_KEYS = {
  PLAYLISTS: 'discovery_playlists',
  USER_PLAYLISTS: 'discovery_user_playlists',
  FOLLOWED_TOPICS: 'discovery_followed_topics',
};

// ============= Playlist Service =============

export class PlaylistService {
  static getOfficialPlaylists(): Playlist[] {
    return [
      {
        id: 'pl_trending',
        title: 'Trending Now',
        description: 'The hottest episodes everyone is talking about',
        coverArt: '🔥',
        creator: 'Intellicast',
        episodeIds: ['ep_tech_1', 'ep_tech_2', 'ep_biz_1', 'ep_sci_1'],
        isOfficial: true,
        followers: 125000,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
      {
        id: 'pl_ai_deep_dive',
        title: 'AI Deep Dive',
        description: 'Comprehensive episodes about artificial intelligence',
        coverArt: '🤖',
        creator: 'Intellicast',
        episodeIds: ['ep_tech_1', 'ep_tech_3', 'ep_sci_2'],
        isOfficial: true,
        followers: 89000,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'pl_quick_hits',
        title: 'Quick Hits',
        description: 'Episodes under 15 minutes for your commute',
        coverArt: '⚡',
        creator: 'Intellicast',
        episodeIds: ['ep_tech_2', 'ep_biz_2'],
        isOfficial: true,
        followers: 67000,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'pl_weekend_binge',
        title: 'Weekend Binge',
        description: 'Long-form episodes perfect for weekend listening',
        coverArt: '🎧',
        creator: 'Intellicast',
        episodeIds: ['ep_tech_1', 'ep_biz_1', 'ep_sci_1', 'ep_sci_3'],
        isOfficial: true,
        followers: 54000,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'pl_beginner_friendly',
        title: 'Beginner Friendly',
        description: 'Perfect for those new to tech topics',
        coverArt: '🌱',
        creator: 'Intellicast',
        episodeIds: ['ep_tech_2', 'ep_sci_2', 'ep_biz_2'],
        isOfficial: true,
        followers: 42000,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ];
  }

  static getUserPlaylists(): Playlist[] {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PLAYLISTS);
    if (!stored) return [];
    return JSON.parse(stored).map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }));
  }

  static saveUserPlaylists(playlists: Playlist[]): void {
    localStorage.setItem(STORAGE_KEYS.USER_PLAYLISTS, JSON.stringify(playlists));
  }

  static createPlaylist(
    title: string,
    description: string,
    coverArt: string = '🎵'
  ): Playlist {
    const userPlaylists = this.getUserPlaylists();

    const newPlaylist: Playlist = {
      id: `pl_user_${Date.now()}`,
      title,
      description,
      coverArt,
      creator: 'You',
      episodeIds: [],
      isOfficial: false,
      followers: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    userPlaylists.push(newPlaylist);
    this.saveUserPlaylists(userPlaylists);
    return newPlaylist;
  }

  static addToPlaylist(playlistId: string, episodeId: string): void {
    const userPlaylists = this.getUserPlaylists();
    const playlist = userPlaylists.find((p) => p.id === playlistId);

    if (playlist && !playlist.episodeIds.includes(episodeId)) {
      playlist.episodeIds.push(episodeId);
      playlist.updatedAt = new Date();
      this.saveUserPlaylists(userPlaylists);
    }
  }

  static removeFromPlaylist(playlistId: string, episodeId: string): void {
    const userPlaylists = this.getUserPlaylists();
    const playlist = userPlaylists.find((p) => p.id === playlistId);

    if (playlist) {
      playlist.episodeIds = playlist.episodeIds.filter((id) => id !== episodeId);
      playlist.updatedAt = new Date();
      this.saveUserPlaylists(userPlaylists);
    }
  }

  static deletePlaylist(playlistId: string): void {
    const userPlaylists = this.getUserPlaylists();
    const filtered = userPlaylists.filter((p) => p.id !== playlistId);
    this.saveUserPlaylists(filtered);
  }

  static getAllPlaylists(): Playlist[] {
    return [...this.getOfficialPlaylists(), ...this.getUserPlaylists()];
  }

  static getPlaylistById(playlistId: string): Playlist | null {
    const all = this.getAllPlaylists();
    return all.find((p) => p.id === playlistId) || null;
  }
}

// ============= Topic Discovery Service =============

export class TopicDiscoveryService {
  static getAllTopics(): Topic[] {
    return [
      {
        id: 'topic_ai',
        name: 'Artificial Intelligence',
        description: 'Machine learning, neural networks, and AI applications',
        icon: '🤖',
        episodeCount: 45,
        relatedTopics: ['topic_ml', 'topic_robotics', 'topic_ethics'],
        trending: true,
      },
      {
        id: 'topic_ml',
        name: 'Machine Learning',
        description: 'Deep learning, algorithms, and practical ML applications',
        icon: '🧠',
        episodeCount: 38,
        relatedTopics: ['topic_ai', 'topic_data_science'],
        trending: true,
      },
      {
        id: 'topic_blockchain',
        name: 'Blockchain & Web3',
        description: 'Cryptocurrency, DeFi, NFTs, and decentralized systems',
        icon: '⛓️',
        episodeCount: 32,
        relatedTopics: ['topic_crypto', 'topic_finance'],
        trending: true,
      },
      {
        id: 'topic_quantum',
        name: 'Quantum Computing',
        description: 'Quantum mechanics applied to computing',
        icon: '⚛️',
        episodeCount: 18,
        relatedTopics: ['topic_physics', 'topic_computing'],
        trending: false,
      },
      {
        id: 'topic_climate',
        name: 'Climate Tech',
        description: 'Technology solutions for climate change',
        icon: '🌍',
        episodeCount: 28,
        relatedTopics: ['topic_energy', 'topic_sustainability'],
        trending: true,
      },
      {
        id: 'topic_space',
        name: 'Space Exploration',
        description: 'Space missions, astronomy, and cosmic discoveries',
        icon: '🚀',
        episodeCount: 24,
        relatedTopics: ['topic_physics', 'topic_engineering'],
        trending: false,
      },
      {
        id: 'topic_biotech',
        name: 'Biotechnology',
        description: 'Gene editing, synthetic biology, and medical tech',
        icon: '🧬',
        episodeCount: 22,
        relatedTopics: ['topic_medicine', 'topic_genetics'],
        trending: true,
      },
      {
        id: 'topic_robotics',
        name: 'Robotics',
        description: 'Automation, humanoid robots, and robotic systems',
        icon: '🦾',
        episodeCount: 20,
        relatedTopics: ['topic_ai', 'topic_engineering'],
        trending: false,
      },
    ];
  }

  static getTrendingTopics(): Topic[] {
    return this.getAllTopics().filter((t) => t.trending);
  }

  static getTopicById(topicId: string): Topic | null {
    return this.getAllTopics().find((t) => t.id === topicId) || null;
  }

  static getRelatedTopics(topicId: string): Topic[] {
    const topic = this.getTopicById(topicId);
    if (!topic) return [];

    const allTopics = this.getAllTopics();
    return topic.relatedTopics
      .map((id) => allTopics.find((t) => t.id === id))
      .filter((t): t is Topic => t !== undefined);
  }

  static searchTopics(query: string): Topic[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTopics().filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
    );
  }

  static getFollowedTopics(): string[] {
    const stored = localStorage.getItem(STORAGE_KEYS.FOLLOWED_TOPICS);
    return stored ? JSON.parse(stored) : [];
  }

  static toggleFollowTopic(topicId: string): boolean {
    const followed = this.getFollowedTopics();
    const index = followed.indexOf(topicId);

    if (index >= 0) {
      followed.splice(index, 1);
      localStorage.setItem(STORAGE_KEYS.FOLLOWED_TOPICS, JSON.stringify(followed));
      return false;
    } else {
      followed.push(topicId);
      localStorage.setItem(STORAGE_KEYS.FOLLOWED_TOPICS, JSON.stringify(followed));
      return true;
    }
  }

  static isFollowing(topicId: string): boolean {
    return this.getFollowedTopics().includes(topicId);
  }
}

// ============= Guest Tracking Service =============

export class GuestTrackingService {
  static getAllGuests(): Guest[] {
    return [
      {
        id: 'guest_1',
        name: 'Dr. Sarah Chen',
        bio: 'AI researcher and professor at MIT, specializing in neural networks',
        avatar: '👩‍🔬',
        expertise: ['Artificial Intelligence', 'Machine Learning', 'Neural Networks'],
        appearances: [
          { episodeId: 'ep_tech_1', showId: 'show_tech_titans', role: 'guest' },
          { episodeId: 'ep_sci_2', showId: 'show_science_simplified', role: 'guest' },
        ],
        socialLinks: {
          twitter: '@drsarahchen',
          linkedin: 'sarah-chen-ai',
          website: 'sarahchen.ai',
        },
      },
      {
        id: 'guest_2',
        name: 'Marcus Rodriguez',
        bio: 'Former SpaceX engineer, now leading quantum computing research',
        avatar: '👨‍💻',
        expertise: ['Quantum Computing', 'Space Technology', 'Engineering'],
        appearances: [
          { episodeId: 'ep_tech_3', showId: 'show_tech_titans', role: 'guest' },
          { episodeId: 'ep_sci_1', showId: 'show_science_simplified', role: 'guest' },
        ],
        socialLinks: {
          twitter: '@marcusqc',
          linkedin: 'marcus-rodriguez',
        },
      },
      {
        id: 'guest_3',
        name: 'Emily Watson',
        bio: 'Blockchain entrepreneur and Web3 advocate',
        avatar: '👩‍💼',
        expertise: ['Blockchain', 'Cryptocurrency', 'Web3', 'DeFi'],
        appearances: [
          { episodeId: 'ep_biz_1', showId: 'show_biz_insider', role: 'guest' },
        ],
        socialLinks: {
          twitter: '@emilyweb3',
          website: 'emilywatson.eth',
        },
      },
    ];
  }

  static getGuestById(guestId: string): Guest | null {
    return this.getAllGuests().find((g) => g.id === guestId) || null;
  }

  static searchGuests(query: string): Guest[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllGuests().filter(
      (g) =>
        g.name.toLowerCase().includes(lowerQuery) ||
        g.bio.toLowerCase().includes(lowerQuery) ||
        g.expertise.some((e) => e.toLowerCase().includes(lowerQuery))
    );
  }

  static getGuestAppearances(guestId: string): GuestAppearance[] {
    const guest = this.getGuestById(guestId);
    return guest ? guest.appearances : [];
  }

  static getEpisodeGuests(episodeId: string): Guest[] {
    return this.getAllGuests().filter((g) =>
      g.appearances.some((a) => a.episodeId === episodeId)
    );
  }

  static getFeaturedGuests(limit: number = 5): Guest[] {
    // Sort by number of appearances
    return this.getAllGuests()
      .sort((a, b) => b.appearances.length - a.appearances.length)
      .slice(0, limit);
  }
}

// ============= Cross-Episode Recommendations =============

export class CrossEpisodeRecommendationService {
  static getRecommendations(episodeId: string): CrossEpisodeRecommendation[] {
    const episode = PREBUILT_EPISODES.find((ep) => ep.id === episodeId);
    if (!episode) return [];

    const show = PREBUILT_SHOWS.find((s) => s.id === episode.showId);
    if (!show) return [];

    const recommendations: CrossEpisodeRecommendation[] = [];

    // Same show recommendations
    const sameShowEpisodes = PREBUILT_EPISODES.filter(
      (ep) => ep.showId === episode.showId && ep.id !== episodeId
    ).slice(0, 2);

    sameShowEpisodes.forEach((ep) => {
      recommendations.push({
        episodeId: ep.id,
        reason: `More from ${show.title}`,
        score: 90,
        relatedEpisodeIds: [episodeId],
      });
    });

    // Topic-based recommendations
    const topicEpisodes = PREBUILT_EPISODES.filter((ep) => {
      const epShow = PREBUILT_SHOWS.find((s) => s.id === ep.showId);
      if (!epShow || ep.id === episodeId) return false;

      // Check for topic overlap
      return show.topics.some((topic) => epShow.topics.includes(topic));
    }).slice(0, 3);

    topicEpisodes.forEach((ep) => {
      const epShow = PREBUILT_SHOWS.find((s) => s.id === ep.showId);
      const commonTopics = show.topics.filter((t) => epShow?.topics.includes(t));

      recommendations.push({
        episodeId: ep.id,
        reason: `Similar topic: ${commonTopics[0]}`,
        score: 75,
        relatedEpisodeIds: [episodeId],
      });
    });

    // Guest-based recommendations
    const episodeGuests = GuestTrackingService.getEpisodeGuests(episodeId);
    episodeGuests.forEach((guest) => {
      const guestEpisodes = guest.appearances
        .filter((a) => a.episodeId !== episodeId)
        .slice(0, 1);

      guestEpisodes.forEach((appearance) => {
        recommendations.push({
          episodeId: appearance.episodeId,
          reason: `Also features ${guest.name}`,
          score: 80,
          relatedEpisodeIds: [episodeId],
        });
      });
    });

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  static getBecauseYouListened(episodeIds: string[]): PodcastEpisode[] {
    // Get recommendations based on multiple listened episodes
    const allRecommendations: Map<string, number> = new Map();

    episodeIds.forEach((id) => {
      const recs = this.getRecommendations(id);
      recs.forEach((rec) => {
        const current = allRecommendations.get(rec.episodeId) || 0;
        allRecommendations.set(rec.episodeId, current + rec.score);
      });
    });

    // Sort by aggregate score
    const sorted = Array.from(allRecommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return sorted
      .map(([id]) => PREBUILT_EPISODES.find((ep) => ep.id === id))
      .filter((ep): ep is PodcastEpisode => ep !== undefined);
  }
}

// ============= Export Combined Service =============

export const DiscoveryService = {
  playlists: PlaylistService,
  topics: TopicDiscoveryService,
  guests: GuestTrackingService,
  recommendations: CrossEpisodeRecommendationService,
};

// Export alias for backward compatibility
export { TopicDiscoveryService as TopicService };

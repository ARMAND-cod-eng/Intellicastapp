/**
 * Podcast Service - API layer for podcast show and episode management
 * Integrates with backend podcast API (port 8000) and local storage
 */

import { ENDPOINTS } from '../config/api';
import type {
  PodcastShow,
  PodcastEpisode,
  CreateShowRequest,
  CreateEpisodeRequest,
  GenerationJob,
  ShowStatistics,
  AIPersona
} from '../types/podcast';

const STORAGE_KEYS = {
  SHOWS: 'podcast_shows',
  EPISODES: 'podcast_episodes',
  JOBS: 'generation_jobs'
};

/**
 * Show Management
 */
export class PodcastShowService {
  /**
   * Get all shows from local storage
   */
  static getShows(): PodcastShow[] {
    const stored = localStorage.getItem(STORAGE_KEYS.SHOWS);
    if (!stored) return [];

    const shows = JSON.parse(stored);
    // Convert date strings back to Date objects
    return shows.map((show: any) => ({
      ...show,
      createdAt: new Date(show.createdAt),
      updatedAt: new Date(show.updatedAt),
      lastEpisodeDate: show.lastEpisodeDate ? new Date(show.lastEpisodeDate) : undefined
    }));
  }

  /**
   * Get a single show by ID
   */
  static getShow(showId: string): PodcastShow | null {
    const shows = this.getShows();
    return shows.find(s => s.id === showId) || null;
  }

  /**
   * Create a new show
   */
  static createShow(request: CreateShowRequest): PodcastShow {
    const shows = this.getShows();

    const newShow: PodcastShow = {
      id: `show_${Date.now()}`,
      title: request.title,
      description: request.description,
      type: 'ai',
      style: request.style,
      personas: request.personas,
      defaultTone: request.tone,
      episodeLength: request.episodeLength,
      author: 'AI Studio',
      category: request.category,
      topics: request.topics,
      episodeCount: 0,
      subscribers: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    shows.push(newShow);
    localStorage.setItem(STORAGE_KEYS.SHOWS, JSON.stringify(shows));

    return newShow;
  }

  /**
   * Update a show
   */
  static updateShow(showId: string, updates: Partial<PodcastShow>): PodcastShow | null {
    const shows = this.getShows();
    const index = shows.findIndex(s => s.id === showId);

    if (index === -1) return null;

    shows[index] = {
      ...shows[index],
      ...updates,
      updatedAt: new Date()
    };

    localStorage.setItem(STORAGE_KEYS.SHOWS, JSON.stringify(shows));
    return shows[index];
  }

  /**
   * Delete a show
   */
  static deleteShow(showId: string): boolean {
    const shows = this.getShows();
    const filtered = shows.filter(s => s.id !== showId);

    if (filtered.length === shows.length) return false;

    localStorage.setItem(STORAGE_KEYS.SHOWS, JSON.stringify(filtered));

    // Also delete all episodes for this show
    PodcastEpisodeService.deleteEpisodesByShow(showId);

    return true;
  }

  /**
   * Get show statistics
   */
  static getShowStats(showId: string): ShowStatistics | null {
    const show = this.getShow(showId);
    if (!show) return null;

    const episodes = PodcastEpisodeService.getEpisodesByShow(showId);
    const publishedEpisodes = episodes.filter(ep => ep.status === 'published');
    const scheduledEpisodes = episodes.filter(ep => ep.status === 'scheduled');

    const totalPlays = publishedEpisodes.reduce((sum, ep) => sum + (ep.playCount || 0), 0);
    const totalDuration = publishedEpisodes.reduce((sum, ep) => sum + (ep.duration || 0), 0);
    const avgDuration = publishedEpisodes.length > 0 ? totalDuration / publishedEpisodes.length : 0;

    const lastPublished = publishedEpisodes.length > 0
      ? new Date(Math.max(...publishedEpisodes.map(ep => ep.publishDate.getTime())))
      : undefined;

    return {
      showId,
      totalEpisodes: episodes.length,
      publishedEpisodes: publishedEpisodes.length,
      scheduledEpisodes: scheduledEpisodes.length,
      totalPlays,
      totalDuration,
      averageEpisodeLength: avgDuration,
      subscribers: show.subscribers,
      lastPublished
    };
  }
}

/**
 * Episode Management
 */
export class PodcastEpisodeService {
  /**
   * Get all episodes from local storage
   */
  static getEpisodes(): PodcastEpisode[] {
    const stored = localStorage.getItem(STORAGE_KEYS.EPISODES);
    if (!stored) return [];

    const episodes = JSON.parse(stored);
    return episodes.map((ep: any) => ({
      ...ep,
      publishDate: new Date(ep.publishDate),
      createdAt: new Date(ep.createdAt),
      updatedAt: new Date(ep.updatedAt),
      progress: ep.progress ? {
        ...ep.progress,
        lastPlayed: new Date(ep.progress.lastPlayed)
      } : undefined
    }));
  }

  /**
   * Get episodes for a specific show
   */
  static getEpisodesByShow(showId: string): PodcastEpisode[] {
    const episodes = this.getEpisodes();
    return episodes.filter(ep => ep.showId === showId)
      .sort((a, b) => b.episodeNumber - a.episodeNumber);
  }

  /**
   * Get a single episode by ID
   */
  static getEpisode(episodeId: string): PodcastEpisode | null {
    const episodes = this.getEpisodes();
    return episodes.find(ep => ep.id === episodeId) || null;
  }

  /**
   * Create a new episode
   */
  static createEpisode(request: CreateEpisodeRequest): PodcastEpisode {
    const episodes = this.getEpisodes();
    const show = PodcastShowService.getShow(request.showId);

    if (!show) {
      throw new Error('Show not found');
    }

    const showEpisodes = this.getEpisodesByShow(request.showId);
    const nextEpisodeNumber = showEpisodes.length > 0
      ? Math.max(...showEpisodes.map(ep => ep.episodeNumber)) + 1
      : 1;

    const newEpisode: PodcastEpisode = {
      id: `ep_${Date.now()}`,
      showId: request.showId,
      topicId: request.topicId,
      title: request.title,
      description: request.description,
      episodeNumber: nextEpisodeNumber,
      type: 'ai',
      generationType: show.personas && show.personas.length > 1 ? 'multi_voice' : 'single',
      speakers: show.personas?.length || 1,
      personas: show.personas,
      topics: request.keyPoints || [],
      status: request.generateNow ? 'generating' : 'draft',
      publishDate: request.scheduledDate || new Date(),
      playCount: 0,
      likeCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    episodes.push(newEpisode);
    localStorage.setItem(STORAGE_KEYS.EPISODES, JSON.stringify(episodes));

    // Update show episode count
    PodcastShowService.updateShow(request.showId, {
      episodeCount: showEpisodes.length + 1,
      lastEpisodeDate: new Date()
    });

    return newEpisode;
  }

  /**
   * Update an episode
   */
  static updateEpisode(episodeId: string, updates: Partial<PodcastEpisode>): PodcastEpisode | null {
    const episodes = this.getEpisodes();
    const index = episodes.findIndex(ep => ep.id === episodeId);

    if (index === -1) return null;

    episodes[index] = {
      ...episodes[index],
      ...updates,
      updatedAt: new Date()
    };

    localStorage.setItem(STORAGE_KEYS.EPISODES, JSON.stringify(episodes));
    return episodes[index];
  }

  /**
   * Delete an episode
   */
  static deleteEpisode(episodeId: string): boolean {
    const episodes = this.getEpisodes();
    const episode = episodes.find(ep => ep.id === episodeId);

    if (!episode) return false;

    const filtered = episodes.filter(ep => ep.id !== episodeId);
    localStorage.setItem(STORAGE_KEYS.EPISODES, JSON.stringify(filtered));

    // Update show episode count
    const showEpisodes = this.getEpisodesByShow(episode.showId);
    PodcastShowService.updateShow(episode.showId, {
      episodeCount: showEpisodes.length
    });

    return true;
  }

  /**
   * Delete all episodes for a show
   */
  static deleteEpisodesByShow(showId: string): void {
    const episodes = this.getEpisodes();
    const filtered = episodes.filter(ep => ep.showId !== showId);
    localStorage.setItem(STORAGE_KEYS.EPISODES, JSON.stringify(filtered));
  }

  /**
   * Update episode progress (for playback tracking)
   */
  static updateProgress(episodeId: string, position: number, completed: boolean): void {
    this.updateEpisode(episodeId, {
      progress: {
        position,
        completed,
        lastPlayed: new Date()
      }
    });
  }
}

/**
 * AI Generation Service
 */
export class PodcastGenerationService {
  /**
   * Generate podcast episode using Together AI
   */
  static async generateEpisode(
    episode: PodcastEpisode,
    documentText: string,
    customPrompt?: string
  ): Promise<GenerationJob> {
    const show = PodcastShowService.getShow(episode.showId);
    if (!show) {
      throw new Error('Show not found');
    }

    // Create generation job
    const job: GenerationJob = {
      id: `job_${Date.now()}`,
      episodeId: episode.id,
      showId: episode.showId,
      status: 'queued',
      progress: 0,
      message: 'Queuing podcast generation...',
      config: {
        style: show.style || 'conversational',
        personas: show.personas || [],
        length: show.episodeLength || '10min',
        tone: show.defaultTone || 'friendly'
      }
    };

    // Save job
    this.saveJob(job);

    try {
      // Update job status
      job.status = 'processing';
      job.progress = 10;
      job.message = 'Analyzing content...';
      job.startedAt = new Date();
      this.updateJob(job);

      // Prepare voice mapping
      const voiceMap: Record<string, string> = {
        'host': 'host_male_friendly',
        'guest': 'guest_female_expert',
        'cohost': 'cohost_male_casual'
      };

      const personas = show.personas || [];
      const hostVoice = personas.find(p => p.voice)?.voice || voiceMap.host;
      const guestVoice = personas[1]?.voice || voiceMap.guest;
      const cohostVoice = personas[2]?.voice || voiceMap.cohost;

      // Call podcast generation API
      const response = await fetch(ENDPOINTS.PODCAST.GENERATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_text: documentText,
          length: show.episodeLength || '10min',
          host_voice: hostVoice,
          guest_voice: guestVoice,
          cohost_voice: cohostVoice,
          style: show.style || 'conversational',
          tone: show.defaultTone || 'friendly',
          num_speakers: personas.length || 2,
          output_format: 'mp3',
          save_script: true
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update job with API job ID
      job.progress = 30;
      job.message = 'Generating podcast script...';
      this.updateJob(job);

      // Poll for completion
      await this.pollJobStatus(result.job_id, job);

      return job;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.message = `Generation failed: ${job.error}`;
      job.completedAt = new Date();
      this.updateJob(job);

      // Update episode status
      PodcastEpisodeService.updateEpisode(episode.id, { status: 'failed' });

      throw error;
    }
  }

  /**
   * Poll backend API for job completion
   */
  private static async pollJobStatus(backendJobId: string, job: GenerationJob): Promise<void> {
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      try {
        const response = await fetch(`${ENDPOINTS.PODCAST.STATUS}/${backendJobId}`);
        if (!response.ok) continue;

        const result = await response.json();
        const backendJob = result.job;

        // Update local job progress
        job.progress = backendJob.progress || job.progress;
        job.message = backendJob.message || job.message;

        if (backendJob.status === 'completed') {
          // Success!
          const audioUrl = backendJob.result?.audio_file;
          const duration = backendJob.result?.duration;

          // Update episode
          PodcastEpisodeService.updateEpisode(job.episodeId, {
            status: 'published',
            audioUrl,
            duration
          });

          // Update job
          job.status = 'completed';
          job.progress = 100;
          job.message = 'Podcast generated successfully!';
          job.completedAt = new Date();
          this.updateJob(job);

          return;
        } else if (backendJob.status === 'failed') {
          throw new Error(backendJob.error || 'Generation failed');
        }

        this.updateJob(job);
      } catch (error) {
        console.error('Polling error:', error);
      }

      attempts++;
    }

    throw new Error('Generation timeout');
  }

  /**
   * Get generation job
   */
  static getJob(jobId: string): GenerationJob | null {
    const jobs = this.getJobs();
    return jobs.find(j => j.id === jobId) || null;
  }

  /**
   * Get all generation jobs
   */
  static getJobs(): GenerationJob[] {
    const stored = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (!stored) return [];

    const jobs = JSON.parse(stored);
    return jobs.map((job: any) => ({
      ...job,
      startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
      completedAt: job.completedAt ? new Date(job.completedAt) : undefined
    }));
  }

  /**
   * Save a job
   */
  private static saveJob(job: GenerationJob): void {
    const jobs = this.getJobs();
    jobs.push(job);
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
  }

  /**
   * Update a job
   */
  private static updateJob(job: GenerationJob): void {
    const jobs = this.getJobs();
    const index = jobs.findIndex(j => j.id === job.id);

    if (index !== -1) {
      jobs[index] = job;
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    }
  }
}

/**
 * Persona presets
 */
export const PERSONA_PRESETS: AIPersona[] = [
  {
    id: 'tech-expert',
    name: 'Tech Expert',
    personality: 'analytical, knowledgeable, precise',
    voice: 'host_male_friendly',
    traits: ['Technical', 'Detail-oriented', 'Analytical'],
    icon: '🤖',
    color: '#00D4E4',
    description: 'Technical expert who explains complex topics clearly'
  },
  {
    id: 'curious-host',
    name: 'Curious Host',
    personality: 'enthusiastic, curious, engaging',
    voice: 'guest_female_expert',
    traits: ['Curious', 'Engaging', 'Friendly'],
    icon: '🎙️',
    color: '#F59E0B',
    description: 'Engaging host who asks great questions'
  },
  {
    id: 'business-strategist',
    name: 'Business Strategist',
    personality: 'strategic, insightful, practical',
    voice: 'cohost_male_casual',
    traits: ['Strategic', 'Practical', 'Insightful'],
    icon: '💼',
    color: '#8B5CF6',
    description: 'Business-focused with practical insights'
  },
  {
    id: 'skeptical-analyst',
    name: 'Skeptical Analyst',
    personality: 'critical, questioning, thorough',
    voice: 'host_male_friendly',
    traits: ['Critical', 'Thorough', 'Questioning'],
    icon: '🔍',
    color: '#EF4444',
    description: 'Challenges assumptions with critical analysis'
  },
  {
    id: 'creative-thinker',
    name: 'Creative Thinker',
    personality: 'innovative, creative, visionary',
    voice: 'guest_female_expert',
    traits: ['Creative', 'Innovative', 'Visionary'],
    icon: '💡',
    color: '#10B981',
    description: 'Brings creative perspectives and fresh ideas'
  }
];

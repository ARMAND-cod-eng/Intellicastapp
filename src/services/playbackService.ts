// Advanced Playback Service - Queue, Downloads, Speed Control, Chapters

export interface QueueItem {
  id: string;
  episodeId: string;
  showId: string;
  title: string;
  showName: string;
  artwork: string;
  audioUrl: string;
  duration: number;
  addedAt: Date;
}

export interface Download {
  episodeId: string;
  showId: string;
  title: string;
  showName: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  downloadedAt?: Date;
  fileSize?: number;
  localPath?: string;
}

export interface Chapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  description?: string;
}

export interface PlaybackState {
  currentEpisodeId: string | null;
  position: number;
  playbackSpeed: number;
  autoPlayNext: boolean;
  sleepTimer: number | null; // minutes
  currentChapter: number | null;
}

const STORAGE_KEYS = {
  QUEUE: 'podcast_queue',
  PLAY_LATER: 'podcast_play_later',
  DOWNLOADS: 'podcast_downloads',
  PLAYBACK_STATE: 'podcast_playback_state',
  PLAYBACK_SPEED: 'podcast_playback_speed',
};

// ============= Queue Service =============

export class QueueService {
  static getQueue(): QueueItem[] {
    const stored = localStorage.getItem(STORAGE_KEYS.QUEUE);
    if (!stored) return [];
    return JSON.parse(stored).map((item: any) => ({
      ...item,
      addedAt: new Date(item.addedAt),
    }));
  }

  static saveQueue(queue: QueueItem[]): void {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  }

  static addToQueue(episode: Omit<QueueItem, 'id' | 'addedAt'>): void {
    const queue = this.getQueue();

    // Check if already in queue
    if (queue.some(item => item.episodeId === episode.episodeId)) {
      return;
    }

    const newItem: QueueItem = {
      ...episode,
      id: `queue_${Date.now()}`,
      addedAt: new Date(),
    };

    queue.push(newItem);
    this.saveQueue(queue);
  }

  static removeFromQueue(itemId: string): void {
    const queue = this.getQueue();
    const filtered = queue.filter(item => item.id !== itemId);
    this.saveQueue(filtered);
  }

  static getNext(): QueueItem | null {
    const queue = this.getQueue();
    return queue.length > 0 ? queue[0] : null;
  }

  static playNext(): QueueItem | null {
    const queue = this.getQueue();
    if (queue.length === 0) return null;

    const next = queue.shift()!;
    this.saveQueue(queue);
    return next;
  }

  static reorderQueue(fromIndex: number, toIndex: number): void {
    const queue = this.getQueue();
    const [removed] = queue.splice(fromIndex, 1);
    queue.splice(toIndex, 0, removed);
    this.saveQueue(queue);
  }

  static clearQueue(): void {
    this.saveQueue([]);
  }

  static moveToTop(itemId: string): void {
    const queue = this.getQueue();
    const index = queue.findIndex(item => item.id === itemId);
    if (index > 0) {
      this.reorderQueue(index, 0);
    }
  }
}

// ============= Play Later Service =============

export class PlayLaterService {
  static getPlayLater(): QueueItem[] {
    const stored = localStorage.getItem(STORAGE_KEYS.PLAY_LATER);
    if (!stored) return [];
    return JSON.parse(stored).map((item: any) => ({
      ...item,
      addedAt: new Date(item.addedAt),
    }));
  }

  static savePlayLater(items: QueueItem[]): void {
    localStorage.setItem(STORAGE_KEYS.PLAY_LATER, JSON.stringify(items));
  }

  static addToPlayLater(episode: Omit<QueueItem, 'id' | 'addedAt'>): void {
    const playLater = this.getPlayLater();

    // Check if already in play later
    if (playLater.some(item => item.episodeId === episode.episodeId)) {
      return;
    }

    const newItem: QueueItem = {
      ...episode,
      id: `play_later_${Date.now()}`,
      addedAt: new Date(),
    };

    playLater.push(newItem);
    this.savePlayLater(playLater);
  }

  static removeFromPlayLater(itemId: string): void {
    const playLater = this.getPlayLater();
    const filtered = playLater.filter(item => item.id !== itemId);
    this.savePlayLater(filtered);
  }

  static moveToQueue(itemId: string): void {
    const playLater = this.getPlayLater();
    const item = playLater.find(i => i.id === itemId);

    if (item) {
      this.removeFromPlayLater(itemId);
      QueueService.addToQueue(item);
    }
  }

  static clearPlayLater(): void {
    this.savePlayLater([]);
  }
}

// ============= Download Service =============

export class DownloadService {
  static getDownloads(): Download[] {
    const stored = localStorage.getItem(STORAGE_KEYS.DOWNLOADS);
    if (!stored) return [];
    return JSON.parse(stored).map((d: any) => ({
      ...d,
      downloadedAt: d.downloadedAt ? new Date(d.downloadedAt) : undefined,
    }));
  }

  static saveDownloads(downloads: Download[]): void {
    localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(downloads));
  }

  static startDownload(episode: {
    episodeId: string;
    showId: string;
    title: string;
    showName: string;
  }): void {
    const downloads = this.getDownloads();

    // Check if already downloaded or downloading
    const existing = downloads.find(d => d.episodeId === episode.episodeId);
    if (existing && (existing.status === 'completed' || existing.status === 'downloading')) {
      return;
    }

    const newDownload: Download = {
      ...episode,
      status: 'downloading',
      progress: 0,
    };

    // Remove any existing failed/pending download
    const filtered = downloads.filter(d => d.episodeId !== episode.episodeId);
    filtered.push(newDownload);
    this.saveDownloads(filtered);

    // Simulate download progress (in real app, this would be actual download)
    this.simulateDownload(episode.episodeId);
  }

  private static simulateDownload(episodeId: string): void {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;

      const downloads = this.getDownloads();
      const download = downloads.find(d => d.episodeId === episodeId);

      if (!download) {
        clearInterval(interval);
        return;
      }

      if (progress >= 100) {
        download.status = 'completed';
        download.progress = 100;
        download.downloadedAt = new Date();
        download.fileSize = Math.floor(Math.random() * 50 + 10); // 10-60 MB
        download.localPath = `/downloads/${episodeId}.mp3`;
        clearInterval(interval);
      } else {
        download.progress = progress;
      }

      this.saveDownloads(downloads);
    }, 500);
  }

  static deleteDownload(episodeId: string): void {
    const downloads = this.getDownloads();
    const filtered = downloads.filter(d => d.episodeId !== episodeId);
    this.saveDownloads(filtered);
  }

  static isDownloaded(episodeId: string): boolean {
    const downloads = this.getDownloads();
    return downloads.some(d => d.episodeId === episodeId && d.status === 'completed');
  }

  static getDownloadedEpisodes(): Download[] {
    return this.getDownloads().filter(d => d.status === 'completed');
  }

  static clearAllDownloads(): void {
    this.saveDownloads([]);
  }
}

// ============= Playback Speed Service =============

export class PlaybackSpeedService {
  private static readonly SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

  static getSpeed(): number {
    const stored = localStorage.getItem(STORAGE_KEYS.PLAYBACK_SPEED);
    return stored ? parseFloat(stored) : 1.0;
  }

  static setSpeed(speed: number): void {
    localStorage.setItem(STORAGE_KEYS.PLAYBACK_SPEED, speed.toString());
  }

  static getSpeedPresets(): number[] {
    return this.SPEED_PRESETS;
  }

  static incrementSpeed(): number {
    const current = this.getSpeed();
    const currentIndex = this.SPEED_PRESETS.indexOf(current);
    const nextIndex = Math.min(currentIndex + 1, this.SPEED_PRESETS.length - 1);
    const newSpeed = this.SPEED_PRESETS[nextIndex];
    this.setSpeed(newSpeed);
    return newSpeed;
  }

  static decrementSpeed(): number {
    const current = this.getSpeed();
    const currentIndex = this.SPEED_PRESETS.indexOf(current);
    const nextIndex = Math.max(currentIndex - 1, 0);
    const newSpeed = this.SPEED_PRESETS[nextIndex];
    this.setSpeed(newSpeed);
    return newSpeed;
  }

  static resetSpeed(): void {
    this.setSpeed(1.0);
  }

  static getSmartSpeed(contentType?: string): number {
    // Smart speed recommendations based on content type
    switch (contentType) {
      case 'news':
      case 'summary':
        return 1.5;
      case 'interview':
      case 'storytelling':
        return 1.25;
      case 'educational':
        return 1.0;
      default:
        return this.getSpeed();
    }
  }
}

// ============= Chapter Service =============

export class ChapterService {
  static getChapters(episodeId: string): Chapter[] {
    // In real app, this would fetch from API or episode metadata
    // For now, return mock chapters
    return this.getMockChapters(episodeId);
  }

  private static getMockChapters(episodeId: string): Chapter[] {
    // Generate mock chapters based on episode
    return [
      {
        id: 'ch1',
        title: 'Introduction',
        startTime: 0,
        endTime: 120,
        description: 'Episode introduction and overview',
      },
      {
        id: 'ch2',
        title: 'Main Topic',
        startTime: 120,
        endTime: 600,
        description: 'Deep dive into the main subject',
      },
      {
        id: 'ch3',
        title: 'Q&A Session',
        startTime: 600,
        endTime: 900,
        description: 'Questions from listeners',
      },
      {
        id: 'ch4',
        title: 'Closing Remarks',
        startTime: 900,
        endTime: 1080,
        description: 'Summary and next episode preview',
      },
    ];
  }

  static getCurrentChapter(episodeId: string, currentTime: number): Chapter | null {
    const chapters = this.getChapters(episodeId);
    return chapters.find(ch => currentTime >= ch.startTime && currentTime < ch.endTime) || null;
  }

  static getNextChapter(episodeId: string, currentTime: number): Chapter | null {
    const chapters = this.getChapters(episodeId);
    return chapters.find(ch => ch.startTime > currentTime) || null;
  }

  static getPreviousChapter(episodeId: string, currentTime: number): Chapter | null {
    const chapters = this.getChapters(episodeId);
    const previous = chapters.filter(ch => ch.endTime <= currentTime);
    return previous.length > 0 ? previous[previous.length - 1] : null;
  }
}

// ============= Playback State Service =============

export class PlaybackStateService {
  static getState(): PlaybackState {
    const stored = localStorage.getItem(STORAGE_KEYS.PLAYBACK_STATE);
    if (!stored) {
      return {
        currentEpisodeId: null,
        position: 0,
        playbackSpeed: 1.0,
        autoPlayNext: true,
        sleepTimer: null,
        currentChapter: null,
      };
    }
    return JSON.parse(stored);
  }

  static saveState(state: PlaybackState): void {
    localStorage.setItem(STORAGE_KEYS.PLAYBACK_STATE, JSON.stringify(state));
  }

  static updatePosition(episodeId: string, position: number): void {
    const state = this.getState();
    state.currentEpisodeId = episodeId;
    state.position = position;
    this.saveState(state);
  }

  static setAutoPlayNext(enabled: boolean): void {
    const state = this.getState();
    state.autoPlayNext = enabled;
    this.saveState(state);
  }

  static setSleepTimer(minutes: number | null): void {
    const state = this.getState();
    state.sleepTimer = minutes;
    this.saveState(state);
  }

  static clearSleepTimer(): void {
    this.setSleepTimer(null);
  }
}

// ============= Export Combined Service =============

export const PlaybackService = {
  queue: QueueService,
  playLater: PlayLaterService,
  downloads: DownloadService,
  speed: PlaybackSpeedService,
  chapters: ChapterService,
  state: PlaybackStateService,
};

// User Engagement Service - Ratings, Likes, Comments, Reviews, Shares

export interface Rating {
  userId: string;
  episodeId?: string;
  showId?: string;
  rating: number; // 1-5 stars
  createdAt: Date;
}

export interface Like {
  userId: string;
  episodeId?: string;
  showId?: string;
  commentId?: string;
  createdAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  episodeId?: string;
  showId?: string;
  content: string;
  likes: number;
  replies: Comment[];
  createdAt: Date;
  editedAt?: Date;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  showId: string;
  rating: number;
  title: string;
  content: string;
  likes: number;
  helpful: number;
  createdAt: Date;
  editedAt?: Date;
}

export interface Share {
  id: string;
  userId: string;
  episodeId?: string;
  showId?: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'email' | 'copy';
  timestamp: Date;
}

const STORAGE_KEYS = {
  RATINGS: 'podcast_ratings',
  LIKES: 'podcast_likes',
  COMMENTS: 'podcast_comments',
  REVIEWS: 'podcast_reviews',
  SHARES: 'podcast_shares',
};

// Mock current user (in production, this would come from auth)
const CURRENT_USER = {
  id: 'user_1',
  name: 'Alex Chen',
  avatar: '👤',
};

// ============= Rating Service =============

export class RatingService {
  static getRatings(): Rating[] {
    const stored = localStorage.getItem(STORAGE_KEYS.RATINGS);
    if (!stored) return [];
    return JSON.parse(stored).map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
    }));
  }

  static saveRatings(ratings: Rating[]): void {
    localStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify(ratings));
  }

  static rateEpisode(episodeId: string, rating: number): void {
    const ratings = this.getRatings();
    const existingIndex = ratings.findIndex(
      r => r.userId === CURRENT_USER.id && r.episodeId === episodeId
    );

    const newRating: Rating = {
      userId: CURRENT_USER.id,
      episodeId,
      rating,
      createdAt: new Date(),
    };

    if (existingIndex >= 0) {
      ratings[existingIndex] = newRating;
    } else {
      ratings.push(newRating);
    }

    this.saveRatings(ratings);
  }

  static rateShow(showId: string, rating: number): void {
    const ratings = this.getRatings();
    const existingIndex = ratings.findIndex(
      r => r.userId === CURRENT_USER.id && r.showId === showId
    );

    const newRating: Rating = {
      userId: CURRENT_USER.id,
      showId,
      rating,
      createdAt: new Date(),
    };

    if (existingIndex >= 0) {
      ratings[existingIndex] = newRating;
    } else {
      ratings.push(newRating);
    }

    this.saveRatings(ratings);
  }

  static getUserRating(episodeId?: string, showId?: string): number | null {
    const ratings = this.getRatings();
    const rating = ratings.find(
      r =>
        r.userId === CURRENT_USER.id &&
        (episodeId ? r.episodeId === episodeId : r.showId === showId)
    );
    return rating ? rating.rating : null;
  }

  static getAverageRating(episodeId?: string, showId?: string): { average: number; count: number } {
    const ratings = this.getRatings();
    const relevant = ratings.filter(
      r => (episodeId ? r.episodeId === episodeId : r.showId === showId)
    );

    if (relevant.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = relevant.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: sum / relevant.length,
      count: relevant.length,
    };
  }
}

// ============= Like Service =============

export class LikeService {
  static getLikes(): Like[] {
    const stored = localStorage.getItem(STORAGE_KEYS.LIKES);
    if (!stored) return [];
    return JSON.parse(stored).map((l: any) => ({
      ...l,
      createdAt: new Date(l.createdAt),
    }));
  }

  static saveLikes(likes: Like[]): void {
    localStorage.setItem(STORAGE_KEYS.LIKES, JSON.stringify(likes));
  }

  static toggleLike(episodeId?: string, showId?: string, commentId?: string): boolean {
    const likes = this.getLikes();
    const existingIndex = likes.findIndex(
      l =>
        l.userId === CURRENT_USER.id &&
        l.episodeId === episodeId &&
        l.showId === showId &&
        l.commentId === commentId
    );

    if (existingIndex >= 0) {
      likes.splice(existingIndex, 1);
      this.saveLikes(likes);
      return false;
    } else {
      likes.push({
        userId: CURRENT_USER.id,
        episodeId,
        showId,
        commentId,
        createdAt: new Date(),
      });
      this.saveLikes(likes);
      return true;
    }
  }

  static isLiked(episodeId?: string, showId?: string, commentId?: string): boolean {
    const likes = this.getLikes();
    return likes.some(
      l =>
        l.userId === CURRENT_USER.id &&
        l.episodeId === episodeId &&
        l.showId === showId &&
        l.commentId === commentId
    );
  }

  static getLikeCount(episodeId?: string, showId?: string, commentId?: string): number {
    const likes = this.getLikes();
    return likes.filter(
      l =>
        (episodeId ? l.episodeId === episodeId : true) &&
        (showId ? l.showId === showId : true) &&
        (commentId ? l.commentId === commentId : true)
    ).length;
  }
}

// ============= Comment Service =============

export class CommentService {
  static getComments(): Comment[] {
    const stored = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    if (!stored) return this.getSeedComments();
    return JSON.parse(stored).map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      editedAt: c.editedAt ? new Date(c.editedAt) : undefined,
      replies: c.replies.map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
        editedAt: r.editedAt ? new Date(r.editedAt) : undefined,
      })),
    }));
  }

  static saveComments(comments: Comment[]): void {
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
  }

  static getSeedComments(): Comment[] {
    return [
      {
        id: 'comment_1',
        userId: 'user_2',
        userName: 'Sarah Johnson',
        userAvatar: '👩',
        episodeId: 'ep_tech_1',
        content: 'This episode was absolutely mind-blowing! The insights on AI were incredible.',
        likes: 24,
        replies: [
          {
            id: 'comment_1_reply_1',
            userId: 'user_3',
            userName: 'Mike Davis',
            userAvatar: '👨',
            content: 'Totally agree! The section on neural networks was particularly fascinating.',
            likes: 5,
            replies: [],
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
        ],
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
      {
        id: 'comment_2',
        userId: 'user_4',
        userName: 'Emily Watson',
        userAvatar: '👧',
        episodeId: 'ep_tech_1',
        content: 'Great episode! Would love to hear more about quantum computing in future episodes.',
        likes: 18,
        replies: [],
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
    ];
  }

  static addComment(episodeId: string, content: string, parentId?: string): Comment {
    const comments = this.getComments();

    const newComment: Comment = {
      id: `comment_${Date.now()}`,
      userId: CURRENT_USER.id,
      userName: CURRENT_USER.name,
      userAvatar: CURRENT_USER.avatar,
      episodeId,
      content,
      likes: 0,
      replies: [],
      createdAt: new Date(),
    };

    if (parentId) {
      // Add as reply
      const parent = comments.find(c => c.id === parentId);
      if (parent) {
        parent.replies.push(newComment);
      }
    } else {
      // Add as top-level comment
      comments.push(newComment);
    }

    this.saveComments(comments);
    return newComment;
  }

  static getEpisodeComments(episodeId: string): Comment[] {
    const comments = this.getComments();
    return comments
      .filter(c => c.episodeId === episodeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static deleteComment(commentId: string): void {
    let comments = this.getComments();

    // Remove from top-level
    comments = comments.filter(c => c.id !== commentId);

    // Remove from replies
    comments.forEach(c => {
      c.replies = c.replies.filter(r => r.id !== commentId);
    });

    this.saveComments(comments);
  }
}

// ============= Review Service =============

export class ReviewService {
  static getReviews(): Review[] {
    const stored = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    if (!stored) return this.getSeedReviews();
    return JSON.parse(stored).map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      editedAt: r.editedAt ? new Date(r.editedAt) : undefined,
    }));
  }

  static saveReviews(reviews: Review[]): void {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  }

  static getSeedReviews(): Review[] {
    return [
      {
        id: 'review_1',
        userId: 'user_2',
        userName: 'Sarah Johnson',
        userAvatar: '👩',
        showId: 'show_tech_titans',
        rating: 5,
        title: 'Best Tech Podcast Out There!',
        content:
          'Tech Titans has been my go-to podcast for staying updated on the latest in technology. The hosts are knowledgeable, the guests are top-notch, and the discussions are always engaging.',
        likes: 89,
        helpful: 67,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'review_2',
        userId: 'user_4',
        userName: 'Emily Watson',
        userAvatar: '👧',
        showId: 'show_tech_titans',
        rating: 4,
        title: 'Great Content, Could Use More Depth',
        content:
          'Really enjoy the show overall. The topics are fascinating and timely. Would love to see longer episodes that dive deeper into complex subjects.',
        likes: 45,
        helpful: 32,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    ];
  }

  static addReview(showId: string, rating: number, title: string, content: string): Review {
    const reviews = this.getReviews();

    const newReview: Review = {
      id: `review_${Date.now()}`,
      userId: CURRENT_USER.id,
      userName: CURRENT_USER.name,
      userAvatar: CURRENT_USER.avatar,
      showId,
      rating,
      title,
      content,
      likes: 0,
      helpful: 0,
      createdAt: new Date(),
    };

    reviews.push(newReview);
    this.saveReviews(reviews);

    // Also add to ratings
    RatingService.rateShow(showId, rating);

    return newReview;
  }

  static getShowReviews(showId: string): Review[] {
    const reviews = this.getReviews();
    return reviews
      .filter(r => r.showId === showId)
      .sort((a, b) => b.helpful - a.helpful);
  }

  static getUserReview(showId: string): Review | null {
    const reviews = this.getReviews();
    return reviews.find(r => r.userId === CURRENT_USER.id && r.showId === showId) || null;
  }

  static markHelpful(reviewId: string): void {
    const reviews = this.getReviews();
    const review = reviews.find(r => r.id === reviewId);
    if (review) {
      review.helpful++;
      this.saveReviews(reviews);
    }
  }
}

// ============= Share Service =============

export class ShareService {
  static getShares(): Share[] {
    const stored = localStorage.getItem(STORAGE_KEYS.SHARES);
    if (!stored) return [];
    return JSON.parse(stored).map((s: any) => ({
      ...s,
      timestamp: new Date(s.timestamp),
    }));
  }

  static saveShares(shares: Share[]): void {
    localStorage.setItem(STORAGE_KEYS.SHARES, JSON.stringify(shares));
  }

  static shareEpisode(
    episodeId: string,
    episodeTitle: string,
    showName: string,
    platform: Share['platform']
  ): void {
    const shares = this.getShares();

    shares.push({
      id: `share_${Date.now()}`,
      userId: CURRENT_USER.id,
      episodeId,
      platform,
      timestamp: new Date(),
    });

    this.saveShares(shares);

    // Generate share URL
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/podcast/episode/${episodeId}`;
    const text = `Check out "${episodeTitle}" from ${showName}!`;

    // Execute share based on platform
    switch (platform) {
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(shareUrl)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl);
        break;
    }
  }

  static getShareCount(episodeId?: string, showId?: string): number {
    const shares = this.getShares();
    return shares.filter(
      s => (episodeId ? s.episodeId === episodeId : s.showId === showId)
    ).length;
  }
}

// ============= Engagement Analytics =============

export const getEngagementStats = (episodeId?: string, showId?: string) => {
  const ratingData = RatingService.getAverageRating(episodeId, showId);
  const likes = LikeService.getLikeCount(episodeId, showId);
  const comments = episodeId
    ? CommentService.getEpisodeComments(episodeId).length
    : 0;
  const shares = ShareService.getShareCount(episodeId, showId);

  return {
    rating: ratingData.average,
    ratingCount: ratingData.count,
    likes,
    comments,
    shares,
    totalEngagement: likes + comments + shares,
  };
};

export const getCurrentUser = () => CURRENT_USER;

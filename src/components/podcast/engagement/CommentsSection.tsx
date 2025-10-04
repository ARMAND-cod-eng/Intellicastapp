import React, { useState, useEffect } from 'react';
import { MessageCircle, Heart, Send, Trash2, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../../ui/GlassCard';
import {
  CommentService,
  LikeService,
  getCurrentUser,
  type Comment,
} from '../../../services/engagementService';

interface CommentsSectionProps {
  episodeId: string;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ episodeId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const currentUser = getCurrentUser();

  useEffect(() => {
    loadComments();
  }, [episodeId]);

  const loadComments = () => {
    const episodeComments = CommentService.getEpisodeComments(episodeId);
    setComments(episodeComments);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    CommentService.addComment(episodeId, newComment.trim());
    setNewComment('');
    loadComments();
  };

  const handleAddReply = (parentId: string) => {
    if (!replyText.trim()) return;

    CommentService.addComment(episodeId, replyText.trim(), parentId);
    setReplyText('');
    setReplyingTo(null);
    loadComments();
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm('Delete this comment?')) {
      CommentService.deleteComment(commentId);
      loadComments();
    }
  };

  const handleToggleLike = (commentId: string) => {
    LikeService.toggleLike(undefined, undefined, commentId);
    loadComments();
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageCircle className="w-6 h-6" style={{ color: '#00D4E4' }} />
        <h3 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
          Comments ({comments.length})
        </h3>
      </div>

      {/* Add Comment */}
      <GlassCard className="p-4">
        <div className="flex gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
            style={{ backgroundColor: 'rgba(0, 212, 228, 0.2)' }}
          >
            {currentUser.avatar}
          </div>

          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full bg-transparent border rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 transition-all"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                '--tw-ring-color': '#00D4E4',
              } as any}
            />

            <div className="flex justify-end mt-2">
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: newComment.trim()
                    ? 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                }}
              >
                <Send className="w-4 h-4" />
                Comment
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <MessageCircle
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: '#00D4E4', opacity: 0.3 }}
            />
            <h3 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
              No comments yet
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Be the first to share your thoughts!
            </p>
          </GlassCard>
        ) : (
          comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              currentUserId={currentUser.id}
              replyingTo={replyingTo}
              replyText={replyText}
              onReply={() => setReplyingTo(comment.id)}
              onCancelReply={() => setReplyingTo(null)}
              onReplyTextChange={setReplyText}
              onSubmitReply={() => handleAddReply(comment.id)}
              onDelete={handleDeleteComment}
              onToggleLike={handleToggleLike}
              formatTimeAgo={formatTimeAgo}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Comment Card Component
const CommentCard: React.FC<{
  comment: Comment;
  currentUserId: string;
  replyingTo: string | null;
  replyText: string;
  onReply: () => void;
  onCancelReply: () => void;
  onReplyTextChange: (text: string) => void;
  onSubmitReply: () => void;
  onDelete: (id: string) => void;
  onToggleLike: (id: string) => void;
  formatTimeAgo: (date: Date) => string;
}> = ({
  comment,
  currentUserId,
  replyingTo,
  replyText,
  onReply,
  onCancelReply,
  onReplyTextChange,
  onSubmitReply,
  onDelete,
  onToggleLike,
  formatTimeAgo,
}) => {
  const isLiked = LikeService.isLiked(undefined, undefined, comment.id);
  const isOwner = comment.userId === currentUserId;

  return (
    <GlassCard className="p-4">
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
          style={{ backgroundColor: 'rgba(0, 212, 228, 0.2)' }}
        >
          {comment.userAvatar}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ color: '#FFFFFF' }}>
                {comment.userName}
              </span>
              <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                {formatTimeAgo(comment.createdAt)}
              </span>
            </div>

            {isOwner && (
              <button
                onClick={() => onDelete(comment.id)}
                className="p-1 rounded hover:bg-white/10 transition-all"
                style={{ color: '#EF4444' }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Comment Text */}
          <p className="mb-3" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onToggleLike(comment.id)}
              className="flex items-center gap-1 text-sm transition-all"
              style={{ color: isLiked ? '#EC4899' : 'rgba(255, 255, 255, 0.6)' }}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              {comment.likes > 0 && comment.likes}
            </button>

            <button
              onClick={onReply}
              className="text-sm transition-all"
              style={{ color: 'rgba(255, 255, 255, 0.6)' }}
            >
              Reply
            </button>
          </div>

          {/* Reply Input */}
          <AnimatePresence>
            {replyingTo === comment.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => onReplyTextChange(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      '--tw-ring-color': '#00D4E4',
                    } as any}
                    autoFocus
                  />
                  <button
                    onClick={onSubmitReply}
                    disabled={!replyText.trim()}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                    style={{
                      background: replyText.trim()
                        ? 'linear-gradient(135deg, #00D4E4 0%, #00E8FA 100%)'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                    }}
                  >
                    Send
                  </button>
                  <button
                    onClick={onCancelReply}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replies */}
          {comment.replies.length > 0 && (
            <div className="mt-4 space-y-3 pl-4 border-l-2" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ backgroundColor: 'rgba(0, 212, 228, 0.2)' }}
                  >
                    {reply.userAvatar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm" style={{ color: '#FFFFFF' }}>
                        {reply.userName}
                      </span>
                      <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {formatTimeAgo(reply.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      {reply.content}
                    </p>

                    <button
                      onClick={() => onToggleLike(reply.id)}
                      className="flex items-center gap-1 text-xs transition-all"
                      style={{
                        color: LikeService.isLiked(undefined, undefined, reply.id)
                          ? '#EC4899'
                          : 'rgba(255, 255, 255, 0.6)',
                      }}
                    >
                      <Heart
                        className={`w-3 h-3 ${
                          LikeService.isLiked(undefined, undefined, reply.id) ? 'fill-current' : ''
                        }`}
                      />
                      {reply.likes > 0 && reply.likes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

export default CommentsSection;

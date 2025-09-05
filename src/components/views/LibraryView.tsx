import React, { useState } from 'react';
import { Search, Filter, Play, Clock, MoreHorizontal, Download, Share } from 'lucide-react';

interface Episode {
  id: string;
  title: string;
  description: string;
  duration: number;
  createdAt: string;
  style: 'Single Voice' | 'Multi-Voice' | 'Expert Panel';
  status: 'completed' | 'processing' | 'failed';
  tags: string[];
  playCount?: number;
}

interface LibraryViewProps {
  currentView: string;
}

const LibraryView: React.FC<LibraryViewProps> = ({ currentView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  if (!['library', 'episodes'].includes(currentView)) return null;

  // Mock data
  const episodes: Episode[] = [
    {
      id: '1',
      title: 'The Future of Renewable Energy',
      description: 'Comprehensive analysis of solar and wind power innovations',
      duration: 1847,
      createdAt: '2025-01-15',
      style: 'Multi-Voice',
      status: 'completed',
      tags: ['Energy', 'Technology', 'Environment'],
      playCount: 156
    },
    {
      id: '2',
      title: 'Machine Learning Fundamentals',
      description: 'Introduction to neural networks and deep learning concepts',
      duration: 2134,
      createdAt: '2025-01-14',
      style: 'Single Voice',
      status: 'completed',
      tags: ['AI', 'Technology', 'Education'],
      playCount: 89
    },
    {
      id: '3',
      title: 'Climate Change Policy Discussion',
      description: 'Expert panel on international climate agreements',
      duration: 2890,
      createdAt: '2025-01-13',
      style: 'Expert Panel',
      status: 'completed',
      tags: ['Politics', 'Environment', 'Policy'],
      playCount: 203
    },
    {
      id: '4',
      title: 'Cryptocurrency Market Analysis',
      description: 'Current state of Bitcoin and altcoin markets',
      duration: 0,
      createdAt: '2025-01-12',
      style: 'Multi-Voice',
      status: 'processing',
      tags: ['Finance', 'Technology', 'Markets']
    },
  ];

  const filteredEpisodes = episodes.filter(episode => {
    const matchesSearch = episode.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         episode.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         episode.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'completed' && episode.status === 'completed') ||
                         (selectedFilter === 'processing' && episode.status === 'processing') ||
                         episode.style.toLowerCase().replace(' ', '-') === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const EpisodeRow: React.FC<{ episode: Episode }> = ({ episode }) => (
    <div className="group p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200">
      <div className="flex items-center space-x-4">
        {/* Play Button */}
        <button 
          className={`p-3 rounded-full transition-all duration-200 ${
            episode.status === 'completed' 
              ? 'bg-white border border-gray-200 hover:border-accent-500 hover:bg-accent-50 group-hover:scale-110' 
              : 'bg-gray-100 cursor-not-allowed'
          }`}
          disabled={episode.status !== 'completed'}
        >
          <Play className={`w-5 h-5 ${
            episode.status === 'completed' ? 'text-accent-600' : 'text-gray-400'
          }`} />
        </button>

        {/* Episode Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {episode.title}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(episode.status)}`}>
              {episode.status}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-2 line-clamp-2">
            {episode.description}
          </p>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{episode.status === 'completed' ? formatDuration(episode.duration) : 'Processing...'}</span>
            </span>
            <span>{episode.style}</span>
            <span>{new Date(episode.createdAt).toLocaleDateString()}</span>
            {episode.playCount && (
              <span>{episode.playCount} plays</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {episode.tags.map(tag => (
              <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {episode.status === 'completed' && (
            <>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Download">
                <Download className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Share">
                <Share className="w-4 h-4 text-gray-600" />
              </button>
            </>
          )}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="More options">
            <MoreHorizontal className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {currentView === 'library' ? 'Your Library' : 'Episodes'}
        </h1>
        <p className="text-gray-600">
          Manage and listen to your generated podcasts
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search episodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            >
              <option value="all">All Episodes</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="single-voice">Single Voice</option>
              <option value="multi-voice">Multi-Voice</option>
              <option value="expert-panel">Expert Panel</option>
            </select>
          </div>
        </div>
      </div>

      {/* Episode List */}
      <div className="bg-white rounded-xl border border-gray-200">
        {filteredEpisodes.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredEpisodes.map(episode => (
              <EpisodeRow key={episode.id} episode={episode} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No episodes found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Start by uploading a document to create your first podcast'}
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      {filteredEpisodes.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{episodes.filter(e => e.status === 'completed').length}</p>
            <p className="text-sm text-gray-600">Completed Episodes</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{episodes.filter(e => e.status === 'processing').length}</p>
            <p className="text-sm text-gray-600">Processing</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(episodes.filter(e => e.status === 'completed').reduce((acc, e) => acc + e.duration, 0) / 3600)}h
            </p>
            <p className="text-sm text-gray-600">Total Duration</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">
              {episodes.reduce((acc, e) => acc + (e.playCount || 0), 0)}
            </p>
            <p className="text-sm text-gray-600">Total Plays</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryView;
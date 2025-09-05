import React from 'react';
import { Play, Clock, Headphones, Check } from 'lucide-react';
import type { DocumentContent } from '../../types/document';

interface Episode {
  id: string;
  title: string;
  description: string;
  duration: number;
  createdAt: string;
  thumbnail?: string;
  tags: string[];
}

interface HomeViewProps {
  currentView: string;
  onOpenUpload: () => void;
  uploadedContent?: DocumentContent[] | null;
}

const HomeView: React.FC<HomeViewProps> = ({ currentView, onOpenUpload, uploadedContent }) => {
  if (currentView !== 'home') return null;

  // Mock data for demonstration
  const featuredEpisodes: Episode[] = [
    {
      id: '1',
      title: 'AI and the Future of Work',
      description: 'A comprehensive analysis of how artificial intelligence is reshaping industries and creating new opportunities.',
      duration: 1247,
      createdAt: '2025-01-15',
      tags: ['AI', 'Technology', 'Future']
    },
    {
      id: '2',
      title: 'Climate Change: Solutions and Strategies',
      description: 'Expert panel discussion on innovative approaches to combat climate change and build sustainable futures.',
      duration: 892,
      createdAt: '2025-01-14',
      tags: ['Climate', 'Environment', 'Science']
    },
    {
      id: '3',
      title: 'The Psychology of Decision Making',
      description: 'Deep dive into cognitive biases and how they influence our daily choices and business decisions.',
      duration: 1567,
      createdAt: '2025-01-13',
      tags: ['Psychology', 'Business', 'Behavior']
    }
  ];

  const recentEpisodes: Episode[] = [
    {
      id: '4',
      title: 'Quantum Computing Breakthrough',
      description: 'Latest developments in quantum computing and their implications for cryptography.',
      duration: 945,
      createdAt: '2025-01-12',
      tags: ['Quantum', 'Computing', 'Security']
    },
    {
      id: '5',
      title: 'Sustainable Architecture Design',
      description: 'Innovative building techniques that prioritize environmental sustainability.',
      duration: 1134,
      createdAt: '2025-01-11',
      tags: ['Architecture', 'Sustainability', 'Design']
    },
    {
      id: '6',
      title: 'Digital Privacy in 2025',
      description: 'Understanding data protection laws and maintaining privacy in the digital age.',
      duration: 823,
      createdAt: '2025-01-10',
      tags: ['Privacy', 'Digital', 'Security']
    }
  ];

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const EpisodeCard: React.FC<{ episode: Episode; featured?: boolean }> = ({ episode, featured = false }) => (
    <div className={`group relative overflow-hidden rounded-xl hover-lift cursor-pointer ${
      featured ? 'h-64' : 'h-48'
    }`}>
      <div className={`w-full h-full bg-gradient-to-br ${
        featured 
          ? 'from-accent-100 via-accent-50 to-primary-50' 
          : 'from-gray-100 via-gray-50 to-white'
      } border border-gray-200/50`}>
        
        {/* Content */}
        <div className="p-6 h-full flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {episode.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs font-medium bg-white/70 text-gray-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            <h3 className={`font-semibold text-gray-900 mb-2 ${
              featured ? 'text-xl' : 'text-lg'
            }`}>
              {episode.title}
            </h3>
            
            <p className="text-gray-600 text-sm line-clamp-3 mb-4">
              {episode.description}
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(episode.duration)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Headphones className="w-4 h-4" />
                <span>Generated</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Play button overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
              <Play className="w-6 h-6 text-gray-900 ml-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      {/* Hero Section */}
      <section className="relative">
        <div className="gradient-music rounded-2xl p-12 text-white relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl font-bold mb-4">
              Discover new insights every day.
            </h1>
            <p className="text-xl opacity-90 mb-8">
              Transform any document into engaging podcasts with AI-powered narration and multi-voice conversations.
            </p>
            <button 
              onClick={onOpenUpload}
              className="px-8 py-3 bg-white text-accent-600 rounded-full font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              Get Started
            </button>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
            <div className="w-full h-full bg-gradient-to-l from-white/20 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Featured Episodes */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Episodes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredEpisodes.map((episode) => (
            <EpisodeCard key={episode.id} episode={episode} featured />
          ))}
        </div>
      </section>

      {/* Recent Episodes */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Episodes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentEpisodes.map((episode) => (
            <EpisodeCard key={episode.id} episode={episode} />
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={onOpenUpload}
            className="relative p-6 bg-white rounded-xl border border-gray-200/50 hover-lift cursor-pointer"
          >
            {uploadedContent && uploadedContent.length > 0 && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            )}
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center mb-4">
              <Play className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Document</h3>
            <p className="text-gray-600 text-sm">
              Convert your PDFs, documents, or articles into engaging podcasts
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-xl border border-gray-200/50 hover-lift cursor-pointer">
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center mb-4">
              <Headphones className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Library</h3>
            <p className="text-gray-600 text-sm">
              Explore your collection of generated podcasts and saved episodes
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-xl border border-gray-200/50 hover-lift cursor-pointer">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Activity</h3>
            <p className="text-gray-600 text-sm">
              See your latest uploads and recently played episodes
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeView;
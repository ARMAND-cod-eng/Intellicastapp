import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  Sparkles,
  Zap,
  Radio,
  FileText,
  Users,
  ArrowRight,
  Play,
  Brain,
  Headphones,
  Clock,
  TrendingUp,
  CheckCircle2,
  Newspaper,
  MessageSquare,
  Volume2,
  ChevronRight
} from 'lucide-react';

const HomePageView: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [stats, setStats] = useState({
    podcasts: 0,
    minutes: 0,
    users: 0,
    accuracy: 0
  });

  // Animate stats on mount
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    const targets = {
      podcasts: 10000,
      minutes: 50000,
      users: 5000,
      accuracy: 99
    };

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;

      setStats({
        podcasts: Math.floor(targets.podcasts * progress),
        minutes: Math.floor(targets.minutes * progress),
        users: Math.floor(targets.users * progress),
        accuracy: Math.floor(targets.accuracy * progress)
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: Users,
      title: 'Multi-Voice Conversations',
      description: 'Transform documents into engaging two-person podcasts with natural dialogue',
      color: '#00D4E4',
      gradient: 'from-cyan-500 to-cyan-400'
    },
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Advanced content understanding with LLaMA-3 and intelligent summarization',
      color: '#00E8FA',
      gradient: 'from-cyan-400 to-blue-400'
    },
    {
      icon: Newspaper,
      title: 'Real-Time News Audio',
      description: 'Stay informed with AI-generated news briefings from global sources',
      color: '#00D4E4',
      gradient: 'from-blue-400 to-cyan-500'
    },
    {
      icon: Volume2,
      title: 'Professional Quality',
      description: 'Ultra-realistic voice synthesis with Cartesia Sonic technology',
      color: '#00E8FA',
      gradient: 'from-cyan-500 to-teal-400'
    }
  ];

  const useCases = [
    {
      icon: FileText,
      title: 'Research Papers',
      description: 'Convert academic papers into digestible audio summaries'
    },
    {
      icon: Newspaper,
      title: 'News Briefings',
      description: 'Stay updated with personalized daily news podcasts'
    },
    {
      icon: MessageSquare,
      title: 'Meeting Notes',
      description: 'Transform meeting transcripts into podcast recaps'
    },
    {
      icon: Headphones,
      title: 'Learning Content',
      description: 'Create educational podcasts from textbooks and articles'
    }
  ];

  const conversationStyles = [
    { name: 'Conversational Chat', description: 'Friendly, casual discussion' },
    { name: 'Expert Panel', description: 'Professional analysis' },
    { name: 'Debate Style', description: 'Adversarial exchanges' },
    { name: 'Interview Format', description: 'Q&A style dialogue' }
  ];

  return (
    <div className="min-h-full overflow-y-auto" style={{ backgroundColor: '#14191a' }}>
      {/* Hero Section */}
      <motion.section
        className="relative px-8 pt-20 pb-32 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-1/4 -left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: 'radial-gradient(circle, #00D4E4, transparent)' }}
          />
          <div
            className="absolute bottom-1/4 -right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: 'radial-gradient(circle, #00E8FA, transparent)' }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-8"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 212, 228, 0.2), rgba(0, 232, 250, 0.1))',
                border: '1px solid rgba(0, 212, 228, 0.3)',
                boxShadow: '0 0 20px rgba(0, 212, 228, 0.2)'
              }}
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="w-4 h-4" style={{ color: '#00D4E4' }} />
              <span className="text-sm font-medium" style={{ color: '#00D4E4' }}>
                Next-Generation AI Podcast Platform
              </span>
            </motion.div>

            {/* Main Headline */}
            <h1
              className="text-6xl md:text-7xl font-bold mb-6 leading-tight"
              style={{ color: '#FFFFFF' }}
            >
              Transform Content Into
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Engaging Podcasts
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed"
              style={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              AI-powered platform that converts documents, news, and web content into
              professional multi-voice podcasts in seconds
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center space-x-4">
              <motion.button
                className="group flex items-center space-x-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
                  color: '#FFFFFF',
                  boxShadow: '0 0 30px rgba(0, 212, 228, 0.4)'
                }}
                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(0, 212, 228, 0.6)' }}
                whileTap={{ scale: 0.95 }}
              >
                <Play className="w-5 h-5" />
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <motion.button
                className="flex items-center space-x-2 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                whileHover={{
                  backgroundColor: 'rgba(0, 212, 228, 0.1)',
                  borderColor: '#00D4E4'
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Mic className="w-5 h-5" />
                <span>Watch Demo</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            {[
              { label: 'Podcasts Created', value: stats.podcasts.toLocaleString() + '+', icon: Radio },
              { label: 'Minutes Processed', value: stats.minutes.toLocaleString() + '+', icon: Clock },
              { label: 'Active Users', value: stats.users.toLocaleString() + '+', icon: Users },
              { label: 'AI Accuracy', value: stats.accuracy + '%', icon: TrendingUp }
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="p-6 rounded-2xl text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 228, 0.1), rgba(0, 232, 250, 0.05))',
                  border: '1px solid rgba(0, 212, 228, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                whileHover={{ scale: 1.05, borderColor: '#00D4E4' }}
              >
                <stat.icon className="w-8 h-8 mx-auto mb-3" style={{ color: '#00D4E4' }} />
                <div className="text-3xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
                  {stat.value}
                </div>
                <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
              Powerful AI Features
            </h2>
            <p className="text-xl" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Everything you need to create professional podcasts
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="group p-8 rounded-3xl cursor-pointer transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 228, 0.1), rgba(0, 232, 250, 0.05))',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{
                  scale: 1.02,
                  borderColor: '#00D4E4',
                  boxShadow: '0 0 40px rgba(0, 212, 228, 0.2)'
                }}
                onHoverStart={() => setActiveFeature(index)}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${feature.color}, rgba(0, 232, 250, 0.6))`,
                    boxShadow: `0 0 20px ${feature.color}40`
                  }}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold mb-3" style={{ color: '#FFFFFF' }}>
                  {feature.title}
                </h3>

                <p className="text-lg mb-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {feature.description}
                </p>

                <div className="flex items-center space-x-2 text-sm font-medium" style={{ color: '#00D4E4' }}>
                  <span>Learn more</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Conversation Styles Section */}
      <section className="px-8 py-20" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
              4 Conversation Styles
            </h2>
            <p className="text-xl" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Choose the perfect format for your content
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {conversationStyles.map((style, index) => (
              <motion.div
                key={index}
                className="p-6 rounded-2xl text-center transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 228, 0.15), rgba(0, 232, 250, 0.08))',
                  border: '1px solid rgba(0, 212, 228, 0.3)'
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{
                  scale: 1.05,
                  boxShadow: '0 0 30px rgba(0, 212, 228, 0.3)'
                }}
              >
                <CheckCircle2 className="w-10 h-10 mx-auto mb-4" style={{ color: '#00D4E4' }} />
                <h3 className="text-lg font-bold mb-2" style={{ color: '#FFFFFF' }}>
                  {style.name}
                </h3>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {style.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
              Perfect For Every Need
            </h2>
            <p className="text-xl" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Transform any content into engaging audio experiences
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                className="p-6 rounded-2xl transition-all duration-300 hover:scale-105"
                style={{
                  backgroundColor: '#14191a',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{
                  borderColor: '#00D4E4',
                  boxShadow: '0 0 30px rgba(0, 212, 228, 0.2)'
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 212, 228, 0.2), rgba(0, 232, 250, 0.1))',
                    border: '1px solid rgba(0, 212, 228, 0.3)'
                  }}
                >
                  <useCase.icon className="w-6 h-6" style={{ color: '#00D4E4' }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#FFFFFF' }}>
                  {useCase.title}
                </h3>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {useCase.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-8 py-32 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 212, 228, 0.15), rgba(0, 232, 250, 0.08))'
          }}
        />
        <div className="absolute inset-0">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, #00D4E4, transparent)' }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, #00E8FA, transparent)' }}
          />
        </div>

        <motion.div
          className="relative max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Zap className="w-16 h-16 mx-auto mb-6" style={{ color: '#00D4E4' }} />

          <h2 className="text-5xl md:text-6xl font-bold mb-6" style={{ color: '#FFFFFF' }}>
            Ready to Create Amazing Podcasts?
          </h2>

          <p className="text-xl md:text-2xl mb-12" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Join thousands of creators transforming content into audio
          </p>

          <motion.button
            className="group flex items-center space-x-3 px-10 py-5 rounded-2xl font-bold text-xl mx-auto transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #00D4E4, #00E8FA)',
              color: '#FFFFFF',
              boxShadow: '0 0 40px rgba(0, 212, 228, 0.5)'
            }}
            whileHover={{ scale: 1.05, boxShadow: '0 0 60px rgba(0, 212, 228, 0.7)' }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Start Creating Now</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};

export default HomePageView;

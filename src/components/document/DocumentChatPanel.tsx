import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Sparkles, Copy, ThumbsUp, ThumbsDown, Loader2, Quote } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ text: string; position: number }>;
  timestamp: Date;
}

interface DocumentChatPanelProps {
  documentContent: string;
  documentTitle: string;
  documentSummary?: string;
  onHighlightText?: (position: number) => void;
}

const DocumentChatPanel: React.FC<DocumentChatPanelProps> = ({
  documentContent,
  documentTitle,
  documentSummary,
  onHighlightText
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState(documentSummary || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate AI summary on mount if not provided
  useEffect(() => {
    if (!aiSummary && documentContent) {
      generateSummary();
    }
  }, [documentContent]);

  // Generate document summary using AI
  const generateSummary = async () => {
    setGeneratingSummary(true);
    try {
      // Simulated AI summary generation (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simple extractive summary (first 300 characters)
      const summary = documentContent.slice(0, 300) + '...';
      setAiSummary(summary);

      // Add welcome message
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I've analyzed your document "${documentTitle}". Ask me anything about it!`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulated AI response (replace with actual Together AI API call)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simple keyword-based response
      const response = generateContextualResponse(inputMessage, documentContent);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        citations: response.citations,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Generate contextual response based on document content
  const generateContextualResponse = (question: string, content: string) => {
    const lowerQuestion = question.toLowerCase();

    // Find relevant sentences in the document
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const relevantSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      const questionWords = lowerQuestion.split(' ').filter(w => w.length > 3);
      return questionWords.some(word => lowerSentence.includes(word));
    });

    if (relevantSentences.length > 0) {
      const topSentence = relevantSentences[0].trim();
      return {
        content: `Based on the document, ${topSentence}. Would you like me to elaborate on any specific aspect?`,
        citations: [{ text: topSentence, position: content.indexOf(topSentence) }]
      };
    }

    // Default response
    return {
      content: "I couldn't find a specific answer to that in the document. Could you rephrase your question or ask about a different topic mentioned in the text?",
      citations: []
    };
  };

  // Suggested questions based on document analysis
  const suggestedQuestions = [
    "What is the main topic of this document?",
    "Summarize the key points",
    "What are the main arguments or findings?",
    "Explain this in simpler terms"
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black border-r border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="flex items-center space-x-2 mb-2">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <h2 className="text-white font-bold">Document Chat</h2>
        </div>
        <p className="text-xs text-gray-400 line-clamp-1">{documentTitle}</p>
      </div>

      {/* AI Summary Section */}
      {aiSummary && (
        <div className="p-4 bg-gradient-to-br from-purple-900/10 to-blue-900/10 border-b border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">AI Summary</h3>
          </div>
          {generatingSummary ? (
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing document...</span>
            </div>
          ) : (
            <p className="text-sm text-gray-300 leading-relaxed">{aiSummary}</p>
          )}
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {messages.length === 0 && !generatingSummary && (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-4">Start chatting with your document</p>

            {/* Suggested Questions */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">Try asking:</p>
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(question)}
                  className="w-full p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-left text-xs text-gray-300 transition-colors border border-gray-700"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-3 ${
                message.role === 'user'
                  ? 'bg-[#00D4E4] text-white'
                  : 'bg-gray-800 text-gray-100 border border-gray-700'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

              {/* Citations */}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  {message.citations.map((citation, index) => (
                    <button
                      key={index}
                      onClick={() => onHighlightText?.(citation.position)}
                      className="flex items-start space-x-2 p-2 rounded-lg bg-blue-900/20 hover:bg-blue-900/30 transition-colors text-left w-full mb-1"
                    >
                      <Quote className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-blue-300 italic line-clamp-2">
                        "{citation.text.slice(0, 100)}..."
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Message Actions (for assistant messages) */}
              {message.role === 'assistant' && (
                <div className="flex items-center space-x-2 mt-2">
                  <button className="p-1 rounded hover:bg-gray-700 transition-colors" title="Copy">
                    <Copy className="w-3 h-3 text-gray-400" />
                  </button>
                  <button className="p-1 rounded hover:bg-gray-700 transition-colors" title="Good response">
                    <ThumbsUp className="w-3 h-3 text-gray-400" />
                  </button>
                  <button className="p-1 rounded hover:bg-gray-700 transition-colors" title="Bad response">
                    <ThumbsDown className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700 bg-gray-900/50">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask anything about this document..."
            className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-[#00D4E4] transition-colors text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="p-2 rounded-lg bg-[#00D4E4] hover:bg-[#00E8FA] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Ask specific questions about the content for better answers
        </p>
      </div>

      {/* Custom Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 212, 228, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 212, 228, 0.7);
        }
      `}</style>
    </div>
  );
};

export default DocumentChatPanel;

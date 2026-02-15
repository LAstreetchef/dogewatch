'use client';

import { useState, useRef, useEffect } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Badge } from '@/components/ui/Badge';
import { 
  Send, 
  Dog,
  AlertTriangle,
  TrendingUp,
  MapPin,
  DollarSign,
  Sparkles,
  History,
  X,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface Provider {
  npi: string;
  name: string;
  state: string;
  specialty?: string;
  anomaly_score: number;
  total_billed: number;
  is_flagged: boolean;
}

interface BloodhoundResult {
  id: string;
  query: string;
  summary: string;
  flaggedProviders: Provider[];
  patternInsight?: string;
  confidenceScore: number;
  timestamp: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  result?: BloodhoundResult;
  timestamp: Date;
}

const exampleQueries = [
  "Show me the highest billing providers in Texas",
  "Find anomalies in autism-related claims",
  "Which states have the most flagged providers?",
  "Providers with >$10M in billings",
  "Compare billing patterns in CA vs FL",
];

export default function BloodhoundPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSubmit = async (query: string) => {
    if (!query.trim() || loading) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowExamples(false);

    try {
      const response = await fetch('/api/bloodhound/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.summary || data.error || 'No results found.',
        result: data.error ? undefined : data,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      // Ignore abort errors
      if (error?.name === 'AbortError') {
        return;
      }
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Failed to process query. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-risk-high';
    if (score >= 0.5) return 'text-risk-medium';
    return 'text-risk-low';
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-doge-gold/20 to-risk-high/20 flex items-center justify-center">
          <Dog className="text-doge-gold" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-doge-text">Bloodhound AI</h1>
          <p className="text-sm text-doge-muted">Ask questions about Medicaid billing patterns</p>
        </div>
      </div>

      {/* Chat Area */}
      <Panel className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && showExamples && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <Logo size={80} sniff className="mb-6 opacity-50" />
              <h2 className="text-xl font-semibold text-doge-text mb-2">
                What can I sniff out for you?
              </h2>
              <p className="text-doge-muted mb-6 max-w-md">
                I can analyze 13,000+ Medicaid providers, find billing anomalies, 
                and help you identify potential fraud patterns.
              </p>
              
              <div className="grid gap-2 w-full max-w-lg">
                {exampleQueries.map((query, i) => (
                  <button
                    key={i}
                    onClick={() => handleSubmit(query)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-doge-bg border border-doge-border hover:border-doge-gold/50 transition-colors text-left group"
                  >
                    <Sparkles size={16} className="text-doge-gold shrink-0" />
                    <span className="text-sm text-doge-text group-hover:text-doge-gold transition-colors">
                      {query}
                    </span>
                    <ChevronRight size={16} className="text-doge-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
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
                className={`max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-doge-gold text-doge-bg rounded-2xl rounded-br-md px-4 py-2'
                    : 'space-y-3'
                }`}
              >
                {message.role === 'user' ? (
                  <p>{message.content}</p>
                ) : (
                  <>
                    {/* AI Response */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-doge-panel border border-doge-border flex items-center justify-center shrink-0">
                        <Dog size={18} className="text-doge-gold" />
                      </div>
                      <div className="bg-doge-panel border border-doge-border rounded-2xl rounded-tl-md px-4 py-3">
                        <p className="text-doge-text">{message.content}</p>
                        
                        {message.result?.patternInsight && (
                          <div className="mt-3 p-3 bg-doge-gold/10 border border-doge-gold/30 rounded-lg">
                            <div className="flex items-center gap-2 text-doge-gold text-sm font-medium mb-1">
                              <AlertTriangle size={14} />
                              Pattern Insight
                            </div>
                            <p className="text-sm text-doge-text">
                              {message.result.patternInsight}
                            </p>
                          </div>
                        )}

                        {message.result?.confidenceScore !== undefined && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-doge-muted">
                            <span>Confidence:</span>
                            <span className={getScoreColor(message.result.confidenceScore)}>
                              {(message.result.confidenceScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Flagged Providers */}
                    {message.result?.flaggedProviders && message.result.flaggedProviders.length > 0 && (
                      <div className="ml-11 space-y-2">
                        <div className="text-xs text-doge-muted font-medium">
                          {message.result.flaggedProviders.length} providers found:
                        </div>
                        {message.result.flaggedProviders.slice(0, 5).map((provider) => (
                          <Link
                            key={provider.npi}
                            href={`/sniffer/${provider.npi}`}
                            className="block p-3 bg-doge-bg border border-doge-border rounded-lg hover:border-doge-gold/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-doge-text truncate">
                                  {provider.name}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-doge-muted mt-1">
                                  <span className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    {provider.state}
                                  </span>
                                  {provider.specialty && (
                                    <span className="truncate">{provider.specialty}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono font-semibold text-doge-gold">
                                  {formatCurrency(provider.total_billed)}
                                </div>
                                <div className={`text-xs ${getScoreColor(provider.anomaly_score)}`}>
                                  {(provider.anomaly_score * 100).toFixed(0)}% anomaly
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                        {message.result.flaggedProviders.length > 5 && (
                          <div className="text-xs text-doge-muted text-center py-2">
                            +{message.result.flaggedProviders.length - 5} more providers
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-doge-panel border border-doge-border flex items-center justify-center">
                <Logo size={20} sniff />
              </div>
              <div className="bg-doge-panel border border-doge-border rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex items-center gap-2 text-doge-muted">
                  <span className="animate-pulse">Sniffing through the data</span>
                  <span className="animate-bounce">...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-doge-border p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(input);
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about billing patterns, anomalies, providers..."
              className="flex-1 bg-doge-bg border border-doge-border rounded-xl px-4 py-3 text-doge-text placeholder-doge-muted focus:outline-none focus:border-doge-gold transition-colors"
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!input.trim() || loading}
              className="shrink-0"
            >
              <Send size={20} />
            </Button>
          </form>
        </div>
      </Panel>
    </div>
  );
}

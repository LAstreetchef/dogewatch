import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Provider {
  npi: string;
  name: string;
  state: string;
  specialty: string | null;
  anomaly_score: number;
  total_billed: number;
  is_flagged: boolean;
}

// Simple query parser - extracts intent and parameters
function parseQuery(query: string): {
  intent: 'top_billers' | 'state_filter' | 'anomalies' | 'flagged' | 'threshold' | 'compare' | 'general';
  states: string[];
  threshold?: number;
  keywords: string[];
  limit: number;
} {
  const q = query.toLowerCase();
  const states: string[] = [];
  let intent: 'top_billers' | 'state_filter' | 'anomalies' | 'flagged' | 'threshold' | 'compare' | 'general' = 'general';
  let threshold: number | undefined;
  let limit = 10;

  // Extract states (2-letter codes or full names)
  const stateMap: Record<string, string> = {
    'texas': 'TX', 'california': 'CA', 'florida': 'FL', 'new york': 'NY',
    'minnesota': 'MN', 'michigan': 'MI', 'ohio': 'OH', 'pennsylvania': 'PA',
    'illinois': 'IL', 'georgia': 'GA', 'north carolina': 'NC', 'arizona': 'AZ',
    'washington': 'WA', 'massachusetts': 'MA', 'virginia': 'VA', 'colorado': 'CO',
  };

  for (const [name, code] of Object.entries(stateMap)) {
    if (q.includes(name)) states.push(code);
  }

  // Also check for state codes directly
  const codeMatch = q.match(/\b([A-Z]{2})\b/gi);
  if (codeMatch) {
    states.push(...codeMatch.map(s => s.toUpperCase()));
  }

  // Detect intent
  if (q.includes('highest') || q.includes('top') || q.includes('most billing')) {
    intent = 'top_billers';
  } else if (q.includes('anomal') || q.includes('suspicious') || q.includes('unusual')) {
    intent = 'anomalies';
  } else if (q.includes('flag')) {
    intent = 'flagged';
  } else if (q.includes('compare') || (q.includes('vs') || q.includes('versus'))) {
    intent = 'compare';
  } else if (states.length > 0) {
    intent = 'state_filter';
  }

  // Extract threshold (e.g., ">$10M", "over 5 million")
  const thresholdMatch = q.match(/[\$>]?\s*(\d+)\s*(m|million|k|thousand)?/i);
  if (thresholdMatch && (q.includes('over') || q.includes('>') || q.includes('above') || q.includes('more than'))) {
    let val = parseInt(thresholdMatch[1]);
    const unit = thresholdMatch[2]?.toLowerCase();
    if (unit === 'm' || unit === 'million') val *= 1000000;
    if (unit === 'k' || unit === 'thousand') val *= 1000;
    threshold = val;
    intent = 'threshold';
  }

  // Extract keywords for specialty/condition filtering
  const keywords: string[] = [];
  const conditionWords = ['autism', 'mental', 'behavioral', 'therapy', 'opioid', 'pain', 'rehabilitation'];
  for (const word of conditionWords) {
    if (q.includes(word)) keywords.push(word);
  }

  return { intent, states, threshold, keywords, limit };
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const parsed = parseQuery(query);
    let providers: Provider[] = [];
    let summary = '';
    let patternInsight: string | undefined;
    let confidenceScore = 0.75;

    // Build query based on intent
    let dbQuery = supabase
      .from('providers')
      .select('npi, name, state, specialty, anomaly_score, total_billed, is_flagged');

    switch (parsed.intent) {
      case 'top_billers':
        if (parsed.states.length > 0) {
          dbQuery = dbQuery.in('state', parsed.states);
        }
        dbQuery = dbQuery.order('total_billed', { ascending: false }).limit(parsed.limit);
        break;

      case 'anomalies':
        dbQuery = dbQuery
          .gte('anomaly_score', 0.5)
          .order('anomaly_score', { ascending: false });
        if (parsed.states.length > 0) {
          dbQuery = dbQuery.in('state', parsed.states);
        }
        dbQuery = dbQuery.limit(parsed.limit);
        break;

      case 'flagged':
        dbQuery = dbQuery
          .eq('is_flagged', true)
          .order('total_billed', { ascending: false });
        if (parsed.states.length > 0) {
          dbQuery = dbQuery.in('state', parsed.states);
        }
        dbQuery = dbQuery.limit(parsed.limit);
        break;

      case 'threshold':
        dbQuery = dbQuery
          .gte('total_billed', parsed.threshold || 0)
          .order('total_billed', { ascending: false });
        if (parsed.states.length > 0) {
          dbQuery = dbQuery.in('state', parsed.states);
        }
        dbQuery = dbQuery.limit(parsed.limit);
        break;

      case 'state_filter':
        dbQuery = dbQuery
          .in('state', parsed.states)
          .order('total_billed', { ascending: false })
          .limit(parsed.limit);
        break;

      case 'compare':
        if (parsed.states.length >= 2) {
          dbQuery = dbQuery
            .in('state', parsed.states.slice(0, 2))
            .order('total_billed', { ascending: false })
            .limit(20);
        }
        break;

      default:
        // General query - show top anomalies
        dbQuery = dbQuery
          .gte('anomaly_score', 0.3)
          .order('anomaly_score', { ascending: false })
          .limit(parsed.limit);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    providers = data || [];

    // Generate summary based on results
    if (providers.length === 0) {
      summary = "I couldn't find any providers matching your query. Try broadening your search or using different terms.";
      confidenceScore = 0.3;
    } else {
      const totalBilled = providers.reduce((sum, p) => sum + (p.total_billed || 0), 0);
      const avgAnomaly = providers.reduce((sum, p) => sum + (p.anomaly_score || 0), 0) / providers.length;
      const flaggedCount = providers.filter(p => p.is_flagged).length;

      switch (parsed.intent) {
        case 'top_billers':
          summary = `Found the top ${providers.length} highest-billing providers${parsed.states.length > 0 ? ` in ${parsed.states.join(', ')}` : ''}. Combined billings: $${(totalBilled / 1000000).toFixed(1)}M.`;
          if (flaggedCount > 0) {
            patternInsight = `${flaggedCount} of these top billers are flagged for anomalies. Worth investigating further.`;
          }
          confidenceScore = 0.9;
          break;

        case 'anomalies':
          summary = `Found ${providers.length} providers with anomalous billing patterns. Average anomaly score: ${(avgAnomaly * 100).toFixed(0)}%.`;
          patternInsight = `High anomaly scores indicate billing patterns that deviate significantly from peers in similar specialties and regions.`;
          confidenceScore = 0.85;
          break;

        case 'flagged':
          summary = `Found ${providers.length} flagged providers${parsed.states.length > 0 ? ` in ${parsed.states.join(', ')}` : ''}. These have been identified for potential billing irregularities.`;
          confidenceScore = 0.9;
          break;

        case 'threshold':
          summary = `Found ${providers.length} providers with billings over $${((parsed.threshold || 0) / 1000000).toFixed(1)}M. Total: $${(totalBilled / 1000000).toFixed(1)}M across these providers.`;
          if (avgAnomaly > 0.5) {
            patternInsight = `Notably, the average anomaly score for these high-billing providers is ${(avgAnomaly * 100).toFixed(0)}%, which warrants closer inspection.`;
          }
          confidenceScore = 0.85;
          break;

        case 'state_filter':
          summary = `Found ${providers.length} providers in ${parsed.states.join(', ')}. Combined Medicaid billings: $${(totalBilled / 1000000).toFixed(1)}M.`;
          confidenceScore = 0.85;
          break;

        case 'compare':
          if (parsed.states.length >= 2) {
            const state1 = providers.filter(p => p.state === parsed.states[0]);
            const state2 = providers.filter(p => p.state === parsed.states[1]);
            const total1 = state1.reduce((s, p) => s + p.total_billed, 0);
            const total2 = state2.reduce((s, p) => s + p.total_billed, 0);
            summary = `Comparing ${parsed.states[0]} (${state1.length} providers, $${(total1 / 1000000).toFixed(1)}M) vs ${parsed.states[1]} (${state2.length} providers, $${(total2 / 1000000).toFixed(1)}M).`;
            confidenceScore = 0.8;
          }
          break;

        default:
          summary = `Found ${providers.length} providers with elevated anomaly scores. These may warrant further investigation.`;
          confidenceScore = 0.7;
      }
    }

    return NextResponse.json({
      id: crypto.randomUUID(),
      query,
      summary,
      flaggedProviders: providers,
      patternInsight,
      confidenceScore,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Bloodhound query error:', error);
    return NextResponse.json({ error: 'Failed to process query' }, { status: 500 });
  }
}

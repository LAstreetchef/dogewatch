import { NextRequest, NextResponse } from 'next/server';
import { getProviderByNPI, getProviderBilling } from '@/lib/supabase/providers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ npi: string }> }
) {
  const { npi } = await params;
  
  try {
    const provider = await getProviderByNPI(npi);
    
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }
    
    const billing = await getProviderBilling(provider.id);
    
    return NextResponse.json({
      provider,
      billing,
    });
  } catch (error) {
    console.error('Provider API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    );
  }
}

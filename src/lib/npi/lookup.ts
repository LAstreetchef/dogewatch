/**
 * NPI Registry Lookup
 * 
 * Fetches provider details from the CMS NPPES API
 * https://npiregistry.cms.hhs.gov/api-page
 */

export interface NPIResult {
  name: string;
  state: string;
  specialty: string | null;
  entityType: 'individual' | 'organization';
  address: {
    city: string;
    state: string;
    zip: string;
  } | null;
}

interface NPPESResponse {
  result_count: number;
  results?: Array<{
    number: string;
    enumeration_type: string;
    basic: {
      organization_name?: string;
      first_name?: string;
      last_name?: string;
      credential?: string;
      status: string;
    };
    addresses: Array<{
      address_purpose: string;
      address_1: string;
      city: string;
      state: string;
      postal_code: string;
      country_code: string;
    }>;
    taxonomies: Array<{
      code: string;
      desc: string;
      primary: boolean;
      state?: string;
      license?: string;
    }>;
  }>;
}

const NPI_API_BASE = 'https://npiregistry.cms.hhs.gov/api';

export async function lookupNPI(npi: string): Promise<NPIResult | null> {
  try {
    const url = `${NPI_API_BASE}/?version=2.1&number=${npi}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 24 hours
      next: { revalidate: 86400 },
    });
    
    if (!response.ok) {
      console.error(`NPI API error: ${response.status}`);
      return null;
    }
    
    const data: NPPESResponse = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return null;
    }
    
    const result = data.results[0];
    const isOrg = result.enumeration_type === 'NPI-2';
    
    // Get name
    let name: string;
    if (isOrg && result.basic.organization_name) {
      name = result.basic.organization_name;
    } else if (result.basic.first_name && result.basic.last_name) {
      name = `${result.basic.first_name} ${result.basic.last_name}`;
      if (result.basic.credential) {
        name += `, ${result.basic.credential}`;
      }
    } else {
      name = `Provider ${npi}`;
    }
    
    // Get practice address (prefer location over mailing)
    const practiceAddress = result.addresses.find(a => a.address_purpose === 'LOCATION')
      || result.addresses.find(a => a.address_purpose === 'MAILING')
      || result.addresses[0];
    
    const state = practiceAddress?.state || 'XX';
    
    // Get primary specialty
    const primaryTaxonomy = result.taxonomies.find(t => t.primary) || result.taxonomies[0];
    const specialty = primaryTaxonomy?.desc || null;
    
    return {
      name,
      state,
      specialty,
      entityType: isOrg ? 'organization' : 'individual',
      address: practiceAddress ? {
        city: practiceAddress.city,
        state: practiceAddress.state,
        zip: practiceAddress.postal_code,
      } : null,
    };
  } catch (error) {
    console.error('NPI lookup error:', error);
    return null;
  }
}

/**
 * Check if a provider needs enrichment
 * Returns true if name looks like a placeholder or state is XX
 */
export function needsEnrichment(provider: { name: string; state: string }): boolean {
  // Check for placeholder name pattern "Provider XXXXXXXXXX"
  if (/^Provider \d{10}$/.test(provider.name)) {
    return true;
  }
  
  // Check for unknown state
  if (provider.state === 'XX' || !provider.state) {
    return true;
  }
  
  return false;
}

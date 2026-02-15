'use client';

import { Panel } from '@/components/ui/Panel';
import { Logo } from '@/components/ui/Logo';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function CasesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-doge-text">Case Files</h1>
        <Button variant="primary">
          <Plus size={18} />
          New Case
        </Button>
      </div>

      <Panel className="p-12 text-center">
        <FolderOpen size={64} className="mx-auto mb-4 text-doge-muted opacity-50" />
        <h2 className="text-xl font-semibold text-doge-text mb-2">No Cases Yet</h2>
        <p className="text-doge-muted mb-6 max-w-md mx-auto">
          Case files are collaborative investigations. Start one by flagging suspicious 
          providers from the Sniffer or Bloodhound AI.
        </p>
        <Button variant="secondary" onClick={() => window.location.href = '/sniffer'}>
          Start Sniffing
        </Button>
      </Panel>
    </div>
  );
}

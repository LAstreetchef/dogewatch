'use client';

import { Panel } from '@/components/ui/Panel';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-doge-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-doge-gold hover:underline mb-8 block">
          ← Back to DogeWatch
        </Link>
        
        <Panel className="p-8">
          <h1 className="text-3xl font-bold text-doge-gold mb-6">Terms of Service</h1>
          <p className="text-doge-muted text-sm mb-8">Last updated: February 18, 2026</p>

          <div className="prose prose-invert max-w-none space-y-6 text-doge-text">
            <section>
              <h2 className="text-xl font-semibold text-doge-gold">1. Acceptance of Terms</h2>
              <p className="text-doge-muted">
                By accessing or using DogeWatch ("the Platform"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, do not use the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">2. Nature of the Platform</h2>
              <p className="text-doge-muted">
                DogeWatch is an <strong>independent research and discovery platform</strong> that aggregates and 
                analyzes publicly available healthcare billing data from government sources including the 
                Centers for Medicare & Medicaid Services (CMS).
              </p>
              <p className="text-doge-muted mt-2">
                The Platform provides tools for community-driven analysis and discussion of billing patterns. 
                <strong> DogeWatch does not make accusations of fraud or wrongdoing.</strong> All data presented 
                is derived from public government records.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">3. No Accusations or Defamation</h2>
              <p className="text-doge-muted">
                The Platform displays statistical anomalies and patterns based on mathematical analysis of 
                public data. An "anomaly score" or "flagged" status indicates statistical deviation from 
                peer averages—<strong>not</strong> an accusation of fraud, abuse, or illegal activity.
              </p>
              <p className="text-doge-muted mt-2">
                High billing volumes may reflect legitimate factors including: practice size, patient 
                complexity, geographic factors, specialization, or data reporting variations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">4. User-Generated Content</h2>
              <p className="text-doge-muted">
                Users may post findings, analyses, and discussions on the Platform. In accordance with 
                Section 230 of the Communications Decency Act (47 U.S.C. § 230), DogeWatch is not the 
                publisher or speaker of user-generated content and is not liable for content posted by users.
              </p>
              <p className="text-doge-muted mt-2">
                Users are solely responsible for their posts and must not:
              </p>
              <ul className="list-disc pl-6 text-doge-muted mt-2 space-y-1">
                <li>Make false statements of fact about identifiable individuals or entities</li>
                <li>Post content that constitutes defamation, harassment, or threats</li>
                <li>Misrepresent data or fabricate evidence</li>
                <li>Violate any applicable laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">5. Disclaimer of Warranties</h2>
              <p className="text-doge-muted">
                THE PLATFORM AND ALL DATA ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE DO NOT 
                GUARANTEE THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY DATA OR ANALYSIS.
              </p>
              <p className="text-doge-muted mt-2">
                Data is sourced from public government databases which may contain errors, omissions, 
                or outdated information. Users should independently verify any information before 
                taking action.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">6. Limitation of Liability</h2>
              <p className="text-doge-muted">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, DOGEWATCH AND ITS OPERATORS SHALL NOT BE LIABLE 
                FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM 
                YOUR USE OF THE PLATFORM.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">7. Community Verification System</h2>
              <p className="text-doge-muted">
                The Platform includes a community verification system where users may stake tokens to 
                vote on the validity of submitted findings. This system represents community opinion 
                only and does not constitute official verification, legal determination, or accusation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">8. Indemnification</h2>
              <p className="text-doge-muted">
                You agree to indemnify and hold harmless DogeWatch and its operators from any claims, 
                damages, or expenses arising from your use of the Platform or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">9. Modifications</h2>
              <p className="text-doge-muted">
                We reserve the right to modify these Terms at any time. Continued use of the Platform 
                after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">10. Governing Law</h2>
              <p className="text-doge-muted">
                These Terms shall be governed by applicable law. Any disputes shall be resolved through 
                binding arbitration.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">11. Contact</h2>
              <p className="text-doge-muted">
                For legal inquiries, contact us at{' '}
                <a href="mailto:md@dogedoctor.com" className="text-doge-gold hover:underline">md@dogedoctor.com</a>.
              </p>
            </section>
          </div>
        </Panel>
      </div>
    </div>
  );
}

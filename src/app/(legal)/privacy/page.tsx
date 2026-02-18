'use client';

import { Panel } from '@/components/ui/Panel';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-doge-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-doge-gold hover:underline mb-8 block">
          ← Back to DogeWatch
        </Link>
        
        <Panel className="p-8">
          <h1 className="text-3xl font-bold text-doge-gold mb-6">Privacy Policy</h1>
          <p className="text-doge-muted text-sm mb-8">Last updated: February 18, 2026</p>

          <div className="prose prose-invert max-w-none space-y-6 text-doge-text">
            <section>
              <h2 className="text-xl font-semibold text-doge-gold">1. Our Commitment to Privacy</h2>
              <p className="text-doge-muted">
                DogeWatch is committed to protecting user privacy. We collect minimal data and do not 
                sell or share personal information with third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">2. Information We Collect</h2>
              <p className="text-doge-muted">
                <strong>Account Information:</strong> Username, email (optional), and wallet address for 
                cryptocurrency transactions.
              </p>
              <p className="text-doge-muted mt-2">
                <strong>Usage Data:</strong> Anonymous analytics about Platform usage to improve services.
              </p>
              <p className="text-doge-muted mt-2">
                <strong>User Content:</strong> Posts, comments, and votes you submit to the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">3. Information We Do NOT Collect</h2>
              <ul className="list-disc pl-6 text-doge-muted space-y-1">
                <li>Real names (unless you choose to provide them)</li>
                <li>Physical addresses</li>
                <li>Phone numbers</li>
                <li>Government identification</li>
                <li>Financial information beyond cryptocurrency wallet addresses</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">4. Healthcare Data</h2>
              <p className="text-doge-muted">
                All healthcare provider data displayed on the Platform is derived from <strong>publicly 
                available government sources</strong> including the CMS Medicare Provider Utilization 
                and Payment Data. This data is public record and does not contain protected health 
                information (PHI) about patients.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">5. Cryptocurrency Transactions</h2>
              <p className="text-doge-muted">
                Dogecoin transactions are recorded on the public blockchain. We store wallet addresses 
                associated with your account but do not have access to your private keys or off-platform 
                funds.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">6. Data Security</h2>
              <p className="text-doge-muted">
                We implement reasonable security measures to protect data. However, no system is 100% 
                secure. Use the Platform at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">7. Third-Party Services</h2>
              <p className="text-doge-muted">
                The Platform may use third-party services for hosting and analytics. These services 
                have their own privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">8. Data Retention</h2>
              <p className="text-doge-muted">
                We retain account data while your account is active. You may request deletion of your 
                account and associated data at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">9. Law Enforcement</h2>
              <p className="text-doge-muted">
                We may disclose information if required by valid legal process. We will attempt to 
                notify affected users unless prohibited by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">10. Changes to Privacy Policy</h2>
              <p className="text-doge-muted">
                We may update this policy. Continued use of the Platform after changes constitutes 
                acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-doge-gold">11. Contact</h2>
              <p className="text-doge-muted">
                Privacy inquiries may be submitted through the Platform.
              </p>
            </section>
          </div>
        </Panel>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[13px] font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-muted)' }}>
        {title}
      </h2>
      <div className="text-[13px] leading-[1.8]" style={{ color: 'var(--text-primary)' }}>
        {children}
      </div>
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 last:mb-0">{children}</p>
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-outside ml-5 mb-3 space-y-1">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

export function ImpressumPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen px-4 sm:px-8 pt-6 pb-16" style={{ background: 'var(--bg-page)' }}>
      <div className="max-w-[720px]">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 mb-8 text-[12px] font-medium hover:opacity-60 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={13} />
          Back
        </button>

        {/* Title */}
        <h1 className="text-[28px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Impressum
        </h1>
        <p className="text-[12px] mb-10" style={{ color: 'var(--text-faint)' }}>
          Last updated: April 2026
        </p>

        {/* Divider */}
        <div className="mb-8" style={{ borderTop: '1px solid var(--border)' }} />

        {/* ── Legal info (§ 5 TMG) ── */}
        <Section title="Angaben gemäß § 5 TMG">
          <P>
            <strong>Huy Nguyen</strong><br />
            Breslauer Straße 3<br />
            64319 Pfungstadt<br />
            Deutschland
          </P>
          <P>
            <strong>Kontakt / Contact</strong><br />
            E-Mail:{' '}
            <a
              href="mailto:huynguyenbao20@gmail.com"
              className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              huynguyenbao20@gmail.com
            </a>
          </P>
          <P style={{ color: 'var(--text-muted)', fontSize: '12px' } as React.CSSProperties}>
            Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV: Huy Nguyen, Anschrift wie oben.
          </P>
        </Section>

        {/* ── Non-commercial ── */}
        <Section title="Non-Commercial Purpose">
          <P>
            SLIST is operated exclusively for non-commercial, private, and personal
            educational purposes. This website is a personal project and hobby application.
            No products, services, subscriptions, or financial instruments are offered, sold,
            or promoted through this platform. The operator derives no financial benefit,
            direct or indirect, from operating this website. No advertising is displayed.
            No user data is sold or monetised in any form.
          </P>
          <P>
            This website is not registered as a business, trade, or commercial entity. It does
            not generate revenue and is not intended to do so. Any use of this website for
            commercial purposes by third parties is strictly prohibited.
          </P>
        </Section>

        {/* ── Not financial advice ── */}
        <Section title="No Financial Advice — Important Disclaimer">
          <P>
            <strong>
              The information, data, scores, rankings, and screening results displayed on
              SLIST do not constitute financial advice, investment advice, or any form of
              financial analysis or financial research.
            </strong>
          </P>
          <P>
            Specifically, nothing on this website constitutes or should be interpreted as:
          </P>
          <Ul items={[
            'Investment advice (Anlageberatung) within the meaning of § 1 Abs. 1a Satz 2 Nr. 1a KWG or the EU MiFID II Directive (2014/65/EU)',
            'A financial analysis, research report, or independent investment recommendation',
            'A solicitation, offer, or recommendation to buy, sell, hold, or otherwise deal in any financial instrument, security, or investment product',
            'A prospectus, offering document, or information memorandum of any kind',
            'Tax advice or legal advice of any nature',
          ]} />
          <P>
            All content is provided strictly for personal informational and reference purposes only.
            Users are solely responsible for their own investment decisions. The operator strongly
            recommends that all users consult a licensed, regulated, and qualified financial advisor,
            tax advisor, and/or legal counsel before making any investment or financial decision.
          </P>
          <P>
            Past financial performance data displayed on this website does not guarantee, predict,
            or imply future results. All investments involve risk, including the possible loss of
            the entire principal invested. Financial markets are inherently unpredictable.
          </P>
        </Section>

        {/* ── Data accuracy ── */}
        <Section title="Data Accuracy &amp; Sources">
          <P>
            Financial data displayed on SLIST is sourced from publicly available, free APIs and
            databases including but not limited to: yfinance, SEC EDGAR, and OpenBB. This data
            is provided without warranty of any kind.
          </P>
          <P>
            The operator makes no representations or warranties — express or implied — regarding
            the completeness, accuracy, reliability, timeliness, suitability, or availability
            of any data or information shown. Data may contain errors, inaccuracies, delays,
            or omissions. Users must independently verify all data before relying on it for
            any purpose whatsoever.
          </P>
        </Section>

        {/* ── Scoring methodology ── */}
        <Section title="Scoring Methodology">
          <P>
            SLIST applies an automated, rule-based screening algorithm that evaluates companies
            against a set of configurable financial criteria. This scoring system is a personal
            preference tool and does not represent professional financial analysis.
          </P>
          <P>
            The screening model evaluates companies across two personal strategy frameworks:
          </P>
          <Ul items={[
            'Growth criteria: metrics such as revenue growth rate, earnings per share (EPS) growth, and forward guidance trends',
            'Value criteria: metrics such as price-to-earnings (P/E) ratio, price-to-book (P/B) ratio, debt-to-equity ratio, free cash flow yield, and return on equity (ROE)',
          ]} />
          <P>
            Each criterion is assigned a binary pass/fail result based on configurable
            thresholds set by the user. Companies are ranked by the number of criteria they
            pass. This ranking reflects only the operator's personal research preferences and
            screening interests. It does not represent an objective evaluation, a
            professional recommendation, or a guarantee of investment merit.
          </P>
          <P>
            The algorithm has not been validated or audited by any financial authority,
            regulator, or independent third party. It is provided as a personal convenience
            tool only.
          </P>
        </Section>

        {/* ── Limitation of liability ── */}
        <Section title="Limitation of Liability / Haftungsausschluss">
          <P>
            To the fullest extent permitted by applicable law, the operator of this website
            expressly disclaims all liability for:
          </P>
          <Ul items={[
            'Any financial loss, investment loss, or consequential damages arising directly or indirectly from the use of, or reliance on, any information, data, or content on this website',
            'Any decisions — financial or otherwise — made by users based on content from this website',
            'The accuracy, completeness, timeliness, or reliability of any data displayed',
            'Temporary or permanent unavailability of the website or its data feeds',
            'Technical errors, data feed interruptions, or system failures',
            'Actions or omissions of third-party data providers',
          ]} />
          <P>
            Use of this website is entirely at the user's own risk. By accessing this website,
            users acknowledge and accept this disclaimer in full.
          </P>
        </Section>

        {/* ── Analytics & cookies ── */}
        <Section title="Analytics &amp; Cookies">
          <P>
            This website uses Google Analytics 4 (provided by Google LLC, 1600 Amphitheatre
            Parkway, Mountain View, CA 94043, USA) to collect anonymised statistical data
            about how visitors use the site. Data collected includes: pages visited, session
            duration, approximate geographic region (country/region level), device type, and
            browser type.
          </P>
          <P>
            IP anonymisation is enabled. No personally identifiable information is collected
            through analytics. Analytics cookies are only set with your explicit consent.
            You may withdraw your consent at any time by clearing your browser cookies and
            declining analytics on your next visit.
          </P>
          <P>
            Google's privacy policy applies to data processed through Google Analytics:&nbsp;
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              policies.google.com/privacy
            </a>
          </P>
        </Section>

        {/* ── Privacy ── */}
        <Section title="Privacy / Datenschutz">
          <P>
            This website does not collect, store, or process personal data beyond what is
            strictly necessary for providing the service. User authentication (where
            applicable) is handled via Supabase, an industry-standard infrastructure provider.
            No user data is sold, shared with third parties for marketing purposes, or used
            for profiling.
          </P>
          <P>
            For any questions regarding your data or to request deletion of your account data,
            contact: <a href="mailto:huynguyenbao20@gmail.com" className="underline underline-offset-2 hover:opacity-70 transition-opacity">huynguyenbao20@gmail.com</a>
          </P>
        </Section>

        {/* ── Copyright ── */}
        <Section title="Copyright">
          <P>
            All original content, design, and code on this website is the property of Huy Nguyen.
            Financial data is sourced from third-party public APIs and is subject to their
            respective terms of use. Unauthorised commercial use or reproduction of this
            website's content is prohibited.
          </P>
        </Section>

        {/* Footer note */}
        <div className="mt-10 pt-6 text-[11px] leading-relaxed" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-faint)' }}>
          This Impressum is provided in accordance with § 5 Telemediengesetz (TMG) and applies
          to the website operated at this domain. The operator reserves the right to update
          this page at any time without prior notice.
        </div>

      </div>
    </div>
  )
}

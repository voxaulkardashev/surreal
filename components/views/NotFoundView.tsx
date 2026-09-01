'use client';

import { PageContainer } from '@/components/PageContainer';
import { SmartLink } from '@/components/SmartLink';
import { ArrowIcon } from '@/components/Icons';
import { BY_SLUG } from '@/lib/destinations';

export function NotFoundView() {
  return (
    <PageContainer namespace="arrival" subject={BY_SLUG['bootes-void']}>
      <section className="stage">
        <div className="stack">
          <p className="eyebrow" data-reveal>
            no such place
          </p>
          <h1 className="display" data-reveal>
            You have arrived
            <br />
            at <em>nothing</em>.
          </h1>
          <p className="lede" data-reveal>
            There is no destination at that address. The nearest equivalent is the Boötes Void,
            which is at least famous for it.
          </p>
          <div className="row" data-reveal style={{ marginTop: 12 }}>
            <SmartLink href="/atlas" className="btn">
              Open the atlas <ArrowIcon />
            </SmartLink>
            <SmartLink href="/" className="btn btn--ghost">
              Back to Earth
            </SmartLink>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}

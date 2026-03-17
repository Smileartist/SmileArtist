import React from 'react';
import PageLayout from './PageLayout';

export default function License() {
  return (
    <PageLayout title="License">
      <div className="space-y-6 text-sm text-[#8a7c74] dark:text-[#a0948d] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">Content Ownership</h2>
          <p>
            You retain full ownership of the text, poetry, and creative content you post on Smile Artist. By posting, you grant Smile Artist a non-exclusive license to display and host your content on our platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">Platform Intellectual Property</h2>
          <p>
            All UI designs, logos, text, and computer code making up the Smile Artist experiences are the exclusive property of Smile Artist. No parts of the application may be copied, redistributed, or reverse engineered with intent without written consent.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">AI Disclaimer</h2>
          <p>
            Some features utilize Artificial Intelligence. While you own your strictly original inputs, AI-enhanced creations must adhere to safety ethical guidelines and respect downstream copyright controls of core generator utilities.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}

import React from 'react';
import PageLayout from './PageLayout';

export default function Privacy() {
  return (
    <PageLayout title="Privacy Policy">
      <div className="space-y-6 text-sm text-[#8a7c74] dark:text-[#a0948d] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">Information We Collect</h2>
          <p>
            We collect information you provide directly to us when creating an account, posting content (poetry, text, designs), or communicating with us. This may include your username, email address, password, profile picture, and content data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">How We Use Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide, maintain, and improve our services and AI features.</li>
            <li>To manage your account and send relevant technical notices or support updates.</li>
            <li>To monitor and analyze trends, usage, and activities in connection with our Services.</li>
            <li>To protect the safety and security of our users and platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">Data Sharing and Disclosure</h2>
          <p>
            We do not sell your personal data. We only share information with third-party vendors (like Supabase for database hosting) bound by privacy rules to help run the service, or if required to comply with legal obligations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">Data Security</h2>
          <p>
            We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access or disclosure through encrypted hosting modules.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">Your Rights & Choices</h2>
          <p>
            You may update or delete your profile information at any time via your account settings. You can also permanently delete your account, which removes all your posts and relative data from our active databases.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}

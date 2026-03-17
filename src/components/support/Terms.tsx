import React from 'react';
import PageLayout from './PageLayout';

export default function Terms() {
  return (
    <PageLayout title="Terms & Conditions">
      <div className="space-y-6 text-sm text-[#8a7c74] dark:text-[#a0948d] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">Introduction</h2>
          <p>
            Welcome to Smile Artist. By accessing or using our platform, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the application.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">User Responsibilities</h2>
          <p>
            You are responsible for the content you post and ensure it does not infringe on anyone's rights. You must not use the platform to harass, spam, or share harmful materials.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">Acceptable Use</h2>
          <p>
            Smile Artist is intended for creative expression and emotional support. Actions attempting to disrupt the service, reverse engineer code, or harvest user data are strictly prohibited.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">Limitation of Liability</h2>
          <p>
            We provide this platform "as is". Smile Artist shall not be held liable for any indirect damages resulting from your use of the service or reliance on any community advice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-[#2d2424] dark:text-[#f5e8e0]">Changes to Terms</h2>
          <p>
            We may update these terms periodically. Continued use of the platform after updates signifies acceptance of the revised conditions.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}

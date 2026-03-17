import React from 'react';
import PageLayout from './PageLayout';

export default function AboutUs() {
  return (
    <PageLayout title="About Smile Artist">
      <div className="space-y-6 text-[#2d2424] dark:text-[#f5e8e0]">
        <section>
          <h2 className="text-xl font-semibold mb-2 text-[#d4756f]">Mission</h2>
          <p className="text-sm leading-relaxed text-[#8a7c74] dark:text-[#a0948d]">
            Our mission is to merge creativity with technology in a way that feels personal, human, and impactful.
          </p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2 text-[#d4756f]">What We Do</h2>
          <p className="text-sm leading-relaxed text-[#8a7c74] dark:text-[#a0948d]">
            Smile Artist is a creative-tech platform that helps users express emotions through words, design, and AI-powered experiences. We combine storytelling, design, and intelligent tools to help people communicate feelings they struggle to say out loud.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-[#d4756f]">Vision</h2>
          <p className="text-sm leading-relaxed text-[#8a7c74] dark:text-[#a0948d]">
            To create a world where everyone has a safe space to share their artistic voice, connect without judgment, and heal through shared expression and design.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}

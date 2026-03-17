import React from 'react';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function PageLayout({ title, subtitle, children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#fcf8f5] dark:bg-[#1a1212] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#2d2424] dark:text-[#f5e8e0]">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-[#8a7c74] dark:text-[#a0948d]">{subtitle}</p>
          )}
        </div>
        <div className="bg-white/90 dark:bg-[#2d2424]/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-[#d4756f]/10 shadow-md">
          {children}
        </div>
      </div>
    </div>
  );
}

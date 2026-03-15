import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Sparkles, BookOpen, MessageSquare, Wind, Info, CheckCircle } from 'lucide-react';

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.09 } },
    exit: { opacity: 0 }
};

function AnalysisSection({ icon: Icon, title, content, accent }: { icon: any, title: string, content: string, accent: string }) {
    return (
        <motion.div
            variants={fadeUp}
            className="p-4 rounded-xl mt-4"
            style={{
                backgroundColor: `${accent}15`,
                border: `1px solid ${accent}30`
            }}
        >
            <div className="flex items-center gap-2 mb-2 font-semibold" style={{ color: accent }}>
                <Icon size={16} />
                <span>{title}</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--theme-text)", opacity: 0.9 }}>
                {content}
            </p>
        </motion.div>
    );
}

function ShimmerCard() {
    return (
        <motion.div variants={fadeUp} className="p-4 rounded-xl mt-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <div className="flex flex-col gap-2">
                <div className="shimmer w-1/3 mb-2" />
                <div className="shimmer w-11/12" />
                <div className="shimmer w-4/5" />
            </div>
        </motion.div>
    );
}

interface AnalysisPanelProps {
    loading: boolean;
    result: any;
    theme: any;
}

export function AnalysisPanel({ loading, result, theme }: AnalysisPanelProps) {
    return (
        <div className="w-full">
            <AnimatePresence mode="wait">

                {/* Loading State */}
                {loading && (
                    <motion.div key="shimmer" variants={staggerContainer} initial="hidden" animate="show" exit="exit" className="flex flex-col gap-3">
                        <motion.div variants={fadeUp} className="p-5 rounded-xl border border-white/10" style={{ background: 'var(--theme-card-bg)' }}>
                            <div className="shimmer w-1/3 mb-4" />
                            <div className="shimmer w-3/4 h-8" />
                        </motion.div>
                        {[1, 2, 3].map(i => <ShimmerCard key={i} />)}
                    </motion.div>
                )}

                {/* Success State */}
                {!loading && result && (
                    <motion.div key="result" variants={staggerContainer} initial="hidden" animate="show" exit="exit" className="flex flex-col gap-3">

                        {/* Primary Sentiment Card */}
                        <motion.div
                            variants={fadeUp}
                            className="p-6 rounded-2xl relative overflow-hidden backdrop-blur-md"
                            animate={{
                                borderColor: theme.border,
                                boxShadow: `0 0 40px ${theme.accentGlow}`,
                                backgroundColor: 'var(--theme-card-bg)',
                                borderWidth: '1px',
                                borderStyle: 'solid'
                            }}
                            transition={{ duration: 1.5, ease: 'easeInOut' }}
                        >
                            {/* Inner GLow */}
                            <motion.div
                                className="absolute inset-0 pointer-events-none"
                                animate={{ background: `radial-gradient(ellipse at top right, ${theme.accentGlow}, transparent 60%)` }}
                                transition={{ duration: 1.5, ease: 'easeInOut' }}
                            />

                            <div className="relative z-10 flex flex-col items-start gap-4">
                                <motion.div
                                    className="sentiment-badge uppercase tracking-wider text-xs"
                                    animate={{ background: theme.badge.bg, borderColor: theme.badge.border, color: theme.badge.text }}
                                    transition={{ duration: 1 }}
                                >
                                    <motion.div className="sentiment-dot" animate={{ background: theme.accent }} transition={{ duration: 1 }} />
                                    {result.sentiment || 'Analyzed'}
                                </motion.div>

                                <h3 className="text-lg font-medium" style={{ color: 'var(--theme-text)' }}>
                                    AI Analysis
                                </h3>
                            </div>
                        </motion.div>

                        {/* Insight Sections */}
                        <AnalysisSection
                            icon={Sparkles}
                            title="Suggestions"
                            content={result.suggestions}
                            accent={theme.accent}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                            <AnalysisSection
                                icon={Wind}
                                title="Pacing"
                                content={result.pacing}
                                accent={theme.accent}
                            />
                            <AnalysisSection
                                icon={BookOpen}
                                title="Word Choice"
                                content={result.wordChoice}
                                accent={theme.accent}
                            />
                        </div>

                        <AnalysisSection
                            icon={MessageSquare}
                            title="Emotional Tone"
                            content={result.tone}
                            accent={theme.accent}
                        />

                    </motion.div>
                )}

                {/* Empty State */}
                {!loading && !result && (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-12 text-center opacity-60"
                    >
                        <Sparkles size={32} className="mb-4 text-gray-400" />
                        <p style={{ color: 'var(--theme-text)' }}>Write your poem, then ask VerseVibe to analyze it.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

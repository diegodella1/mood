'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

type SectionId = 'intro' | 'mission' | 'mechanics' | 'social' | 'rewards' | 'competition' | 'philosophy' | 'expectations' | 'faq';

const sections: { id: SectionId; title: string; icon: string }[] = [
  { id: 'intro', title: 'What is it?', icon: '🌍' },
  { id: 'mission', title: 'Mission', icon: '🎯' },
  { id: 'mechanics', title: 'Mechanics', icon: '🕹️' },
  { id: 'social', title: 'Social', icon: '👥' },
  { id: 'rewards', title: 'Rewards', icon: '🎁' },
  { id: 'competition', title: 'Competition', icon: '🏆' },
  { id: 'philosophy', title: 'Philosophy', icon: '🧠' },
  { id: 'expectations', title: 'Players', icon: '🎮' },
  { id: 'faq', title: 'FAQ', icon: '❓' },
];

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<SectionId>('intro');

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSmooth}
        className="sticky top-0 z-50 px-4 py-4 bg-[var(--color-space)]/80 backdrop-blur-lg border-b border-[var(--surface-border)]"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back</span>
          </Link>
          <h1 className="font-display text-xl font-bold text-gradient-aurora">
            Game Guide
          </h1>
          <div className="w-16" />
        </div>
      </motion.header>

      {/* Mobile Navigation - Outside flex container */}
      <div className="md:hidden sticky top-[72px] z-40 bg-[var(--color-space)]/90 backdrop-blur-lg border-b border-[var(--surface-border)] overflow-x-auto">
        <div className="flex p-2 gap-1 max-w-4xl mx-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                activeSection === section.id
                  ? 'bg-[var(--color-aurora-cyan)]/20 text-[var(--color-aurora-cyan)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex max-w-4xl mx-auto w-full">
        {/* Sidebar Navigation - Desktop only */}
        <nav className="hidden md:flex flex-col w-48 shrink-0 p-4 border-r border-[var(--surface-border)] sticky top-20 h-fit">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                activeSection === section.id
                  ? 'bg-[var(--color-aurora-cyan)]/20 text-[var(--color-aurora-cyan)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--surface-glass-light)]'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={springSmooth}
            >
              {activeSection === 'intro' && <IntroSection />}
              {activeSection === 'mission' && <MissionSection />}
              {activeSection === 'mechanics' && <MechanicsSection />}
              {activeSection === 'social' && <SocialSection />}
              {activeSection === 'rewards' && <RewardsSection />}
              {activeSection === 'competition' && <CompetitionSection />}
              {activeSection === 'philosophy' && <PhilosophySection />}
              {activeSection === 'expectations' && <ExpectationsSection />}
              {activeSection === 'faq' && <FAQSection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

// Section Components
function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h2 className="flex items-center gap-3 text-2xl md:text-3xl font-display font-bold text-[var(--color-text-primary)] mb-6">
      <span className="text-3xl">{icon}</span>
      {title}
    </h2>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card-subtle p-4 md:p-6 rounded-xl ${className}`}>
      {children}
    </div>
  );
}

function IntroSection() {
  return (
    <div className="space-y-6">
      <SectionTitle icon="🌍" title="What is Global Pulse?" />

      <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
        <span className="text-[var(--color-text-primary)] font-semibold">Global Pulse</span> is a minimalist social experience that connects people around the world through their emotions.
      </p>

      <Card>
        <p className="text-[var(--color-text-primary)] text-center text-xl">
          With a single tap, share how you feel and see how the rest of the planet feels.
        </p>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '🚫', text: 'No long texts' },
          { icon: '📷', text: 'No photos' },
          { icon: '❤️', text: 'No likes' },
          { icon: '✨', text: 'Just emojis' },
        ].map((item) => (
          <div key={item.text} className="glass-card-subtle p-4 text-center rounded-xl">
            <span className="text-2xl block mb-2">{item.icon}</span>
            <span className="text-sm text-[var(--color-text-secondary)]">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MissionSection() {
  return (
    <div className="space-y-6">
      <SectionTitle icon="🎯" title="Mission & Vision" />

      <Card className="border-l-4 border-[var(--color-aurora-cyan)]">
        <h3 className="text-sm uppercase tracking-wider text-[var(--color-aurora-cyan)] mb-2">Mission</h3>
        <p className="text-xl text-[var(--color-text-primary)] font-medium">
          Create the emotional thermometer of the world.
        </p>
      </Card>

      <p className="text-[var(--color-text-secondary)] leading-relaxed">
        We want every person, no matter where they are, to express how they feel and see that they&apos;re not alone. When someone in Buenos Aires feels happy, they can see someone in Tokyo feels the same.
      </p>

      <Card className="border-l-4 border-[var(--color-aurora-violet)]">
        <h3 className="text-sm uppercase tracking-wider text-[var(--color-aurora-violet)] mb-2">Vision</h3>
        <p className="text-xl text-[var(--color-text-primary)] font-medium">
          A more emotionally connected world, where empathy transcends borders.
        </p>
      </Card>

      <p className="text-[var(--color-text-secondary)] leading-relaxed">
        In 5 years, we want &quot;pulsing&quot; to be as natural as checking the weather. We want Global Pulse to be a metric that media and governments consult to understand humanity&apos;s emotional state.
      </p>
    </div>
  );
}

function MechanicsSection() {
  return (
    <div className="space-y-8">
      <SectionTitle icon="🕹️" title="Game Mechanics" />

      {/* Windows */}
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Time Windows</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">
          Each day has <span className="text-[var(--color-aurora-cyan)] font-semibold">3 pulse windows</span>:
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '🌅', name: 'Morning', time: '6:00 - 12:00' },
            { icon: '☀️', name: 'Afternoon', time: '12:00 - 18:00' },
            { icon: '🌙', name: 'Night', time: '18:00 - 24:00' },
          ].map((window) => (
            <Card key={window.name} className="text-center">
              <span className="text-3xl block mb-2">{window.icon}</span>
              <p className="font-semibold text-[var(--color-text-primary)]">{window.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{window.time}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Streaks */}
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">The Streak System 🔥</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">
          Your <span className="text-[var(--color-aurora-amber)] font-semibold">streak</span> is the number of consecutive days you&apos;ve pulsed.
        </p>
        <Card>
          <ul className="space-y-2 text-[var(--color-text-secondary)]">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Pulse at least once in a day → streak continues
            </li>
            <li className="flex items-center gap-2">
              <span className="text-red-400">✗</span>
              Miss a day → streak resets to 0
            </li>
            <li className="flex items-center gap-2">
              <span>🛡️</span>
              Shields protect your streak if you forget
            </li>
          </ul>
        </Card>
      </div>

      {/* Auras */}
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Auras ✨</h3>
        <div className="space-y-3">
          {[
            { days: '7+', icon: '🔥', name: 'Fire', desc: 'Bright orange border', color: 'orange' },
            { days: '30+', icon: '⚡', name: 'Lightning', desc: 'Electric yellow border', color: 'yellow' },
            { days: '100+', icon: '💎', name: 'Diamond', desc: 'PERMANENT - Blue border', color: 'cyan' },
          ].map((aura) => (
            <Card key={aura.name} className={`border-l-4 ${
              aura.color === 'orange' ? 'border-orange-400' :
              aura.color === 'yellow' ? 'border-yellow-400' :
              'border-cyan-400'
            }`}>
              <div className="flex items-center gap-4">
                <span className="text-4xl">{aura.icon}</span>
                <div>
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    {aura.days} days - {aura.name}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">{aura.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Shields */}
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Shields 🛡️</h3>
        <Card>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Protect your streak when you forget to pulse.
          </p>
          <p className="text-sm text-[var(--color-text-primary)] font-medium mb-2">How to get them:</p>
          <ul className="space-y-1 text-sm text-[var(--color-text-secondary)]">
            <li>• +1 when you invite a friend who joins</li>
            <li>• +1 from lucky drops (5% chance)</li>
            <li>• +1-3 from secret achievements</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function SocialSection() {
  return (
    <div className="space-y-6">
      <SectionTitle icon="👥" title="Social System" />

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Follow Friends</h3>
        <Card>
          <ul className="space-y-2 text-[var(--color-text-secondary)]">
            <li className="flex items-center gap-2">
              <span>👀</span> See their activity in your feed
            </li>
            <li className="flex items-center gap-2">
              <span>🤝</span> Create shared streaks with mutual friends
            </li>
            <li className="flex items-center gap-2">
              <span>🔔</span> Get notified when they pulse
            </li>
          </ul>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Friend Streaks 🤝</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">
          When you and a friend follow each other, you create a <span className="text-[var(--color-aurora-violet)] font-semibold">friend streak</span>:
        </p>
        <Card className="bg-gradient-to-r from-[var(--color-aurora-cyan)]/10 to-[var(--color-aurora-violet)]/10">
          <ul className="space-y-2 text-[var(--color-text-secondary)]">
            <li>• Both must pulse the same day for the streak to increase</li>
            <li>• If one fails, the shared streak breaks</li>
            <li>• It&apos;s like Snapchat but with emotions!</li>
          </ul>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Friends Feed</h3>
        <Card>
          <p className="text-[var(--color-text-secondary)] mb-3">See activity from people you follow:</p>
          <div className="space-y-2 text-sm">
            <div className="p-2 bg-[var(--surface-glass)] rounded-lg">
              &quot;Maria shared her vibe 😊&quot;
            </div>
            <div className="p-2 bg-[var(--surface-glass)] rounded-lg">
              &quot;Juan reached 30 days streak&quot;
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-3">
            No chats, no comments. Just silent presence.
          </p>
        </Card>
      </div>
    </div>
  );
}

function RewardsSection() {
  return (
    <div className="space-y-6">
      <SectionTitle icon="🎁" title="Rewards System" />

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Lucky Drops</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">
          Every time you pulse, you have a <span className="text-[var(--color-aurora-amber)] font-semibold">5% chance</span> of receiving a lucky drop:
        </p>
        <div className="space-y-3">
          {[
            { icon: '🛡️', name: 'Shield', prob: '60%', desc: '+1 shield' },
            { icon: '✨', name: 'Special Emoji', prob: '25%', desc: 'Exclusive emoji' },
            { icon: '⚡', name: 'XP Boost', prob: '15%', desc: '2x XP for 24h' },
          ].map((drop) => (
            <Card key={drop.name} className="flex items-center gap-4">
              <span className="text-3xl">{drop.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-[var(--color-text-primary)]">{drop.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{drop.desc}</p>
              </div>
              <span className="text-sm text-[var(--color-aurora-cyan)]">{drop.prob}</span>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Secret Achievements 🔓</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">
          There are <span className="text-[var(--color-aurora-violet)] font-semibold">12 hidden achievements</span> that only reveal when you earn them.
        </p>
        <Card className="bg-gradient-to-br from-purple-500/10 to-amber-500/10">
          <p className="text-sm text-[var(--color-text-muted)] mb-3">Some hints:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: '🦉', hint: 'The city sleeps...' },
              { icon: '🌠', hint: 'Wishes come true...' },
              { icon: '🏃', hint: 'Be the first...' },
              { icon: '👑', hint: 'People notice you...' },
            ].map((ach) => (
              <div key={ach.hint} className="flex items-center gap-2 p-2 bg-[var(--surface-glass)] rounded-lg">
                <span>{ach.icon}</span>
                <span className="text-[var(--color-text-secondary)] italic">&quot;{ach.hint}&quot;</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function CompetitionSection() {
  return (
    <div className="space-y-6">
      <SectionTitle icon="🏆" title="Competition" />

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Leaderboards</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <h4 className="font-semibold text-[var(--color-aurora-amber)] mb-2">🔥 Top Global Streaks</h4>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Users with the longest streaks in the world
            </p>
          </Card>
          <Card>
            <h4 className="font-semibold text-[var(--color-aurora-cyan)] mb-2">🏙️ Cities</h4>
            <p className="text-sm text-[var(--color-text-secondary)]">
              The most active cities on the planet
            </p>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Your City</h3>
        <Card>
          <p className="text-[var(--color-text-secondary)]">
            When you select your city:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
            <li>• See what % of your city feels the same as you</li>
            <li>• Compete in the city rankings</li>
            <li>• Appear on the local leaderboard</li>
          </ul>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Virality</h3>
        <Card className="border border-[var(--color-aurora-teal)]/30">
          <h4 className="font-semibold text-[var(--color-aurora-teal)] mb-2">Referral Code</h4>
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            Each user has a unique code. When someone joins with your code:
          </p>
          <div className="flex gap-4 text-center">
            <div className="flex-1 p-2 bg-[var(--surface-glass)] rounded-lg">
              <p className="text-lg font-bold text-[var(--color-aurora-cyan)]">+1 🛡️</p>
              <p className="text-xs text-[var(--color-text-muted)]">For you</p>
            </div>
            <div className="flex-1 p-2 bg-[var(--surface-glass)] rounded-lg">
              <p className="text-lg font-bold text-[var(--color-aurora-cyan)]">+1 🛡️</p>
              <p className="text-xs text-[var(--color-text-muted)]">For your friend</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PhilosophySection() {
  return (
    <div className="space-y-6">
      <SectionTitle icon="🧠" title="Design Philosophy" />

      <div className="grid md:grid-cols-2 gap-4">
        {[
          {
            title: 'Less is More',
            items: ['One tap to participate', '3 windows, not infinite', 'No text, no likes'],
          },
          {
            title: 'Infinite Game',
            items: ['No end or winner', 'Continuous practice', 'Emotional self-awareness'],
          },
          {
            title: 'Anti-Addiction',
            items: ['Windows force pauses', 'No infinite scroll', 'Positive motivation'],
          },
          {
            title: 'Silent Community',
            items: ['No comments or DMs', 'Connection through presence', 'Empathy without words'],
          },
        ].map((block) => (
          <Card key={block.title}>
            <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">{block.title}</h4>
            <ul className="space-y-1 text-sm text-[var(--color-text-secondary)]">
              {block.items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ExpectationsSection() {
  return (
    <div className="space-y-6">
      <SectionTitle icon="🎮" title="What We Expect from Players" />

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">The Ideal Player</h3>
        <div className="space-y-3">
          {[
            { num: 1, text: 'Comes once a day - we don\'t need 50 visits, just 1 sincere one' },
            { num: 2, text: 'Is honest - selects the emoji they truly feel' },
            { num: 3, text: 'Invites friends - because they want to share, not for rewards' },
            { num: 4, text: 'Maintains their streak - as a commitment to themselves' },
            { num: 5, text: 'Celebrates others - sees others\' achievements with joy' },
          ].map((item) => (
            <Card key={item.num} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--color-aurora-cyan)]/20 text-[var(--color-aurora-cyan)] flex items-center justify-center text-sm font-bold shrink-0">
                {item.num}
              </span>
              <p className="text-[var(--color-text-secondary)]">{item.text}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border border-[var(--color-aurora-violet)]/30 bg-[var(--color-aurora-violet)]/5">
        <h4 className="font-semibold text-[var(--color-aurora-violet)] mb-3">The Pact</h4>
        <p className="text-[var(--color-text-secondary)] italic">
          &quot;I promise to pulse with honesty, maintain my streak with intention, and celebrate that millions of people around the world are feeling alongside me.&quot;
        </p>
      </Card>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: 'Why emojis and not text?',
      a: 'Emojis are universal. A 😊 means happiness in any language.',
    },
    {
      q: 'Why only 3 windows?',
      a: 'To create habit without addiction. We want you to value each pulse.',
    },
    {
      q: 'Can I recover my streak if I lose my phone?',
      a: 'Yes, with the email recovery system in your profile.',
    },
    {
      q: 'Is the data real?',
      a: '100% real. Every point is a real person pulsing.',
    },
    {
      q: 'Can I use the app without friends?',
      a: 'Absolutely. The social experience is optional.',
    },
    {
      q: 'When do the windows open?',
      a: 'Based on your local timezone. 6AM-12PM, 12PM-6PM, 6PM-12AM.',
    },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle icon="❓" title="Frequently Asked Questions" />

      <div className="space-y-4">
        {faqs.map((faq) => (
          <Card key={faq.q}>
            <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">{faq.q}</h4>
            <p className="text-[var(--color-text-secondary)]">{faq.a}</p>
          </Card>
        ))}
      </div>

      <Card className="text-center bg-gradient-to-r from-[var(--color-aurora-cyan)]/10 to-[var(--color-aurora-violet)]/10">
        <p className="text-xl mb-2">🌍💫</p>
        <p className="text-[var(--color-text-primary)] font-medium">
          Welcome to the global pulse.
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Together we create the emotional thermometer of the world.
        </p>
      </Card>
    </div>
  );
}

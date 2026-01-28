'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

type SectionId = 'intro' | 'mission' | 'mechanics' | 'social' | 'rewards' | 'competition' | 'philosophy' | 'expectations' | 'faq';

const sections: { id: SectionId; title: string; icon: string }[] = [
  { id: 'intro', title: '¿Qué es?', icon: '🌍' },
  { id: 'mission', title: 'Misión', icon: '🎯' },
  { id: 'mechanics', title: 'Mecánicas', icon: '🕹️' },
  { id: 'social', title: 'Social', icon: '👥' },
  { id: 'rewards', title: 'Recompensas', icon: '🎁' },
  { id: 'competition', title: 'Competencia', icon: '🏆' },
  { id: 'philosophy', title: 'Filosofía', icon: '🧠' },
  { id: 'expectations', title: 'Jugadores', icon: '🎮' },
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
            <span className="text-sm">Volver</span>
          </Link>
          <h1 className="font-display text-xl font-bold text-gradient-aurora">
            Guía del Juego
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
      <SectionTitle icon="🌍" title="¿Qué es Global Pulse?" />

      <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
        <span className="text-[var(--color-text-primary)] font-semibold">Global Pulse</span> es una experiencia social minimalista que conecta a personas de todo el mundo a través de sus emociones.
      </p>

      <Card>
        <p className="text-[var(--color-text-primary)] text-center text-xl">
          Con un solo tap, compartís cómo te sentís y ves cómo se siente el resto del planeta.
        </p>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '🚫', text: 'Sin textos largos' },
          { icon: '📷', text: 'Sin fotos' },
          { icon: '❤️', text: 'Sin likes' },
          { icon: '✨', text: 'Solo emojis' },
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
      <SectionTitle icon="🎯" title="Misión y Visión" />

      <Card className="border-l-4 border-[var(--color-aurora-cyan)]">
        <h3 className="text-sm uppercase tracking-wider text-[var(--color-aurora-cyan)] mb-2">Misión</h3>
        <p className="text-xl text-[var(--color-text-primary)] font-medium">
          Crear el termómetro emocional del mundo.
        </p>
      </Card>

      <p className="text-[var(--color-text-secondary)] leading-relaxed">
        Queremos que cada persona, sin importar dónde esté, pueda expresar cómo se siente y ver que no está sola. Que cuando alguien en Buenos Aires se siente feliz, pueda ver que alguien en Tokio siente lo mismo.
      </p>

      <Card className="border-l-4 border-[var(--color-aurora-violet)]">
        <h3 className="text-sm uppercase tracking-wider text-[var(--color-aurora-violet)] mb-2">Visión</h3>
        <p className="text-xl text-[var(--color-text-primary)] font-medium">
          Un mundo más conectado emocionalmente, donde la empatía trasciende fronteras.
        </p>
      </Card>

      <p className="text-[var(--color-text-secondary)] leading-relaxed">
        En 5 años, queremos que &quot;pulsear&quot; sea tan natural como revisar el clima. Que el Pulse Global sea una métrica que medios y gobiernos consulten para entender el estado emocional de la humanidad.
      </p>
    </div>
  );
}

function MechanicsSection() {
  return (
    <div className="space-y-8">
      <SectionTitle icon="🕹️" title="Mecánicas del Juego" />

      {/* Windows */}
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Las Ventanas de Tiempo</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">
          Cada día tiene <span className="text-[var(--color-aurora-cyan)] font-semibold">3 ventanas de pulse</span>:
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '🌅', name: 'Mañana', time: '6:00 - 12:00' },
            { icon: '☀️', name: 'Tarde', time: '12:00 - 18:00' },
            { icon: '🌙', name: 'Noche', time: '18:00 - 24:00' },
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
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">El Sistema de Streaks 🔥</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">
          Tu <span className="text-[var(--color-aurora-amber)] font-semibold">streak</span> es la cantidad de días consecutivos que pulseaste.
        </p>
        <Card>
          <ul className="space-y-2 text-[var(--color-text-secondary)]">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Pulseás al menos 1 vez en un día → streak continúa
            </li>
            <li className="flex items-center gap-2">
              <span className="text-red-400">✗</span>
              No pulseás ningún día → streak vuelve a 0
            </li>
            <li className="flex items-center gap-2">
              <span>🛡️</span>
              Los escudos protegen tu streak si te olvidás
            </li>
          </ul>
        </Card>
      </div>

      {/* Auras */}
      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Las Auras ✨</h3>
        <div className="space-y-3">
          {[
            { days: '7+', icon: '🔥', name: 'Fuego', desc: 'Borde naranja brillante', color: 'orange' },
            { days: '30+', icon: '⚡', name: 'Rayo', desc: 'Borde amarillo eléctrico', color: 'yellow' },
            { days: '100+', icon: '💎', name: 'Diamante', desc: 'PERMANENTE - Borde azul', color: 'cyan' },
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
                    {aura.days} días - {aura.name}
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
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Los Escudos 🛡️</h3>
        <Card>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Protegen tu streak cuando te olvidás de pulsear.
          </p>
          <p className="text-sm text-[var(--color-text-primary)] font-medium mb-2">Cómo conseguir:</p>
          <ul className="space-y-1 text-sm text-[var(--color-text-secondary)]">
            <li>• +1 al invitar un amigo que se une</li>
            <li>• +1 en lucky drops (5% chance)</li>
            <li>• +1-3 en achievements secretos</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function SocialSection() {
  return (
    <div className="space-y-6">
      <SectionTitle icon="👥" title="Sistema Social" />

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Seguir Amigos</h3>
        <Card>
          <ul className="space-y-2 text-[var(--color-text-secondary)]">
            <li className="flex items-center gap-2">
              <span>👀</span> Ver su actividad en tu feed
            </li>
            <li className="flex items-center gap-2">
              <span>🤝</span> Crear streaks compartidos con amigos mutuales
            </li>
            <li className="flex items-center gap-2">
              <span>🔔</span> Recibir notificaciones cuando pulsean
            </li>
          </ul>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Streaks con Amigos 🤝</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">
          Cuando vos y un amigo se siguen mutuamente, se crea un <span className="text-[var(--color-aurora-violet)] font-semibold">friend streak</span>:
        </p>
        <Card className="bg-gradient-to-r from-[var(--color-aurora-cyan)]/10 to-[var(--color-aurora-violet)]/10">
          <ul className="space-y-2 text-[var(--color-text-secondary)]">
            <li>• Ambos deben pulsear el mismo día para que el streak suba</li>
            <li>• Si uno falla, el streak compartido se rompe</li>
            <li>• ¡Es como Snapchat pero con emociones!</li>
          </ul>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Feed de Amigos</h3>
        <Card>
          <p className="text-[var(--color-text-secondary)] mb-3">Ves la actividad de quienes seguís:</p>
          <div className="space-y-2 text-sm">
            <div className="p-2 bg-[var(--surface-glass)] rounded-lg">
              &quot;María compartió su vibe 😊&quot;
            </div>
            <div className="p-2 bg-[var(--surface-glass)] rounded-lg">
              &quot;Juan alcanzó 30 días de streak&quot;
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-3">
            Sin chats, sin comentarios. Solo presencia silenciosa.
          </p>
        </Card>
      </div>
    </div>
  );
}

function RewardsSection() {
  return (
    <div className="space-y-6">
      <SectionTitle icon="🎁" title="Sistema de Recompensas" />

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Lucky Drops</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">
          Cada vez que pulseás, tenés <span className="text-[var(--color-aurora-amber)] font-semibold">5% de probabilidad</span> de recibir un lucky drop:
        </p>
        <div className="space-y-3">
          {[
            { icon: '🛡️', name: 'Escudo', prob: '60%', desc: '+1 shield' },
            { icon: '✨', name: 'Emoji Especial', prob: '25%', desc: 'Emoji exclusivo' },
            { icon: '⚡', name: 'XP Boost', prob: '15%', desc: '2x XP por 24h' },
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
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Achievements Secretos 🔓</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">
          Hay <span className="text-[var(--color-aurora-violet)] font-semibold">12 achievements ocultos</span> que solo se revelan cuando los ganás.
        </p>
        <Card className="bg-gradient-to-br from-purple-500/10 to-amber-500/10">
          <p className="text-sm text-[var(--color-text-muted)] mb-3">Algunos hints:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: '🦉', hint: 'La ciudad duerme...' },
              { icon: '🌠', hint: 'Los deseos se cumplen...' },
              { icon: '🏃', hint: 'Sé el primero...' },
              { icon: '👑', hint: 'La gente te nota...' },
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
      <SectionTitle icon="🏆" title="Competencia" />

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Leaderboards</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <h4 className="font-semibold text-[var(--color-aurora-amber)] mb-2">🔥 Top Streaks Global</h4>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Los usuarios con mayor streak del mundo
            </p>
          </Card>
          <Card>
            <h4 className="font-semibold text-[var(--color-aurora-cyan)] mb-2">🏙️ Ciudades</h4>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Las ciudades más activas del planeta
            </p>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Tu Ciudad</h3>
        <Card>
          <p className="text-[var(--color-text-secondary)]">
            Cuando seleccionás tu ciudad:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
            <li>• Ves qué % de tu ciudad siente lo mismo que vos</li>
            <li>• Competís en el ranking de ciudades</li>
            <li>• Aparecés en el leaderboard local</li>
          </ul>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">Viralidad</h3>
        <Card className="border border-[var(--color-aurora-teal)]/30">
          <h4 className="font-semibold text-[var(--color-aurora-teal)] mb-2">Código de Referido</h4>
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            Cada usuario tiene un código único. Cuando alguien se une con tu código:
          </p>
          <div className="flex gap-4 text-center">
            <div className="flex-1 p-2 bg-[var(--surface-glass)] rounded-lg">
              <p className="text-lg font-bold text-[var(--color-aurora-cyan)]">+1 🛡️</p>
              <p className="text-xs text-[var(--color-text-muted)]">Para vos</p>
            </div>
            <div className="flex-1 p-2 bg-[var(--surface-glass)] rounded-lg">
              <p className="text-lg font-bold text-[var(--color-aurora-cyan)]">+1 🛡️</p>
              <p className="text-xs text-[var(--color-text-muted)]">Para tu amigo</p>
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
      <SectionTitle icon="🧠" title="Filosofía del Diseño" />

      <div className="grid md:grid-cols-2 gap-4">
        {[
          {
            title: 'Menos es Más',
            items: ['Un tap para participar', '3 ventanas, no infinito', 'Sin texto, sin likes'],
          },
          {
            title: 'Juego Infinito',
            items: ['No hay fin ni ganador', 'Es práctica continua', 'Autoconciencia emocional'],
          },
          {
            title: 'Anti-Adicción',
            items: ['Ventanas fuerzan pausas', 'Sin scroll infinito', 'Motivación positiva'],
          },
          {
            title: 'Comunidad Silenciosa',
            items: ['Sin comentarios ni DMs', 'Conexión por presencia', 'Empatía sin palabras'],
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
      <SectionTitle icon="🎮" title="Qué Esperamos de los Jugadores" />

      <div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">El Jugador Ideal</h3>
        <div className="space-y-3">
          {[
            { num: 1, text: 'Viene una vez al día - no necesitamos 50 visitas, 1 sincera' },
            { num: 2, text: 'Es honesto - selecciona el emoji que realmente siente' },
            { num: 3, text: 'Invita amigos - porque quiere compartir, no por rewards' },
            { num: 4, text: 'Mantiene su streak - como compromiso consigo mismo' },
            { num: 5, text: 'Celebra a otros - ve logros ajenos con alegría' },
          ].map((item) => (
            <Card key={item.num} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--color-aurora-cyan)]/20 text-[var(--color-aurora-cyan)] flex items-center justify-center text-sm font-bold">
                {item.num}
              </span>
              <p className="text-[var(--color-text-secondary)]">{item.text}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border border-[var(--color-aurora-violet)]/30 bg-[var(--color-aurora-violet)]/5">
        <h4 className="font-semibold text-[var(--color-aurora-violet)] mb-3">El Pacto</h4>
        <p className="text-[var(--color-text-secondary)] italic">
          &quot;Prometo pulsear con honestidad, mantener mi streak con intención, y celebrar que millones de personas en el mundo están sintiendo junto a mí.&quot;
        </p>
      </Card>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: '¿Por qué emojis y no texto?',
      a: 'Los emojis son universales. Un 😊 significa felicidad en cualquier idioma.',
    },
    {
      q: '¿Por qué solo 3 ventanas?',
      a: 'Para crear hábito sin adicción. Queremos que valores cada pulse.',
    },
    {
      q: '¿Puedo recuperar mi streak si pierdo el teléfono?',
      a: 'Sí, con el sistema de recovery por email en tu perfil.',
    },
    {
      q: '¿Los datos son reales?',
      a: '100% reales. Cada punto es una persona real pulseando.',
    },
    {
      q: '¿Puedo usar la app sin amigos?',
      a: 'Absolutamente. La experiencia social es opcional.',
    },
    {
      q: '¿Cuándo abren las ventanas?',
      a: 'Según tu timezone local. 6AM-12PM, 12PM-6PM, 6PM-12AM.',
    },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle icon="❓" title="Preguntas Frecuentes" />

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
          Bienvenido al pulso global.
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Juntos creamos el termómetro emocional del mundo.
        </p>
      </Card>
    </div>
  );
}

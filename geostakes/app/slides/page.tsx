"use client";

// Each post is a complete slideshow with multiple slides
const POSTS = [
  {
    id: 1,
    title: "$847 playing Geoguessr for money",
    slides: [
      {
        text: "$847 this week",
        subtext: "Playing Geoguessr for money",
      },
      {
        text: "Skill-based wagering",
        subtext: "Better player wins",
      },
      {
        text: "You vs opponent",
        subtext: "5 locations each\nCloser guess = cash",
      },
      {
        text: "Not luck",
        subtext: "Pure skill",
      },
      {
        text: "1-2 hours after work",
        subtext: "$847 this week",
      },
      {
        text: "If you're already good",
        subtext: "You can make money",
      },
      {
        text: "geostakes",
        subtext: 'Comment "START"',
        isCTA: true,
      },
    ],
  },
  {
    id: 2,
    title: "Geoguessr wagering made me $500",
    slides: [
      {
        text: "Made $500 in 3 weeks",
        subtext: "Geoguessr skill-based wagering",
      },
      {
        text: "Same game you know",
        subtext: "But you wager on your skill",
      },
      {
        text: "Better at geography?",
        subtext: "Win money",
      },
      {
        text: "Match someone",
        subtext: "Stake $5, $10, $50, $100",
      },
      {
        text: "Play 5 locations",
        subtext: "Closer total distance wins pot",
      },
      {
        text: "Skill-based",
        subtext: "Not gambling, competition",
      },
      {
        text: "geostakes",
        subtext: 'Comment "GUIDE"',
        isCTA: true,
      },
    ],
  },
  {
    id: 3,
    title: "Turned Geoguessr into income",
    slides: [
      {
        text: "Turned Geoguessr skills",
        subtext: "Into $300/month",
      },
      {
        text: "Skill-based wagering",
        subtext: "Your knowledge = cash",
      },
      {
        text: "RECOGNIZE THESE 3 PATTERNS",
        subtext: "",
      },
      {
        text: "1. Road markings",
        subtext: "White vs yellow lines",
      },
      {
        text: "2. Bollards",
        subtext: "Every country different",
      },
      {
        text: "3. Landscape",
        subtext: "Flat vs mountains",
      },
      {
        text: "Use these to win money",
        subtext: "Skill-based, not luck",
      },
      {
        text: "geostakes",
        subtext: 'Comment "PATTERNS"',
        isCTA: true,
      },
    ],
  },
  {
    id: 4,
    title: "Geoguessr rank = money",
    slides: [
      {
        text: "Your Geoguessr rank",
        subtext: "Is worth real money",
      },
      {
        text: "Skill-based wagering",
        subtext: "Better player wins cash",
      },
      {
        text: "Gold rank or higher?",
        subtext: "You can profit from this",
      },
      {
        text: "Wager against opponents",
        subtext: "$5 to $100 matches",
      },
      {
        text: "Same skills",
        subtext: "Different outcome",
      },
      {
        text: "It's competition",
        subtext: "Not gambling",
      },
      {
        text: "geostakes",
        subtext: "Stop playing for free",
        isCTA: true,
      },
    ],
  },
  {
    id: 5,
    title: "Geoguessr wagering in Brazil",
    slides: [
      {
        text: "Geoguessr skill wagering",
        subtext: "Works in Brazil",
      },
      {
        text: "PIX deposits",
        subtext: "PIX withdrawals",
      },
      {
        text: "Compete for money",
        subtext: "Better player wins",
      },
      {
        text: "R$5 to R$500 matches",
        subtext: "You choose stakes",
      },
      {
        text: "Made R$1,200 this month",
        subtext: "Playing after work",
      },
      {
        text: "Skill-based",
        subtext: "Not luck",
      },
      {
        text: "geostakes",
        subtext: "Funciona no Brasil",
        isCTA: true,
      },
    ],
  },
  {
    id: 6,
    title: "$20 to $400 Geoguessr wagering",
    slides: [
      {
        text: "$20 → $400",
        subtext: "Geoguessr skill wagering",
      },
      {
        text: "Started with $20",
        subtext: "7 skill-based matches",
      },
      {
        text: "$20 → $40",
        subtext: "$40 → $80",
      },
      {
        text: "$80 → $160",
        subtext: "$160 → $320",
      },
      {
        text: "Lost one",
        subtext: "Won it back",
      },
      {
        text: "$320 → $400",
        subtext: "Same day",
      },
      {
        text: "Better skill = win",
        subtext: "Not luck",
      },
      {
        text: "geostakes",
        subtext: "Start with $5-10",
        isCTA: true,
      },
    ],
  },
  {
    id: 7,
    title: "Geoguessr wagering pays",
    slides: [
      {
        text: "$500 this month",
        subtext: "Geoguessr skill wagering",
      },
      {
        text: "Same game you play free",
        subtext: "But you wager on skill",
      },
      {
        text: "Match with someone",
        subtext: "Both stake money",
      },
      {
        text: "5 locations each",
        subtext: "Better total score wins pot",
      },
      {
        text: "Your skill = your edge",
        subtext: "Not random chance",
      },
      {
        text: "Competition",
        subtext: "Not gambling",
      },
      {
        text: "geostakes",
        subtext: "Turn skill into cash",
        isCTA: true,
      },
    ],
  },
  {
    id: 8,
    title: "Made $300 Geoguessr wagering",
    slides: [
      {
        text: "Made $300 this month",
        subtext: "Geoguessr skill wagering",
      },
      {
        text: "Don't need geography degree",
        subtext: "Just pattern recognition",
      },
      {
        text: "Skill-based matches",
        subtext: "Better player wins",
      },
      {
        text: "3 patterns to learn",
        subtext: "Roads, bollards, landscape",
      },
      {
        text: "That's 80% of wins",
        subtext: "Simple, not complex",
      },
      {
        text: "Use skill to win money",
        subtext: "Not luck",
      },
      {
        text: "geostakes",
        subtext: "Skill = profit",
        isCTA: true,
      },
    ],
  },
  {
    id: 9,
    title: "Geoguessr knowledge = money",
    slides: [
      {
        text: "Won $50 yesterday",
        subtext: "One Geoguessr skill match",
      },
      {
        text: "Knew Poland from Germany",
        subtext: "Worth real cash",
      },
      {
        text: "Skill-based wagering",
        subtext: "Knowledge = profit",
      },
      {
        text: "Poland: white bollards",
        subtext: "Germany: black bollards",
      },
      {
        text: "2 second check",
        subtext: "Won the match",
      },
      {
        text: "Better skill wins",
        subtext: "Every time",
      },
      {
        text: "geostakes",
        subtext: "Your knowledge pays",
        isCTA: true,
      },
    ],
  },
  {
    id: 10,
    title: "$480 from Geoguessr wagering",
    slides: [
      {
        text: "Part-time job: $340",
        subtext: "Geoguessr wagering: $480",
      },
      {
        text: "Same month",
        subtext: "Guess which is more fun",
      },
      {
        text: "Skill-based matches",
        subtext: "Better player wins",
      },
      {
        text: "It's a game",
        subtext: "That pays you",
      },
      {
        text: "Competition",
        subtext: "Not gambling",
      },
      {
        text: "Your skill = income",
        subtext: "Simple",
      },
      {
        text: "geostakes",
        subtext: "Turn skill into cash",
        isCTA: true,
      },
    ],
  },
  {
    id: 11,
    title: "Geoguessr apostas Brasil",
    slides: [
      {
        text: "R$1.200 esse mês",
        subtext: "Geoguessr apostas habilidade",
      },
      {
        text: "Você joga Geoguessr?",
        subtext: "Pode ganhar dinheiro",
      },
      {
        text: "Apostas baseadas em habilidade",
        subtext: "Melhor jogador ganha",
      },
      {
        text: "PIX entra",
        subtext: "PIX sai",
      },
      {
        text: "Joga partida",
        subtext: "Ganha dinheiro",
      },
      {
        text: "Habilidade = lucro",
        subtext: "Não é sorte",
      },
      {
        text: "geostakes",
        subtext: "Funciona no Brasil",
        isCTA: true,
      },
    ],
  },
  {
    id: 12,
    title: "$500/month Geoguessr wagering",
    slides: [
      {
        text: "2 years playing free",
        subtext: "Now $500/month wagering",
      },
      {
        text: "Same Geoguessr skills",
        subtext: "Different platform",
      },
      {
        text: "Skill-based matches",
        subtext: "Better player wins cash",
      },
      {
        text: "Month 1: $120",
        subtext: "Month 2: $340\nMonth 3: $500",
      },
      {
        text: "Getting better = more money",
        subtext: "Pure skill progression",
      },
      {
        text: "Competition",
        subtext: "Not gambling",
      },
      {
        text: "geostakes",
        subtext: "Stop playing for free",
        isCTA: true,
      },
    ],
  },
  {
    id: 13,
    title: "$400 Geoguessr skill wagering",
    slides: [
      {
        text: "Made $400 this month",
        subtext: "Geoguessr skill wagering",
      },
      {
        text: "Easier than ranked games",
        subtext: "Actually pays you",
      },
      {
        text: "You vs opponent",
        subtext: "Better skill wins",
      },
      {
        text: "5 locations",
        subtext: "Closer total distance = pot",
      },
      {
        text: "Simple concept",
        subtext: "Skill-based outcome",
      },
      {
        text: "Competition",
        subtext: "Not chance",
      },
      {
        text: "geostakes",
        subtext: "Skill = profit",
        isCTA: true,
      },
    ],
  },
  {
    id: 14,
    title: "$6,000 Geoguessr wagering",
    slides: [
      {
        text: "Made $6,000 this year",
        subtext: "Geoguessr skill wagering",
      },
      {
        text: "College debt: $50,000",
        subtext: "Geoguessr skills: paid me $6K",
      },
      {
        text: "Skill-based matches",
        subtext: "Better player wins",
      },
      {
        text: "No degree needed",
        subtext: "Just pattern recognition",
      },
      {
        text: "Your skill = your income",
        subtext: "Not luck, not chance",
      },
      {
        text: "Competition",
        subtext: "Pure skill",
      },
      {
        text: "geostakes",
        subtext: "Skills > Degrees",
        isCTA: true,
      },
    ],
  },
  {
    id: 15,
    title: "$2,000/month Geoguessr wagering",
    slides: [
      {
        text: "$2,000 this month",
        subtext: "Geoguessr skill wagering",
      },
      {
        text: 'They say "waste of time"',
        subtext: "I say $500/week",
      },
      {
        text: "Skill-based matches",
        subtext: "Better player wins cash",
      },
      {
        text: "Week 1: $380",
        subtext: "Week 2: $520\nWeek 3: $610\nWeek 4: $490",
      },
      {
        text: "Consistent income",
        subtext: "From Geoguessr skill",
      },
      {
        text: "Competition",
        subtext: "Not gambling",
      },
      {
        text: "geostakes",
        subtext: "Skill = income",
        isCTA: true,
      },
    ],
  },
];

function GridBackground() {
  return (
    <div className="hero-stage" aria-hidden="true">
      <div className="live-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="street-tile">
            <img
              className="scene"
              src={`/street-view/${String(i + 1).padStart(2, "0")}.jpg`}
              alt=""
              loading={i > 4 ? "lazy" : "eager"}
            />
            <div className="crosshair" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide({
  text,
  subtext,
  isCTA,
}: {
  text: string;
  subtext: string;
  isCTA?: boolean;
}) {
  return (
    <div className="landing-root" style={{ minHeight: "100vh" }}>
      <section
        className="hero hero-grid"
        style={{ minHeight: "100vh", position: "relative" }}
      >
        <GridBackground />
        <div className="hero-content">
          <div
            className="glass-card"
            style={{
              padding: "4rem 3rem",
              gap: "2rem",
              minWidth: "min(90vw, 600px)",
              textAlign: "center",
            }}
          >
            <h1
              className="hero-h1"
              style={{
                fontSize: isCTA ? "3rem" : "3.5rem",
                lineHeight: 1.2,
                marginBottom: "1rem",
                whiteSpace: "pre-line",
              }}
            >
              {text}
            </h1>
            <p
              style={{
                fontSize: isCTA ? "1.5rem" : "1.8rem",
                color: isCTA ? "#fff" : "#39ff14",
                fontWeight: 600,
                whiteSpace: "pre-line",
              }}
            >
              {subtext}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Slides() {
  // Change this to select which post to display (0-15)
  const POST_INDEX = 2;

  const currentPost = POSTS[POST_INDEX];

  return (
    <div style={{ position: 'relative' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          body > header,
          body > nav,
          body > div[class*="banner"],
          body > div[class*="Banner"],
          div.w-full.bg-primary {
            display: none !important;
          }
          body {
            overflow-x: hidden;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Hide Next.js dev overlay */
          #__next-build-watcher,
          [data-nextjs-toast-errors-parent],
          [data-nextjs-dialog-overlay],
          button[aria-label*="Open"],
          button[aria-label*="TypeScript"] {
            display: none !important;
          }
        `
      }} />
      {currentPost.slides.map((slide, index) => (
        <Slide
          key={index}
          text={slide.text}
          subtext={slide.subtext}
          isCTA={slide.isCTA}
        />
      ))}
    </div>
  );
}

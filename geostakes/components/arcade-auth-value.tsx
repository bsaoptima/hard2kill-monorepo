export function ArcadeAuthValue() {
  const avatars = [
    { i: 'ME', color: '#39ff6a', isPlus: false },
    { i: 'AT', color: '#ffc24d', isPlus: false },
    { i: 'JS', color: '#5ad1ff', isPlus: false },
    { i: '+', color: 'transparent', isPlus: true },
  ]

  return (
    <aside className="valside">
      <div className="vinner">
        {/* Bonus card */}
        <div className="bonuscard">
          <div className="bctag">🎁 Welcome bonus</div>
          <div className="bcbig">100% <b>match</b></div>
          <div className="bcsub">
            We double your first deposit — deposit $50, play with $100. No rake, no fees, no catch.
          </div>
        </div>

        {/* Features */}
        <div className="vfeat">
          <div className="vf">
            <span className="vk">⚡</span>
            <span>Payouts hit your balance <b>instantly</b></span>
          </div>
          <div className="vf">
            <span className="vk">🎯</span>
            <span>Locations <b>never repeat</b> — pure skill</span>
          </div>
          <div className="vf">
            <span className="vk">🔓</span>
            <span><b>No holds</b> on withdrawals, ever</span>
          </div>
        </div>

        {/* Social proof */}
        <div className="proof">
          <div className="avstack">
            {avatars.map((a, k) => (
              <span
                key={k}
                className={a.isPlus ? 'plusAvatar' : ''}
                style={{
                  background: a.color,
                  color: a.isPlus ? '#8b8c95' : '#06180d',
                }}
              >
                {a.i}
              </span>
            ))}
          </div>
          <div className="prooftxt">
            <b>145 players</b>
            <br />
            staking real money this week
          </div>
        </div>

        {/* Total payouts */}
        <div className="payoutsCard">
          <div className="payoutsLabel">Total payouts this week</div>
          <div className="payoutsAmount">$12,450</div>
        </div>
      </div>

      <style jsx>{`
        .valside {
          position: relative;
          border-left: 1px solid #26272e;
          background: #0b0c0f;
          padding: 52px 44px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
        }
        .vinner {
          position: relative;
          z-index: 1;
        }
        .bonuscard {
          background: linear-gradient(135deg, rgba(57, 255, 106, 0.12), rgba(255, 194, 77, 0.07));
          border: 1px solid color-mix(in srgb, #39ff6a 35%, #26272e);
          padding: 22px 24px;
        }
        .bctag {
          display: flex;
          align-items: center;
          gap: 9px;
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 800;
          font-size: 16px;
          text-transform: uppercase;
        }
        .bcbig {
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: clamp(40px, 5vw, 58px);
          line-height: 0.9;
          text-transform: uppercase;
          margin: 12px 0 6px;
        }
        .bcbig b {
          color: #39ff6a;
          text-shadow: 0 0 30px color-mix(in srgb, #39ff6a 50%, transparent);
        }
        .bcsub {
          font-size: 14px;
          color: #8b8c95;
          line-height: 1.5;
        }
        .vfeat {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin: 30px 0;
        }
        .vf {
          display: flex;
          align-items: center;
          gap: 13px;
          font-size: 15px;
          color: #d4d5da;
        }
        .vk {
          width: 30px;
          height: 30px;
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          background: #111114;
          border: 1px solid #26272e;
        }
        .vf b {
          color: #f4f5f2;
          font-weight: 600;
        }
        .proof {
          border-top: 1px solid #26272e;
          padding-top: 22px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .avstack {
          display: flex;
        }
        .avstack span {
          width: 34px;
          height: 34px;
          flex: none;
          border-radius: 50%;
          border: 2px solid #0a0b0c;
          margin-left: -10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: 13px;
        }
        .avstack span:first-child {
          margin-left: 0;
        }
        :global(.plusAvatar) {
          border: 2px solid #26272e !important;
          background: #191a1f !important;
        }
        .prooftxt {
          font-size: 13px;
          color: #8b8c95;
          line-height: 1.5;
        }
        .prooftxt b {
          color: #f4f5f2;
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: 16px;
        }
        .payoutsCard {
          margin-top: 18px;
          padding: 16px 20px;
          background: #111114;
          border: 1px solid #26272e;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .payoutsLabel {
          font-family: var(--font-space-mono), monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #e0e1e6;
        }
        .payoutsAmount {
          font-family: var(--font-saira-condensed), sans-serif;
          font-style: italic;
          font-weight: 900;
          font-size: 32px;
          color: #39ff6a;
          text-shadow: 0 0 20px rgba(57, 255, 106, 0.3);
        }
        @media (max-width: 820px) {
          .valside {
            display: none;
          }
        }
      `}</style>
    </aside>
  )
}

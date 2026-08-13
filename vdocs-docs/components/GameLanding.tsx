type GameLandingProps = {
  title: [string, string, string];
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  features: string[];
};

export function GameLanding({
  title,
  description,
  primaryLabel,
  secondaryLabel,
  features,
}: GameLandingProps) {
  return (
    <section className="game-landing" aria-label="VTV Live">
      <div className="game-landing__copy">
        <h1>
          {title[0]}
          <br />
          {title[1]}
          <br />
          <span>{title[2]}</span>
        </h1>
        <p>{description}</p>
        <div className="game-landing__actions">
          <a className="game-landing__primary" href="/sdkgame">
            {primaryLabel}
          </a>
          <a className="game-landing__secondary" href="/sdkgame">
            {secondaryLabel}
          </a>
        </div>
        <ul className="game-landing__features">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
      <div className="game-landing__art" aria-hidden="true">
        <img src="/icons/ic_start1.png" alt="" />
      </div>
    </section>
  );
}

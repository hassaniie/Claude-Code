import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  /** Small grey text rendered inline after the title, e.g. "(kWh / Unit Production)". */
  subtitle?: string;
  /** Right-aligned meta label, e.g. "(24h)" or "Monthly". */
  meta?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Shared card chrome.
 * Figma: Container (e.g. 3159:8644) — 1px #edeef0 border, 14px radius,
 * 16px padding, 20px gap between the head row and the body.
 */
export function Card({ title, subtitle, meta, className = '', children }: CardProps) {
  return (
    <section className={`card ${className}`.trim()}>
      <div className="card__head">
        <h2 className="card__title">
          {title}
          {subtitle ? <span className="card__subtitle"> {subtitle}</span> : null}
        </h2>
        {meta ? <span className="card__meta">{meta}</span> : null}
      </div>
      <div className="card__body">{children}</div>
    </section>
  );
}

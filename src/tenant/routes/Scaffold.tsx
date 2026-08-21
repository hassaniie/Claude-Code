/**
 * A section that is routed and navigable but whose deep build lands in a later
 * phase of the implementation sequence (§54). It is honest about that rather
 * than faking a dashboard — it names what the section will contain and links to
 * the parts already built, so navigation is never a dead end.
 */

import { Hammer, type LucideIcon } from 'lucide-react';
import { Page } from '../components/ui/page';
import { PageHeader } from '../components/common';
import { Card, CardBody } from '../components/ui/card';
import { IconBox } from '../components/ui/primitives';

export function Scaffold({ title, description, icon, points, phase }: { title: string; description: string; icon: LucideIcon; points: string[]; phase: string }) {
  return (
    <Page>
      <PageHeader title={title} description={description} />
      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-14 text-center">
          <IconBox icon={icon} tone="primary" size="lg" />
          <div>
            <p className="text-[15px] font-semibold text-foreground">{title}</p>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">{description}</p>
          </div>
          <ul className="mx-auto flex max-w-md flex-col gap-2 text-left">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-[12.5px] text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {p}
              </li>
            ))}
          </ul>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-inset px-3 py-1 text-[11px] font-medium text-subtle">
            <Hammer className="h-3 w-3" />
            {phase}
          </span>
        </CardBody>
      </Card>
    </Page>
  );
}

/** Factory so route files stay declarative. */
export const scaffold = (props: Parameters<typeof Scaffold>[0]) => () => <Scaffold {...props} />;

/**
 * Shared Service Center building blocks: the request detail drawer with its
 * timeline, comments, attachments and lifecycle actions (§27–29), used by both
 * the admin management workspace and the tenant portal. Admin advances the
 * ticket and assigns; the tenant confirms resolution, reopens and rates.
 */

import {
  CheckCheck, MessageSquarePlus, Paperclip, RotateCcw, Send, ThumbsUp,
} from 'lucide-react';
import { useState } from 'react';
import { Button, IconBox, Avatar } from '../components/ui/primitives';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '../components/ui/overlay';
import { DefList } from '../components/ui/data';
import { Textarea } from '../components/ui/form';
import { Timeline, RatingStars, type TimelineItem } from '../components/common';
import { PriorityBadge, ServiceStatusBadge, CATEGORY_ICON } from '../components/status';
import { SERVICE_STATUS } from '../lib/meta';
import { SERVICE_CATEGORY_LABEL } from '../data/catalog';
import { simulation } from '../data/live';
import { useSession } from '../store/session';
import { ago, fmtDateTime } from '../lib/utils';
import type { ServiceRequest, ServiceStatus } from '../data/types';

// Simple category labels for the drawer meta.
const catLabel = (c: string) => SERVICE_CATEGORY_LABEL[c] ?? c;

/** The sensible next transitions an admin can make from each state. */
const ADMIN_NEXT: Partial<Record<ServiceStatus, Array<{ to: ServiceStatus; label: string }>>> = {
  submitted: [{ to: 'acknowledged', label: 'Acknowledge' }],
  acknowledged: [{ to: 'assigned', label: 'Assign' }],
  assigned: [{ to: 'in_progress', label: 'Start work' }],
  in_progress: [{ to: 'waiting_tenant', label: 'Wait for tenant' }, { to: 'resolved', label: 'Resolve' }],
  waiting_tenant: [{ to: 'in_progress', label: 'Resume' }, { to: 'resolved', label: 'Resolve' }],
  reopened: [{ to: 'in_progress', label: 'Resume' }],
};

export function ServiceRequestDrawer({ request, open, onOpenChange, mode, tenantName }: { request: ServiceRequest | null; open: boolean; onOpenChange: (o: boolean) => void; mode: 'admin' | 'tenant'; tenantName?: string }) {
  const { admin, toast } = useSession();
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);
  if (!request) return null;
  const r = request;
  const actor = mode === 'admin' ? admin.name : r.createdBy;
  const Icon = CATEGORY_ICON[r.category];

  const timeline: TimelineItem[] = r.timeline.map((e, i) => ({
    id: `${e.status}-${i}`,
    tone: SERVICE_STATUS[e.status].tone,
    title: SERVICE_STATUS[e.status].label,
    detail: e.note ? e.note : `by ${e.by}`,
    meta: ago(e.ts),
  }));

  const postComment = () => {
    if (!comment.trim()) return;
    simulation.addRequestComment(r.id, { author: actor, authorRole: mode, body: comment.trim() });
    setComment('');
  };

  const transition = (to: ServiceStatus, label: string) => {
    simulation.transitionRequest(r.id, to, actor);
    toast({ title: `Request ${label.toLowerCase()}`, description: `${r.reference} is now ${SERVICE_STATUS[to].label.toLowerCase()}.`, variant: to === 'resolved' ? 'success' : 'default' });
  };

  const confirm = () => { simulation.transitionRequest(r.id, 'confirmed', actor); if (rating) simulation.rateRequest(r.id, rating); toast({ title: 'Resolution confirmed', description: 'Thank you for confirming.', variant: 'success' }); onOpenChange(false); };
  const reopen = () => { simulation.transitionRequest(r.id, 'reopened', actor, 'Reopened by tenant'); toast({ title: 'Request reopened', variant: 'warning' }); };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent width="560px">
        <DrawerHeader
          title={r.title}
          subtitle={`${r.reference}${tenantName ? ' · ' + tenantName : ''}`}
          badge={<div className="flex items-center gap-1.5"><PriorityBadge priority={r.priority} size="sm" /><ServiceStatusBadge status={r.status} size="sm" /></div>}
        />
        <DrawerBody className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-inset/50 p-3">
            <IconBox icon={Icon} tone="service" size="md" />
            <p className="text-[12.5px] leading-relaxed text-muted">{r.description}</p>
          </div>

          <DefList columns={2} items={[
            { label: 'Category', value: catLabel(r.category) },
            { label: 'Location', value: r.location ?? '—' },
            { label: 'Created', value: fmtDateTime(r.createdAt) },
            { label: 'Due', value: r.dueAt ? fmtDateTime(r.dueAt) : '—' },
            { label: 'Assigned team', value: r.assignedTeam ?? 'Unassigned' },
            { label: 'Assignee', value: r.assignedTo ?? '—' },
          ]} />

          {r.attachments.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {r.attachments.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-inset px-2.5 py-1.5 text-[11.5px] text-muted">
                    <Paperclip className="h-3.5 w-3.5" />{a.name} <span className="text-subtle">· {Math.round(a.sizeKb)} KB</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">Timeline</p>
            <Timeline items={timeline} />
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">Comments</p>
            <div className="flex flex-col gap-3">
              {r.comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={c.author} seed={c.author.length} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-foreground">{c.author}</span>
                      <span className="rounded bg-surface-inset px-1.5 py-0.5 text-[10px] text-subtle">{c.authorRole === 'admin' ? 'NASTP' : c.authorRole === 'tenant' ? 'Tenant' : 'System'}</span>
                      <span className="text-[10.5px] text-subtle">{ago(c.ts)}</span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-end gap-2">
              <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="flex-1" />
              <Button variant="secondary" size="sm" disabled={!comment.trim()} onClick={postComment}><Send className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          {mode === 'tenant' && r.status === 'resolved' && (
            <div className="rounded-xl border border-success/25 bg-success-dim/40 p-3.5">
              <p className="text-[12.5px] font-medium text-foreground">This request is marked resolved.</p>
              <p className="mt-0.5 text-[11.5px] text-muted">Rate the service and confirm, or reopen if the issue persists.</p>
              <div className="mt-2.5"><RatingStars value={rating} onChange={setRating} size={20} /></div>
            </div>
          )}
          {r.rating && (
            <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-inset/50 p-3">
              <RatingStars value={r.rating.score} size={16} />
              <span className="text-[12px] text-muted">{r.rating.feedback ?? 'Rated by tenant'}</span>
            </div>
          )}
        </DrawerBody>

        <DrawerFooter>
          {mode === 'admin' && (ADMIN_NEXT[r.status]?.length ? (
            ADMIN_NEXT[r.status]!.map((t) => (
              <Button key={t.to} variant={t.to === 'resolved' ? 'success' : 'secondary'} size="sm" onClick={() => transition(t.to, t.label)}>{t.label}</Button>
            ))
          ) : (
            <span className="text-[12px] text-subtle">{['resolved', 'confirmed', 'closed'].includes(r.status) ? 'Awaiting tenant / closed.' : 'No further action.'}</span>
          ))}
          {mode === 'tenant' && r.status === 'resolved' && (
            <>
              <Button variant="ghost" size="sm" onClick={reopen}><RotateCcw className="h-4 w-4" />Reopen</Button>
              <Button variant="success" size="sm" onClick={confirm}><ThumbsUp className="h-4 w-4" />Confirm{rating ? ' & rate' : ''}</Button>
            </>
          )}
          {mode === 'tenant' && (r.status === 'confirmed' || r.status === 'closed') && !r.rating && (
            <Button variant="secondary" size="sm" onClick={() => { if (rating) { simulation.rateRequest(r.id, rating); toast({ title: 'Thanks for the rating', variant: 'success' }); } }} disabled={!rating}><CheckCheck className="h-4 w-4" />Submit rating</Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export { MessageSquarePlus };

/**
 * Tenant Portal — New Service Request (§26). Title, description, category,
 * priority, location and attachments (images and documents). Only what's
 * genuinely needed is required.
 */

import { FilePlus2, Paperclip, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { Button, IconBox, StatusBadge } from '../../../components/ui/primitives';
import { Field, Input, Textarea, SimpleSelect } from '../../../components/ui/form';
import { CATEGORY_ICON } from '../../../components/status';
import { SERVICE_CATEGORY_LABEL } from '../../../data/catalog';
import { useSession } from '../../../store/session';
import { simulation, useLive } from '../../../data/live';
import type { ServiceAttachment, ServiceCategory, ServicePriority } from '../../../data/types';

const CATEGORIES = Object.entries(SERVICE_CATEGORY_LABEL).map(([value, label]) => ({ value: value as ServiceCategory, label }));
const PRIORITIES: Array<{ value: ServicePriority; label: string; tone: 'neutral' | 'info' | 'warning' | 'critical' }> = [
  { value: 'low', label: 'Low', tone: 'neutral' }, { value: 'medium', label: 'Medium', tone: 'info' },
  { value: 'high', label: 'High', tone: 'warning' }, { value: 'critical', label: 'Critical', tone: 'critical' },
];

export default function NewRequest() {
  const { tenantId, toast } = useSession();
  const navigate = useNavigate();
  const tenant = useLive((w) => w.tenantById[tenantId]);
  const offices = useLive((w) => w.offices.filter((o) => o.tenantId === tenantId));
  const fileRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState({ title: '', description: '', category: 'hvac' as ServiceCategory, priority: 'medium' as ServicePriority, officeId: offices[0]?.id ?? '' });
  const [attachments, setAttachments] = useState<ServiceAttachment[]>([]);
  const set = (p: Partial<typeof f>) => setF((prev) => ({ ...prev, ...p }));
  const valid = f.title.trim() && f.description.trim();

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).map((file, i) => ({
      id: `att-${Date.now()}-${i}`, name: file.name, kind: (file.type.startsWith('image/') ? 'image' : 'document') as 'image' | 'document', sizeKb: Math.max(1, Math.round(file.size / 1024)), uploadedAt: Date.now(),
    }));
    setAttachments((prev) => [...prev, ...next]);
  };

  const submit = () => {
    if (!valid || !tenant) return;
    const office = offices.find((o) => o.id === f.officeId);
    const req = simulation.submitRequest({
      tenantId, title: f.title.trim(), description: f.description.trim(), category: f.category, priority: f.priority,
      officeId: f.officeId || undefined, location: office?.code, createdBy: tenant.primaryContact.name, attachments,
    });
    toast({ title: 'Request submitted', description: `${req.reference} has been sent to the NASTP service team.`, variant: 'success', action: { label: 'View', onClick: () => navigate(`/portal/service?open=${req.id}`) } });
    navigate('/portal/service');
  };

  const CatIcon = CATEGORY_ICON[f.category];

  return (
    <Card>
      <CardHeader title="New Service Request" subtitle="Raise a request with the NASTP service team" icon={<IconBox icon={FilePlus2} tone="service" size="sm" />} />
      <CardBody className="flex flex-col gap-5">
        <Field label="Title" required><Input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Brief summary of the issue" /></Field>
        <Field label="Description" required hint="Describe the issue, when it started, and where"><Textarea rows={4} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="Provide as much detail as you can…" /></Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Category" required>
            <SimpleSelect value={f.category} onChange={(v) => set({ category: v })} options={CATEGORIES} />
          </Field>
          <Field label="Location / Office" optional>
            <SimpleSelect value={f.officeId} onChange={(v) => set({ officeId: v })} options={offices.map((o) => ({ value: o.id, label: `${o.label} · ${o.code}` }))} placeholder="Select office" />
          </Field>
          <Field label="Preview">
            <div className="flex h-10 items-center gap-2 rounded-[10px] border border-border-subtle bg-surface-inset px-3 text-[12.5px] text-muted"><CatIcon className="h-4 w-4 text-service" />{SERVICE_CATEGORY_LABEL[f.category]}</div>
          </Field>
        </div>

        <Field label="Priority" required>
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map((p) => (
              <button key={p.value} onClick={() => set({ priority: p.value })} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all ${f.priority === p.value ? 'border-primary/40 bg-primary-muted text-foreground' : 'border-border bg-surface-inset text-subtle hover:text-muted'}`}>
                <StatusBadge tone={p.tone} size="sm" dot>{p.label}</StatusBadge>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Attachments" optional hint="Images or documents">
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <Button variant="secondary" size="sm" className="w-fit" onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4" />Add files</Button>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-inset px-2.5 py-1.5 text-[11.5px] text-muted">
                    <Paperclip className="h-3.5 w-3.5" />{a.name} <span className="text-subtle">· {a.sizeKb} KB</span>
                    <button onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))} className="text-subtle hover:text-critical"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Field>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" onClick={() => navigate('/portal/service')}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={submit}><FilePlus2 className="h-4 w-4" />Submit Request</Button>
        </div>
      </CardBody>
    </Card>
  );
}

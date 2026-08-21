import { ArrowLeftRight, Check, ChevronDown, LayoutGrid, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLive } from '../data/live';
import { useSession } from '../store/session';
import { Button, TenantMark } from '../components/ui/primitives';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '../components/ui/overlay';
import { cn } from '../lib/utils';

/**
 * The seam that makes this one product: an admin can drop into any tenant's
 * portal to see exactly what that tenant sees, then step straight back to the
 * control plane. In the portal, it doubles as the tenant switcher.
 */
export function ExperienceSwitcher() {
  const { experience, tenantId, enterPortal, enterAdmin } = useSession();
  const navigate = useNavigate();
  const tenants = useLive((w) => w.tenants.filter((t) => t.status === 'active' || t.status === 'suspended'));
  const current = tenants.find((t) => t.id === tenantId);

  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          {experience === 'admin' ? (
            <>
              <LayoutGrid className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Admin</span>
            </>
          ) : (
            <>
              <Store className="h-3.5 w-3.5 text-primary" />
              <span className="hidden max-w-[120px] truncate sm:inline">{current?.name ?? 'Portal'}</span>
            </>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-subtle" />
        </Button>
      </MenuTrigger>
      <MenuContent align="end" className="w-[280px]">
        <MenuLabel>Experience</MenuLabel>
        <MenuItem
          onSelect={() => { enterAdmin(); navigate('/admin'); }}
          className={cn(experience === 'admin' && 'text-foreground')}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="flex-1">NASTP Admin</span>
          {experience === 'admin' && <Check className="h-3.5 w-3.5 text-primary" />}
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeftRight className="h-3 w-3" />
            Open a tenant portal
          </span>
        </MenuLabel>
        <div className="max-h-[280px] overflow-y-auto">
          {tenants.map((t) => (
            <MenuItem
              key={t.id}
              onSelect={() => { enterPortal(t.id); navigate('/portal'); }}
              className={cn(experience === 'portal' && t.id === tenantId && 'text-foreground')}
            >
              <TenantMark name={t.name} hue={t.brandHue} size={22} />
              <span className="flex-1 truncate">{t.name}</span>
              {experience === 'portal' && t.id === tenantId && <Check className="h-3.5 w-3.5 text-primary" />}
            </MenuItem>
          ))}
        </div>
      </MenuContent>
    </Menu>
  );
}

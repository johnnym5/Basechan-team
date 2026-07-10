<<<<<<< HEAD
'use client';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  action: (e: React.MouseEvent) => void;
  className?: string;
  isSeparator?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  anchorPoint: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, anchorPoint, items, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{ top: anchorPoint.y, left: anchorPoint.x }}
      className="fixed z-[9999] min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      onClick={(e) => e.stopPropagation()}
    >
      <ul className="space-y-0.5">
        {items.map((item, index) => {
            if (item.isSeparator) {
                return <Separator key={`sep-${index}`} className="my-1" />;
            }
            return (
                <li
                    key={index}
                    onClick={(e) => {
                    item.action(e);
                    onClose();
                    }}
                    className={cn(
                    "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent",
                    item.className
                    )}
                >
                    {item.icon}
                    <span>{item.label}</span>
                </li>
            )
        })}
      </ul>
    </div>
  );
};
=======
'use client';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  action: (e: React.MouseEvent) => void;
  className?: string;
  isSeparator?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  anchorPoint: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, anchorPoint, items, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{ top: anchorPoint.y, left: anchorPoint.x }}
      className="fixed z-[9999] min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      onClick={(e) => e.stopPropagation()}
    >
      <ul className="space-y-0.5">
        {items.map((item, index) => {
            if (item.isSeparator) {
                return <Separator key={`sep-${index}`} className="my-1" />;
            }
            return (
                <li
                    key={index}
                    onClick={(e) => {
                    item.action(e);
                    onClose();
                    }}
                    className={cn(
                    "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent",
                    item.className
                    )}
                >
                    {item.icon}
                    <span>{item.label}</span>
                </li>
            )
        })}
      </ul>
    </div>
  );
};
>>>>>>> 8c2f2c7ee9c25fe21fb0f2e265f70b5d1d4e553a

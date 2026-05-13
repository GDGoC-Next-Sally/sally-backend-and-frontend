'use client';

import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import React from 'react';
import styles from './DropdownMenu.module.css';

export type DropdownMenuItem =
  | { separator: true }
  | { label: string; onClick?: () => void; danger?: boolean; disabled?: boolean; separator?: false };

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'start' | 'center' | 'end';
}

export function DropdownMenu({ trigger, items, align = 'end' }: DropdownMenuProps) {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>
        {/* Wrap in span to prevent Radix from cloning non-forwardRef elements */}
        <span className={styles.triggerWrapper}>{trigger}</span>
      </RadixDropdown.Trigger>

      <RadixDropdown.Portal>
        <RadixDropdown.Content
          className={styles.content}
          align={align}
          sideOffset={4}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {items.map((item, i) =>
            'separator' in item && item.separator ? (
              <RadixDropdown.Separator key={i} className={styles.separator} />
            ) : (
              <RadixDropdown.Item
                key={i}
                className={[
                  styles.item,
                  'danger' in item && item.danger ? styles.itemDanger : '',
                  'disabled' in item && item.disabled ? styles.itemDisabled : '',
                ].join(' ')}
                disabled={'disabled' in item ? item.disabled : false}
                onSelect={() => 'onClick' in item && item.onClick?.()}
              >
                {'label' in item ? item.label : ''}
              </RadixDropdown.Item>
            )
          )}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}

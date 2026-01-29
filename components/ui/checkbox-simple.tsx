'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
}

const CheckboxSimple = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, checked, onCheckedChange, ...props }, ref) => {
        return (
            <div className="relative inline-flex items-center">
                <input
                    type="checkbox"
                    ref={ref}
                    checked={checked}
                    onChange={(e) => onCheckedChange?.(e.target.checked)}
                    className="sr-only peer"
                    {...props}
                />
                <div
                    className={cn(
                        'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary',
                        'cursor-pointer transition-colors',
                        'flex items-center justify-center',
                        className
                    )}
                    onClick={() => onCheckedChange?.(!checked)}
                >
                    {checked && <Check className="h-4 w-4" />}
                </div>
            </div>
        );
    }
);

CheckboxSimple.displayName = 'CheckboxSimple';

export { CheckboxSimple };

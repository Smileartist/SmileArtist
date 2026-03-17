import React from 'react';
import { Label } from '../ui/label';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
  error?: string;
}

export default function TextArea({ label, id, error, ...props }: TextAreaProps) {
  return (
    <div className="space-y-1.5 w-full">
      <Label htmlFor={id} className="text-sm font-medium text-[#2d2424] dark:text-[#f5e8e0]">
        {label}
      </Label>
      <textarea
        id={id}
        className="flex min-h-[120px] w-full rounded-xl border border-[#d4756f]/20 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#8a7c74]/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#d4756f] disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#f5e8e0]"
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

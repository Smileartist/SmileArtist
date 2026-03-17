import React from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
}

export default function FormInput({ label, id, error, ...props }: FormInputProps) {
  return (
    <div className="space-y-1.5 w-full">
      <Label htmlFor={id} className="text-sm font-medium text-[#2d2424] dark:text-[#f5e8e0]">
        {label}
      </Label>
      <Input
        id={id}
        className="rounded-xl border-[#d4756f]/20 focus-visible:ring-[#d4756f]"
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

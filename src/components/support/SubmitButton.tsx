import React from 'react';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export default function SubmitButton({ loading, children, ...props }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className="w-full bg-[#2d2424] text-white hover:bg-[#d4756f] dark:bg-[#f5e8e0] dark:text-[#2d2424] dark:hover:bg-[#d4756f] dark:hover:text-white rounded-xl py-6 transition-all duration-300 flex items-center justify-center gap-2"
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </Button>
  );
}

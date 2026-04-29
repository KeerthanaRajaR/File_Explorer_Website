"use client";

import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { ShareTargetsDialog } from './ShareTargetsDialog';

interface ShareButtonProps {
  path: string;
  className?: string;
  title?: string;
  onShared?: (message: string, isError?: boolean) => void;
}

export function ShareButton({ path, className, title = 'Share', onShared }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        title={title}
        className={className}
        aria-label={title}
      >
        <Link2 size={14} />
      </button>

      <ShareTargetsDialog
        isOpen={isOpen}
        path={path}
        onClose={() => setIsOpen(false)}
        onShared={onShared}
      />
    </>
  );
}

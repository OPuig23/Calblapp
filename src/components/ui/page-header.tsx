//file: src/components/ui/page-header.tsx
'use client';
import React from 'react';

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="space-x-2">{children}</div>
    </div>
  );
}
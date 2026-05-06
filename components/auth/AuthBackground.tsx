'use client';

import React from 'react';

export function AuthBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-pulse-bg">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(77,214,167,0.12),transparent_34%,transparent_68%,rgba(217,154,66,0.12))]" />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(77,214,167,0.75) 1px, transparent 1px),
            linear-gradient(90deg, rgba(217,154,66,0.55) 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px',
        }}
      />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-br from-pulse-bg via-pulse-surface/45 to-[#2A2417]/70" />
    </div>
  );
}

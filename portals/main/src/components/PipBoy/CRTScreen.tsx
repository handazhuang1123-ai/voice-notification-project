import React, { ReactNode } from 'react';

interface CRTScreenProps {
  children: ReactNode;
}

export function CRTScreen({ children }: CRTScreenProps) {
  return (
    <div className="crt-container">
      <div className="pip-boy-screen">
        {children}
      </div>
      {/* Additional CRT effect layers */}
      <div className="crt-overlay" />
    </div>
  );
}
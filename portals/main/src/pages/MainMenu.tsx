import React, { useState } from 'react';

interface MainMenuProps {
  onServiceSelect: (service: string) => void;
}

export function MainMenu({ onServiceSelect }: MainMenuProps) {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const services = [
    {
      id: 'log-viewer',
      title: '日志查看系统',
      description: 'SYSTEM LOG VIEWER',
      status: 'ONLINE',
      statusColor: 'text-pip-green',
      icon: '📊'
    },
    {
      id: 'profile',
      title: '人物画像问答',
      description: 'PROFILE INTERVIEW',
      status: 'READY',
      statusColor: 'text-pip-green',
      icon: '👤'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-pip-green mb-4">
          MAIN CONTROL PANEL
        </h1>
        <p className="text-pip-green-dim text-lg">
          Select a service to launch
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {services.map((service) => (
          <button
            key={service.id}
            className={`
              relative p-8 border-2 border-pip-green bg-pip-dark
              transition-all duration-300 transform
              ${hoveredButton === service.id ? 'scale-105 shadow-pip-glow-strong bg-opacity-50' : 'hover:bg-opacity-30'}
            `}
            onMouseEnter={() => setHoveredButton(service.id)}
            onMouseLeave={() => setHoveredButton(null)}
            onClick={() => onServiceSelect(service.id)}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="text-6xl">{service.icon}</div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-pip-green">
                  {service.title}
                </h2>
                <p className="text-sm text-pip-green-dim">
                  {service.description}
                </p>
              </div>

              <div className={`text-xs font-bold ${service.statusColor} animate-pulse`}>
                ● {service.status}
              </div>
            </div>

            {/* 装饰性边角 */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-pip-green"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-pip-green"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-pip-green"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-pip-green"></div>
          </button>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-pip-green-dim text-sm">
          Click to launch service in new window
        </p>
      </div>
    </div>
  );
}
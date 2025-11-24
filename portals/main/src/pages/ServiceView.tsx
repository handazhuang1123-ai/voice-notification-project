import React, { useState } from 'react';
import { useServiceManager } from '../hooks/useServiceManager';

interface ServiceViewProps {
  onBack: () => void;
}

export function ServiceView({ onBack }: ServiceViewProps) {
  const { services, loading, refreshService, startService, stopService } = useServiceManager();
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    const service = services.find(s => s.id === serviceId);

    // 如果服务离线，尝试启动它
    if (service?.status === 'offline') {
      startService(serviceId);
    }
  };

  const handleEnterService = (serviceId: string) => {
    // 直接在当前页面跳转到服务
    window.location.href = getServiceUrl(serviceId);
  };

  const handleServiceControl = async (serviceId: string, action: 'start' | 'stop') => {
    if (action === 'start') {
      await startService(serviceId);
    } else {
      await stopService(serviceId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-pip-green';
      case 'offline': return 'text-pip-green-dim';
      case 'starting': return 'text-pip-amber animate-pulse';
      case 'stopping': return 'text-pip-amber animate-pulse';
      case 'error': return 'text-red-500';
      default: return 'text-pip-green-dim';
    }
  };

  const getServiceUrl = (serviceId: string) => {
    switch (serviceId) {
      case 'log-viewer': return '/api/log/log-viewer/index.html';
      case 'profile': return '/api/profile/';
      default: return '';
    }
  };

  return (
    <div className="h-full flex">
      {/* 左侧服务列表 */}
      <div className="w-80 border-r-2 border-pip-green p-4">
        <div className="mb-4">
          <button
            onClick={onBack}
            className="text-pip-green hover:text-pip-green-bright transition-colors"
          >
            &lt; 返回主菜单
          </button>
        </div>

        <h2 className="text-xl font-bold text-pip-green mb-4">服务控制面板</h2>

        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className={`
                border border-pip-green p-3 cursor-pointer transition-all
                ${selectedService === service.id ? 'bg-pip-green bg-opacity-20' : 'hover:bg-pip-green hover:bg-opacity-10'}
              `}
              onClick={() => handleServiceSelect(service.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-pip-green">{service.name}</h3>
                  <p className="text-xs text-pip-green-dim">{service.description}</p>
                </div>
                <span className={`text-xs font-bold ${getStatusColor(service.status)}`}>
                  ● {service.status.toUpperCase()}
                </span>
              </div>

              {/* 控制按钮 */}
              <div className="flex gap-2 mt-2">
                <button
                  className="px-2 py-1 text-xs border border-pip-green text-pip-green hover:bg-pip-green hover:text-pip-bg transition-all disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleServiceControl(service.id, 'start');
                  }}
                  disabled={loading[service.id] || service.status === 'online' || service.status === 'starting'}
                >
                  启动
                </button>
                <button
                  className="px-2 py-1 text-xs border border-pip-green text-pip-green hover:bg-pip-green hover:text-pip-bg transition-all disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleServiceControl(service.id, 'stop');
                  }}
                  disabled={loading[service.id] || service.status === 'offline' || service.status === 'stopping'}
                >
                  停止
                </button>
                <button
                  className="px-2 py-1 text-xs border border-pip-green text-pip-green hover:bg-pip-green hover:text-pip-bg transition-all disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshService(service.id);
                  }}
                  disabled={loading[service.id]}
                >
                  刷新
                </button>
              </div>

              {/* 错误信息 */}
              {service.status === 'error' && service.error && (
                <div className="mt-2 text-xs text-red-500">
                  错误: {service.error}
                </div>
              )}

              {/* 最后检查时间 */}
              {service.lastCheck && (
                <div className="mt-1 text-xs text-pip-green-dim">
                  最后检查: {new Date(service.lastCheck).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 border border-pip-green-dim">
          <p className="text-xs text-pip-green-dim">
            提示：服务每30秒自动检查一次状态
          </p>
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 p-4">
        {selectedService ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-center max-w-md">
              <h3 className="text-2xl font-bold text-pip-green mb-4">
                {services.find(s => s.id === selectedService)?.name}
              </h3>

              <p className="text-pip-green-dim mb-6">
                {services.find(s => s.id === selectedService)?.description}
              </p>

              <div className="mb-8">
                <span className={`text-lg font-bold ${getStatusColor(services.find(s => s.id === selectedService)?.status || '')}`}>
                  状态: {services.find(s => s.id === selectedService)?.status.toUpperCase()}
                </span>
              </div>

              {services.find(s => s.id === selectedService)?.status === 'online' ? (
                <button
                  className="px-8 py-3 text-xl border-2 border-pip-green text-pip-green hover:bg-pip-green hover:text-pip-bg transition-all font-bold"
                  onClick={() => handleEnterService(selectedService)}
                >
                  进入服务
                </button>
              ) : services.find(s => s.id === selectedService)?.status === 'offline' ? (
                <button
                  className="px-8 py-3 text-xl border-2 border-pip-amber text-pip-amber hover:bg-pip-amber hover:text-pip-bg transition-all font-bold"
                  onClick={() => startService(selectedService)}
                  disabled={loading[selectedService]}
                >
                  启动服务
                </button>
              ) : (
                <div className="text-pip-amber animate-pulse text-lg">
                  处理中，请稍候...
                </div>
              )}

              {/* 服务详细信息 */}
              <div className="mt-8 p-4 border border-pip-green-dim text-left">
                <h4 className="text-sm font-bold text-pip-green mb-2">服务信息</h4>
                <div className="text-xs text-pip-green-dim space-y-1">
                  <p>服务 ID: {selectedService}</p>
                  <p>端口: {selectedService === 'log-viewer' ? '55555' : '3002'}</p>
                  <p>代理路径: {getServiceUrl(selectedService)}</p>
                  {services.find(s => s.id === selectedService)?.lastCheck && (
                    <p>最后检查: {new Date(services.find(s => s.id === selectedService)!.lastCheck!).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-pip-green-dim text-lg">
              请从左侧选择一个服务
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { serviceManager } from '../services/ServiceManager';
import type { Service } from '../services/ServiceManager';

export function useServiceManager() {
  const [services, setServices] = useState<Service[]>(() =>
    serviceManager.getServices()
  );
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // 启动健康检查
    serviceManager.startHealthCheck();

    // 订阅服务状态变化
    const unsubscribe = serviceManager.subscribe((updatedServices) => {
      setServices(updatedServices);
    });

    return () => {
      unsubscribe();
      serviceManager.stopHealthCheck();
    };
  }, []);

  /**
   * 手动刷新服务状态
   */
  const refreshService = async (serviceId: string) => {
    setLoading(prev => ({ ...prev, [serviceId]: true }));
    await serviceManager.checkService(serviceId);
    setLoading(prev => ({ ...prev, [serviceId]: false }));
  };

  /**
   * 启动服务
   */
  const startService = async (serviceId: string) => {
    setLoading(prev => ({ ...prev, [serviceId]: true }));
    const success = await serviceManager.startService(serviceId);
    setLoading(prev => ({ ...prev, [serviceId]: false }));
    return success;
  };

  /**
   * 停止服务
   */
  const stopService = async (serviceId: string) => {
    setLoading(prev => ({ ...prev, [serviceId]: true }));
    const success = await serviceManager.stopService(serviceId);
    setLoading(prev => ({ ...prev, [serviceId]: false }));
    return success;
  };

  return {
    services,
    loading,
    refreshService,
    startService,
    stopService
  };
}
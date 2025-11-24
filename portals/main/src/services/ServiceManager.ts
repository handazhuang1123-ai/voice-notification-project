/**
 * 服务管理器 - 管理各个子服务的状态、健康检查、启动停止
 */

export interface Service {
  id: string;
  name: string;
  description: string;
  port: number;
  healthEndpoint: string;
  status: 'online' | 'offline' | 'starting' | 'stopping' | 'error';
  lastCheck?: Date;
  error?: string;
}

export class ServiceManager {
  private services: Map<string, Service> = new Map();
  private healthCheckInterval: number = 30000; // 30秒
  private checkTimer?: NodeJS.Timer;
  private listeners: Set<(services: Service[]) => void> = new Set();

  constructor() {
    this.initializeServices();
  }

  /**
   * 初始化服务配置
   */
  private initializeServices() {
    const serviceConfigs: Service[] = [
      {
        id: 'log-viewer',
        name: '日志查看系统',
        description: 'System Log Viewer',
        port: 55555,
        healthEndpoint: '/api/log/health',
        status: 'offline'
      },
      {
        id: 'profile',
        name: '人物画像问答',
        description: 'Profile Interview System',
        port: 3002,
        healthEndpoint: '/api/profile/api/health',
        status: 'offline'
      }
    ];

    serviceConfigs.forEach(service => {
      this.services.set(service.id, service);
    });
  }

  /**
   * 开始健康检查
   */
  startHealthCheck() {
    // 立即执行一次检查
    this.checkAllServices();

    // 设置定期检查
    this.checkTimer = setInterval(() => {
      this.checkAllServices();
    }, this.healthCheckInterval);
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
  }

  /**
   * 检查所有服务状态
   */
  private async checkAllServices() {
    const services = Array.from(this.services.values());

    await Promise.all(
      services.map(service => this.checkServiceHealth(service))
    );

    this.notifyListeners();
  }

  /**
   * 检查单个服务健康状态
   */
  private async checkServiceHealth(service: Service) {
    try {
      // 使用fetch检查健康端点
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5秒超时

      const response = await fetch(service.healthEndpoint, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeout);

      if (response.ok) {
        service.status = 'online';
        service.error = undefined;
      } else {
        service.status = 'error';
        service.error = `HTTP ${response.status}`;
      }
    } catch (error) {
      // 服务离线或网络错误
      service.status = 'offline';
      service.error = error instanceof Error ? error.message : 'Unknown error';
    }

    service.lastCheck = new Date();
    this.services.set(service.id, service);
  }

  /**
   * 手动检查特定服务
   */
  async checkService(serviceId: string): Promise<Service | undefined> {
    const service = this.services.get(serviceId);
    if (service) {
      await this.checkServiceHealth(service);
      this.notifyListeners();
    }
    return service;
  }

  /**
   * 启动服务（需要后端支持）
   */
  async startService(serviceId: string): Promise<boolean> {
    const service = this.services.get(serviceId);
    if (!service) return false;

    service.status = 'starting';
    this.notifyListeners();

    try {
      // 这里应该调用后端API来启动服务
      // 暂时模拟
      const response = await fetch(`/api/services/${serviceId}/start`, {
        method: 'POST'
      });

      if (response.ok) {
        // 等待服务完全启动
        await new Promise(resolve => setTimeout(resolve, 3000));
        await this.checkServiceHealth(service);
        return true;
      }
    } catch (error) {
      service.status = 'error';
      service.error = '启动失败';
    }

    this.notifyListeners();
    return false;
  }

  /**
   * 停止服务（需要后端支持）
   */
  async stopService(serviceId: string): Promise<boolean> {
    const service = this.services.get(serviceId);
    if (!service) return false;

    service.status = 'stopping';
    this.notifyListeners();

    try {
      // 这里应该调用后端API来停止服务
      // 暂时模拟
      const response = await fetch(`/api/services/${serviceId}/stop`, {
        method: 'POST'
      });

      if (response.ok) {
        service.status = 'offline';
        this.notifyListeners();
        return true;
      }
    } catch (error) {
      service.status = 'error';
      service.error = '停止失败';
    }

    this.notifyListeners();
    return false;
  }

  /**
   * 获取所有服务
   */
  getServices(): Service[] {
    return Array.from(this.services.values());
  }

  /**
   * 获取特定服务
   */
  getService(serviceId: string): Service | undefined {
    return this.services.get(serviceId);
  }

  /**
   * 订阅服务状态变化
   */
  subscribe(listener: (services: Service[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners() {
    const services = this.getServices();
    this.listeners.forEach(listener => listener(services));
  }
}

// 创建单例实例
export const serviceManager = new ServiceManager();
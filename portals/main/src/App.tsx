import React, { useState } from 'react';
import { CRTScreen } from './components/PipBoy/CRTScreen';
import { TabBar } from './components/PipBoy/TabBar';
import { StatusBar } from './components/PipBoy/StatusBar';
import { MainMenu } from './pages/MainMenu';

function App() {
  const [activeService, setActiveService] = useState<string | null>(null);

  const handleServiceSelect = (service: string) => {
    setActiveService(service);
    // 启动对应的服务
    if (service === 'log-viewer') {
      window.open('http://localhost:55555', '_blank');
    } else if (service === 'profile') {
      window.open('http://localhost:3002', '_blank');
    }
  };

  return (
    <CRTScreen>
      <div className="h-screen flex flex-col bg-pip-bg">
        <TabBar />

        <div className="flex-1 overflow-hidden flex items-center justify-center">
          <MainMenu onServiceSelect={handleServiceSelect} />
        </div>

        <StatusBar health={100} level={1} ap={10} />
      </div>
    </CRTScreen>
  );
}

export default App
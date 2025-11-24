import React, { useState } from 'react';
import { CRTScreen } from './components/PipBoy/CRTScreen';
import { TabBar } from './components/PipBoy/TabBar';
import { StatusBar } from './components/PipBoy/StatusBar';
import { MainMenu } from './pages/MainMenu';
import { ServiceView } from './pages/ServiceView';

type ViewMode = 'menu' | 'services';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('menu');

  const handleServiceSelect = (service: string) => {
    // 切换到服务管理视图
    setViewMode('services');
  };

  const handleBackToMenu = () => {
    setViewMode('menu');
  };

  return (
    <CRTScreen>
      <div className="h-screen flex flex-col bg-pip-bg">
        <TabBar />

        <div className="flex-1 overflow-hidden">
          {viewMode === 'menu' ? (
            <div className="h-full flex items-center justify-center">
              <MainMenu onServiceSelect={handleServiceSelect} />
            </div>
          ) : (
            <ServiceView onBack={handleBackToMenu} />
          )}
        </div>

        <StatusBar health={100} level={1} ap={10} />
      </div>
    </CRTScreen>
  );
}

export default App
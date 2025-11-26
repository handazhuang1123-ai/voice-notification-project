/**
 * Profile Module - Main App
 * 个人画像系统主应用
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CRTScreen } from '@packages/pip-boy-theme';
import { Questionnaire } from './pages/Questionnaire';
import { Interview } from './pages/Interview';
import { Approval } from './pages/Approval';

export function App() {
  return (
    <BrowserRouter>
      <CRTScreen>
        <Routes>
          {/* 默认路由重定向到问卷 */}
          <Route path="/" element={<Navigate to="/questionnaire" replace />} />

          {/* Phase 1: 基础问卷 */}
          <Route path="/questionnaire" element={<Questionnaire />} />

          {/* Phase 2: 深度访谈 */}
          <Route path="/interview" element={<Interview />} />

          {/* Phase 3: 洞察审批 */}
          <Route path="/approval" element={<Approval />} />
        </Routes>
      </CRTScreen>
    </BrowserRouter>
  );
}

/**
 * Profile-2 主应用
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import QuestionList from './pages/QuestionList';
import Interview from './pages/Interview';

export default function App() {
  return (
    <BrowserRouter>
      <div className="crt-container">
        <div className="pip-boy-screen">
          {/* Header */}
          <header className="text-center py-4 border-b-2 border-pip-green-dim">
            <h1
              className="text-2xl font-bold text-pip-green"
              style={{
                textShadow: '0 0 10px rgba(74, 246, 38, 0.8), 0 0 20px rgba(74, 246, 38, 0.5), 0 0 40px rgba(74, 246, 38, 0.3)',
              }}
            >
              ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM
            </h1>
            <p className="text-pip-green-dim text-sm mt-1">
              COPYRIGHT 2075-2077 ROBCO INDUSTRIES
            </p>
            <p className="text-pip-green text-sm">-PROFILE MODULE-</p>
          </header>

          {/* Main Content */}
          <main className="app-container">
            <Routes>
              <Route path="/" element={<QuestionList />} />
              <Route path="/interview/:questionId" element={<Interview />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

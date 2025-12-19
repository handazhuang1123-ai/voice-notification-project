/**
 * Profile-2 主应用 - 两页路由模式
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import QuestionList from './pages/QuestionList';
import Interview from './pages/Interview';

export default function App() {
    return (
        <BrowserRouter>
            {/* CRT Effects Layer */}
            <div className="crt-container"></div>
            <div className="scanlines"></div>

            {/* Main Content */}
            <div className="screen-flicker">
                <Routes>
                    <Route path="/" element={<QuestionList />} />
                    <Route path="/interview/:questionId" element={<Interview />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

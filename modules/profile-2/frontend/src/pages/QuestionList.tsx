/**
 * 问题列表页面 - 固定 frame 边框
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QUESTIONS } from '../constants';
import { api } from '../api/client';

const USER_ID = 'default-user';

// 英文标题映射
const QUESTION_TITLES_EN: Record<string, string> = {
    'life_chapters': 'LIFE CHAPTERS',
    'education_career': 'EDUCATION & CAREER',
    'relationships': 'RELATIONSHIPS',
    'challenges_growth': 'CHALLENGES & GROWTH',
    'achievements_pride': 'ACHIEVEMENTS & PRIDE',
    'future_aspirations': 'FUTURE ASPIRATIONS',
    'values_beliefs': 'VALUES & BELIEFS',
    'life_philosophy': 'LIFE PHILOSOPHY'
};

interface SessionInfo {
    session_id: string;
    question_id: string;
    status: string;
    total_turns: number;
}

export default function QuestionList() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        loadProgress();
    }, []);

    // 键盘导航
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (loading) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    setCurrentIndex(prev => (prev > 0 ? prev - 1 : QUESTIONS.length - 1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setCurrentIndex(prev => (prev < QUESTIONS.length - 1 ? prev + 1 : 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    const question = QUESTIONS[currentIndex];
                    navigate(`/interview/${question.id}`, {
                        state: { questionOrder: currentIndex + 1 }
                    });
                    break;
                default:
                    // 数字键快捷选择
                    const num = parseInt(e.key);
                    if (num >= 1 && num <= QUESTIONS.length) {
                        const index = num - 1;
                        setCurrentIndex(index);
                        navigate(`/interview/${QUESTIONS[index].id}`, {
                            state: { questionOrder: index + 1 }
                        });
                    }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [loading, currentIndex, navigate]);

    const loadProgress = async () => {
        try {
            setLoading(true);
            const result = await api.getUserProgress(USER_ID);
            setSessions(result.sessions);
        } catch (err) {
            console.error('Failed to load progress:', err);
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatus = useCallback((questionId: string): 'done' | 'progress' | 'pending' => {
        const session = sessions.find((s) => s.question_id === questionId);
        if (!session) return 'pending';
        return session.status === 'completed' ? 'done' : 'progress';
    }, [sessions]);

    const getStatusText = (status: 'done' | 'progress' | 'pending') => {
        switch (status) {
            case 'done': return '[DONE]';
            case 'progress': return '[IN PROGRESS]';
            default: return '[    ]';
        }
    };

    const completedCount = sessions.filter((s) => s.status === 'completed').length;
    const progressPercent = Math.round((completedCount / QUESTIONS.length) * 100);
    const filledBars = Math.round((progressPercent / 100) * 6);

    if (loading) {
        return (
            <div className="terminal-frame pip-text">
                <div className="terminal-header">
                    <div className="terminal-header-row">
                        <span>PROFILE SYSTEM v2.0</span>
                    </div>
                </div>
                <div className="terminal-body">
                    <div className="empty-state loading-text">LOADING DATA...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="terminal-frame pip-text">
            {/* Header */}
            <div className="terminal-header">
                <div className="terminal-header-row">
                    <span>PROFILE SYSTEM v2.0</span>
                    <span>
                        [<span className="progress-filled">{'■'.repeat(filledBars)}</span>
                        <span className="progress-empty">{'□'.repeat(6 - filledBars)}</span>] {progressPercent}%
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="terminal-body">
                <div className="section-title">SELECT INTERVIEW TOPIC</div>

                {/* List Items */}
                {QUESTIONS.map((question, index) => {
                    const status = getStatus(question.id);
                    const isSelected = index === currentIndex;
                    const title = QUESTION_TITLES_EN[question.id] || (question.title || '').toUpperCase();
                    const statusText = getStatusText(status);

                    return (
                        <div
                            key={question.id}
                            className={`list-item ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                                setCurrentIndex(index);
                                navigate(`/interview/${question.id}`, {
                                    state: { questionOrder: index + 1 }
                                });
                            }}
                        >
                            <span className={isSelected ? '' : 'pip-text-dim'}>
                                {isSelected ? '>' : ' '} [{index + 1}] {title}
                            </span>
                            <span className={
                                status === 'done' ? 'status-done' :
                                status === 'progress' ? 'status-progress' : 'status-pending'
                            }>
                                {statusText}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="terminal-footer">
                <div className="terminal-footer-row">
                    <span>[↑/↓] NAVIGATE</span>
                    <span>[ENTER] SELECT</span>
                    <span>[1-8] QUICK</span>
                </div>
            </div>
        </div>
    );
}

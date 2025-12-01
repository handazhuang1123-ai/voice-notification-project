/**
 * 问题列表页面
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QUESTIONS, getQuestionConfig } from '../constants';
import { api } from '../api/client';

// 临时用户ID（后续可改为登录系统）
const USER_ID = 'default-user';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const result = await api.getUserProgress(USER_ID);
      setSessions(result.sessions);
    } catch (err) {
      console.error('Failed to load progress:', err);
      // 新用户没有进度是正常的
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const getSessionStatus = (questionId: string) => {
    const session = sessions.find(s => s.question_id === questionId);
    if (!session) return 'pending';
    return session.status === 'completed' ? 'completed' : 'in-progress';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in-progress': return '进行中';
      default: return '未开始';
    }
  };

  const handleQuestionClick = (questionId: string, order: number) => {
    navigate(`/interview/${questionId}`, {
      state: { questionOrder: order }
    });
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ textAlign: 'center', paddingTop: '50px' }}>
        <div className="status-indicator">
          <div className="status-dot loading"></div>
          <span>正在加载...</span>
        </div>
      </div>
    );
  }

  const completedCount = sessions.filter(s => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / QUESTIONS.length) * 100);

  return (
    <div className="question-list-page">
      <header>
        <div
          className="px-4 py-2.5 bg-pip-green/10 border-b-2 border-pip-green-dim font-bold"
          style={{ textShadow: '0 0 10px rgba(74, 246, 38, 0.5)' }}
        >
          个人画像问答系统 V2.0
        </div>

        <div className="progress-section" style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>整体进度</span>
            <span>{completedCount} / {QUESTIONS.length} ({progressPercent}%)</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </header>

      <div className="question-list">
        {QUESTIONS.map((question, index) => {
          const status = getSessionStatus(question.id);
          const config = getQuestionConfig(question.id);
          const session = sessions.find(s => s.question_id === question.id);

          return (
            <div
              key={question.id}
              className="card question-card"
              onClick={() => handleQuestionClick(question.id, index + 1)}
            >
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="question-number">{String(index + 1).padStart(2, '0')}</span>
                  <h3 style={{ margin: 0 }}>{question.title}</h3>
                </div>
                <span className={`question-status ${status}`}>
                  {getStatusLabel(status)}
                </span>
              </div>

              <p style={{ color: 'var(--pip-green-dim)', marginBottom: '10px' }}>
                {question.description}
              </p>

              <div style={{
                display: 'flex',
                gap: '20px',
                fontSize: '0.75rem',
                color: 'var(--pip-green-dim)'
              }}>
                <span>预计 {config?.minTurns}-{config?.maxTurns} 轮</span>
                {session && session.total_turns > 0 && (
                  <span>已对话 {session.total_turns} 轮</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <footer style={{
        marginTop: '40px',
        textAlign: 'center',
        color: 'var(--pip-green-dim)',
        fontSize: '0.75rem'
      }}>
        <p>基于 DICE + GROW + ACT 理论框架设计</p>
        <p>数据仅存储于本地</p>
      </footer>
    </div>
  );
}

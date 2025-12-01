/**
 * 访谈对话页面
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { QUESTIONS, getQuestionConfig, getPhaseLabel, PHASE_LABELS } from '../constants';
import { api } from '../api/client';

const USER_ID = 'default-user';

interface Message {
  role: 'user' | 'ai' | 'system';
  content: string;
  phase?: string;
}

interface SessionState {
  sessionId: string | null;
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  progressPercent: number;
}

export default function Interview() {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const questionOrder = (location.state as { questionOrder?: number })?.questionOrder || 1;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>({
    sessionId: null,
    phase: 'opening',
    phaseIndex: 0,
    totalPhases: 5,
    progressPercent: 0
  });
  const [showExistingDialog, setShowExistingDialog] = useState(false);
  const [existingSession, setExistingSession] = useState<{
    session_id: string;
    total_turns: number;
    started_at: string;
  } | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const question = QUESTIONS.find(q => q.id === questionId);
  const config = questionId ? getQuestionConfig(questionId) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  if (!question || !questionId) {
    return (
      <div className="error-page">
        <h1>问题不存在</h1>
        <button className="btn" onClick={() => navigate('/')}>返回列表</button>
      </div>
    );
  }

  const handleInitialSubmit = async () => {
    if (!inputValue.trim()) return;

    const initialAnswer = inputValue.trim();
    setInputValue('');
    setLoading(true);

    try {
      const result = await api.startSession({
        userId: USER_ID,
        questionId,
        questionOrder,
        initialAnswer
      });

      if (result.action === 'existing_found' && result.session) {
        // 发现已有会话
        setExistingSession({
          session_id: result.session.session_id,
          total_turns: result.session.total_turns || 0,
          started_at: result.session.started_at || ''
        });
        setShowExistingDialog(true);
        // 暂存初始回答
        setInputValue(initialAnswer);
      } else if (result.session) {
        // 新会话创建成功
        setSessionState({
          sessionId: result.session.session_id,
          phase: result.session.current_phase,
          phaseIndex: 0,
          totalPhases: result.session.phase_order?.length || 5,
          progressPercent: 0
        });

        // 添加用户消息
        setMessages([{
          role: 'user',
          content: initialAnswer
        }]);

        // 发送第一条消息获取AI回复
        const response = await api.sendMessage(result.session.session_id, initialAnswer);

        setMessages(prev => [...prev, {
          role: 'ai',
          content: response.response,
          phase: response.phase
        }]);

        setSessionState(prev => ({
          ...prev,
          phase: response.phase,
          phaseIndex: response.progress.phase_index,
          progressPercent: response.progress.progress_percent
        }));
      }
    } catch (error) {
      console.error('Start session failed:', error);
      setMessages([{
        role: 'system',
        content: `错误: ${error instanceof Error ? error.message : '启动会话失败'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueExisting = async () => {
    if (!existingSession) return;

    setShowExistingDialog(false);
    setLoading(true);

    try {
      // 加载已有会话历史
      const sessionData = await api.getSession(existingSession.session_id);

      setSessionState({
        sessionId: existingSession.session_id,
        phase: sessionData.session.current_phase,
        phaseIndex: sessionData.session.progress.phase_index,
        totalPhases: sessionData.session.progress.total_phases,
        progressPercent: sessionData.session.progress.progress_percent
      });

      // 加载历史消息
      const history = sessionData.session.turns.flatMap(turn => [
        { role: 'user' as const, content: turn.user_message, phase: turn.phase },
        { role: 'ai' as const, content: turn.ai_message, phase: turn.phase }
      ]);

      setMessages(history);
      setInputValue('');

      if (sessionData.session.status === 'completed') {
        setIsCompleted(true);
      }
    } catch (error) {
      console.error('Load session failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = async () => {
    setShowExistingDialog(false);
    setLoading(true);

    const initialAnswer = inputValue.trim();
    setInputValue('');

    try {
      const result = await api.startSession({
        userId: USER_ID,
        questionId,
        questionOrder,
        initialAnswer,
        forceNew: true
      });

      if (result.session) {
        setSessionState({
          sessionId: result.session.session_id,
          phase: result.session.current_phase,
          phaseIndex: 0,
          totalPhases: result.session.phase_order?.length || 5,
          progressPercent: 0
        });

        setMessages([{ role: 'user', content: initialAnswer }]);

        const response = await api.sendMessage(result.session.session_id, initialAnswer);

        setMessages(prev => [...prev, {
          role: 'ai',
          content: response.response,
          phase: response.phase
        }]);

        setSessionState(prev => ({
          ...prev,
          phase: response.phase,
          phaseIndex: response.progress.phase_index,
          progressPercent: response.progress.progress_percent
        }));
      }
    } catch (error) {
      console.error('Start new session failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !sessionState.sessionId || loading) return;

    const message = inputValue.trim();
    setInputValue('');
    setLoading(true);

    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: message }]);

    try {
      const response = await api.sendMessage(sessionState.sessionId, message);

      setMessages(prev => [...prev, {
        role: 'ai',
        content: response.response,
        phase: response.phase
      }]);

      setSessionState(prev => ({
        ...prev,
        phase: response.phase,
        phaseIndex: response.progress.phase_index,
        progressPercent: response.progress.progress_percent
      }));

      // 检查是否进入总结阶段
      if (response.phase === 'summary') {
        setIsCompleted(true);
      }
    } catch (error) {
      console.error('Send message failed:', error);
      setMessages(prev => [...prev, {
        role: 'system',
        content: `错误: ${error instanceof Error ? error.message : '发送失败'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (sessionState.sessionId) {
        handleSendMessage();
      } else {
        handleInitialSubmit();
      }
    }
  };

  const phaseOrder = config ? getPhaseOrder(questionId) : ['opening', 'values_narrative', 'summary'];

  return (
    <div className="interview-page">
      {/* 头部 */}
      <header style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            className="btn"
            onClick={() => navigate('/')}
            style={{ padding: '8px 16px' }}
          >
            ← 返回
          </button>
          <div className="status-indicator">
            <div className={`status-dot ${loading ? 'loading' : ''}`}></div>
            <span>{getPhaseLabel(sessionState.phase)}</span>
          </div>
        </div>

        <h2 style={{ marginTop: '15px' }}>{question.title}</h2>

        {/* 阶段进度 */}
        <div className="phase-indicator">
          {phaseOrder.map((phase, index) => (
            <div
              key={phase}
              className={`phase-step ${
                index < sessionState.phaseIndex ? 'completed' :
                index === sessionState.phaseIndex ? 'active' : ''
              }`}
            >
              {PHASE_LABELS[phase as keyof typeof PHASE_LABELS] || phase}
            </div>
          ))}
        </div>

        {/* 总进度条 */}
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${sessionState.progressPercent}%` }}
          ></div>
        </div>
      </header>

      {/* 对话区域 */}
      <div className="chat-container">
        {!sessionState.sessionId ? (
          // 初始输入界面
          <div className="initial-input">
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3>问题引导</h3>
              <p style={{ color: 'var(--pip-green-dim)', marginTop: '10px' }}>
                {question.prompt}
              </p>
            </div>

            <p style={{ marginBottom: '15px', color: 'var(--pip-green-dim)' }}>
              请在下方输入你的回答，开始对话...
            </p>
          </div>
        ) : (
          // 对话消息列表
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message message-${msg.role}`}>
                <div className="message-label">
                  {msg.role === 'user' ? '你' : msg.role === 'ai' ? 'AI' : '系统'}
                </div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}

            {loading && (
              <div className="message message-ai">
                <div className="message-label">AI</div>
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* 输入区域 */}
        {!isCompleted && (
          <div className="chat-input">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={sessionState.sessionId ? '输入你的回答...' : '请输入你的初始回答...'}
              disabled={loading}
              rows={1}
              style={{ maxHeight: '150px' }}
            />
            <button
              className="btn btn-primary"
              onClick={sessionState.sessionId ? handleSendMessage : handleInitialSubmit}
              disabled={loading || !inputValue.trim()}
            >
              发送
            </button>
          </div>
        )}

        {/* 完成状态 */}
        {isCompleted && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: 'var(--pip-green)', marginBottom: '15px' }}>
              ✓ 本次访谈已完成
            </p>
            <button className="btn" onClick={() => navigate('/')}>
              返回问题列表
            </button>
          </div>
        )}
      </div>

      {/* 已有会话确认对话框 */}
      {showExistingDialog && existingSession && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>发现已有记录</h3>
            <p style={{ marginBottom: '15px' }}>
              你在 {new Date(existingSession.started_at).toLocaleString()} 开始过这个问题的访谈，
              已进行 {existingSession.total_turns} 轮对话。
            </p>
            <p style={{ color: 'var(--pip-amber)' }}>
              是否继续之前的访谈，还是重新开始？
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--pip-green-dim)', marginTop: '10px' }}>
              注意：重新开始会归档之前的记录
            </p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleContinueExisting}>
                继续访谈
              </button>
              <button className="btn btn-danger" onClick={handleStartNew}>
                重新开始
              </button>
              <button className="btn" onClick={() => {
                setShowExistingDialog(false);
                setInputValue('');
              }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 获取阶段顺序的辅助函数
function getPhaseOrder(questionId: string): string[] {
  const config = getQuestionConfig(questionId);
  if (!config) return ['values_narrative', 'summary'];

  const order: string[] = [];
  if (config.hasOpening) order.push('opening');
  if (config.hasValuesNarrative) order.push('values_narrative');
  if (config.specialMode === 'values_validation') order.push('values_validation');
  if (config.hasDeepExploration) order.push('deep_exploration');
  if (config.hasGROW) order.push('grow');
  order.push('summary');

  return order;
}

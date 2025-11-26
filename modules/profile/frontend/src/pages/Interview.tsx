/**
 * Interview Page
 * 深度访谈页面 - Phase 2
 * 五阶段访谈：开场破冰 → 叙事探索 → GROW结构化 → 价值澄清 → 总结确认
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PipBoyPanel, PipBoyButton, PipBoyBadge, PipBoySpinner } from '@packages/pip-boy-theme';
import { PHASES, API_BASE_URL, STORAGE_KEYS } from '../constants';
import type { InterviewSession, Message, InterviewPhase } from '../types';

export function Interview() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [currentPhase, setCurrentPhase] = useState<InterviewPhase>('opening');
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // 加载下一个待访谈的会话
  useEffect(() => {
    loadNextSession();
  }, []);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  const loadNextSession = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/next-session?user_id=default_user`);
      const data = await response.json();

      if (data.has_next) {
        setCurrentSession(data.session);
        setConversationHistory(data.session.conversation_history || []);

        // 恢复阶段状态
        if (data.session.phases_completed && data.session.phases_completed.length > 0) {
          const lastPhase = data.session.phases_completed[data.session.phases_completed.length - 1] as InterviewPhase;
          setCurrentPhase(PHASES[lastPhase].next || 'narrative');
        } else {
          // 开始开场破冰
          startOpeningPhase();
        }

        console.log('✅ 会话加载成功:', data.session.session_id);
      } else {
        setStatusMessage('所有问题已完成！即将跳转到审批页面...');
        setTimeout(() => {
          navigate('/approval');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ 加载会话失败:', error);
      setStatusMessage(`加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const startOpeningPhase = () => {
    setCurrentPhase('opening');
    const openingQuestions = [
      '在我们开始之前，您希望我怎样称呼您？',
      '您现在心情如何？有什么想先聊的吗？',
      '您对这次对话有什么期待吗？'
    ];
    const randomQuestion = openingQuestions[Math.floor(Math.random() * openingQuestions.length)];

    addMessage('ai', randomQuestion);
  };

  const addMessage = (role: 'ai' | 'user', content: string) => {
    const newMessage: Message = {
      role,
      content,
      timestamp: new Date().toISOString()
    };
    setConversationHistory(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !currentSession) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage('');

    // 添加用户消息
    addMessage('user', userMessage);

    setLoading(true);

    try {
      // 调用 API 生成追问
      const response = await fetch(`${API_BASE_URL}/generate-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.session_id,
          user_answer: userMessage,
          current_phase: currentPhase
        })
      });

      const result = await response.json();

      if (result.success) {
        // 添加 AI 追问
        addMessage('ai', result.followup_question);
      } else {
        setStatusMessage(`生成追问失败: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ 生成追问失败:', error);
      setStatusMessage(`生成追问失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEndPhase = async () => {
    if (!currentSession) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/end-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.session_id,
          phase: currentPhase
        })
      });

      const result = await response.json();

      if (result.success) {
        const nextPhase = PHASES[currentPhase].next;

        if (nextPhase) {
          setCurrentPhase(nextPhase);
          addMessage('ai', `好的，我们进入下一个阶段：${PHASES[nextPhase].name}`);
        } else {
          // 所有阶段完成，生成总结
          await generateSummary();
        }
      } else {
        setStatusMessage(`结束阶段失败: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ 结束阶段失败:', error);
      setStatusMessage(`结束阶段失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!currentSession) return;

    setLoading(true);
    setStatusMessage('正在生成分析总结...');

    try {
      const response = await fetch(`${API_BASE_URL}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.session_id
        })
      });

      const result = await response.json();

      if (result.success) {
        // 保存总结数据到本地存储
        localStorage.setItem(STORAGE_KEYS.CURRENT_SUMMARY, JSON.stringify(result.summary));
        localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, currentSession.session_id);

        setStatusMessage('分析总结生成成功！即将跳转到审批页面...');

        setTimeout(() => {
          navigate('/approval');
        }, 2000);
      } else {
        setStatusMessage(`生成总结失败: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ 生成总结失败:', error);
      setStatusMessage(`生成总结失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const isPhaseCompleted = (phase: InterviewPhase): boolean => {
    if (!currentSession) return false;
    return currentSession.phases_completed?.includes(phase) || false;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading && !currentSession) {
    return (
      <div className="h-screen flex items-center justify-center">
        <PipBoySpinner />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="text-center py-4 border-b-2 border-pip-green-dim">
        <h1
          className="text-2xl font-bold text-pip-green"
          style={{
            textShadow: '0 0 10px rgba(74, 246, 38, 0.8), 0 0 20px rgba(74, 246, 38, 0.5)',
          }}
        >
          ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM
        </h1>
        <p className="text-pip-green-dim text-sm mt-1">
          COPYRIGHT 2075-2077 ROBCO INDUSTRIES
        </p>
        <p className="text-pip-green text-sm">-DEEP INTERVIEW SESSION-</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-h-0 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Phase Indicator */}
          <div className="mb-6 p-4 bg-black border-2 border-pip-green flex justify-between">
            {Object.entries(PHASES).map(([key, phase], idx) => (
              <div
                key={key}
                className={`flex-1 text-center ${
                  currentPhase === key
                    ? 'text-pip-green-bright'
                    : isPhaseCompleted(key as InterviewPhase)
                    ? 'text-pip-green'
                    : 'text-pip-green-dim'
                }`}
              >
                <div className="font-bold">{phase.name}</div>
                <div className="text-xs">{phase.duration}分钟</div>
                {idx < Object.keys(PHASES).length - 1 && (
                  <span className="text-pip-green-dim mx-2">→</span>
                )}
              </div>
            ))}
          </div>

          {/* Session Info */}
          {currentSession && (
            <div className="mb-4 p-3 bg-black border border-pip-green flex justify-between items-center">
              <div className="flex-1 text-sm text-pip-green-dim truncate mr-4">
                问题: {currentSession.question_text.substring(0, 80)}...
              </div>
              <PipBoyBadge variant="success">
                {PHASES[currentPhase].name}
              </PipBoyBadge>
            </div>
          )}

          {/* Conversation History */}
          <PipBoyPanel className="h-[400px] overflow-y-auto mb-4 p-4">
            {conversationHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-4 p-3 rounded ${
                  msg.role === 'ai'
                    ? 'bg-pip-green/5 border-l-2 border-pip-green'
                    : 'bg-pip-green/10 border-l-2 border-pip-green-bright'
                }`}
                style={{ animation: 'fadeIn 0.5s' }}
              >
                <div className="font-bold text-pip-green mb-1">
                  {msg.role === 'ai' ? 'AI 访谈员' : '您'}
                </div>
                <div className="text-pip-green-bright leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
                <div className="text-xs text-pip-green-dim mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </PipBoyPanel>

          {/* Input Area */}
          <div className="mb-4">
            <textarea
              className="w-full h-24 bg-black/50 border border-pip-green text-pip-green-bright font-mono p-3 resize-none focus:outline-none focus:shadow-pip-glow"
              placeholder="输入您的回答... (Enter 发送, Shift+Enter 换行)"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-4">
            <PipBoyButton
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || loading}
              loading={loading}
            >
              发送回答
            </PipBoyButton>

            <PipBoyButton
              variant="primary"
              onClick={handleEndPhase}
              disabled={loading}
            >
              结束当前阶段
            </PipBoyButton>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="mt-4 text-center p-3 border border-pip-green bg-pip-green/10 text-pip-green-bright">
              {statusMessage}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-2 px-4 border-t-2 border-pip-green-dim text-center text-sm text-pip-green-dim">
        当前阶段: {PHASES[currentPhase].name} |
        <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">Enter</kbd> 发送 |
        <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">Shift+Enter</kbd> 换行
      </footer>
    </div>
  );
}

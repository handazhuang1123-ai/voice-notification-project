/**
 * Questionnaire Page
 * 基础问卷页面 - Phase 1
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PipBoyPanel, PipBoyButton } from '@packages/pip-boy-theme';
import { QUESTIONS, API_BASE_URL, STORAGE_KEYS, MIN_ANSWER_LENGTH, AUTO_SAVE_INTERVAL } from '../constants';
import type { Answer } from '../types';

export function Questionnaire() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');

  const currentQuestion = QUESTIONS[currentIndex];
  const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;
  const isLastQuestion = currentIndex === QUESTIONS.length - 1;

  // 加载本地存储的答案
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.QUESTIONNAIRE_ANSWERS);
    if (saved) {
      try {
        const parsedAnswers = JSON.parse(saved);
        setAnswers(parsedAnswers);
        setCurrentAnswer(parsedAnswers[currentQuestion.id] || '');
        console.log('✅ 已恢复本地存储的答案');
      } catch (e) {
        console.error('❌ 无法解析本地存储的答案');
      }
    }
  }, []);

  // 当问题切换时，恢复对应的答案
  useEffect(() => {
    setCurrentAnswer(answers[currentQuestion.id] || '');
  }, [currentIndex, currentQuestion.id, answers]);

  // 自动保存
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft();
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [answers]);

  // 保存当前答案
  const saveCurrentAnswer = useCallback(() => {
    if (currentAnswer.trim()) {
      const newAnswers = { ...answers, [currentQuestion.id]: currentAnswer.trim() };
      setAnswers(newAnswers);
      localStorage.setItem(STORAGE_KEYS.QUESTIONNAIRE_ANSWERS, JSON.stringify(newAnswers));
      localStorage.setItem(STORAGE_KEYS.QUESTIONNAIRE_TIMESTAMP, new Date().toISOString());
    }
  }, [currentAnswer, currentQuestion.id, answers]);

  // 保存草稿
  const saveDraft = useCallback(() => {
    saveCurrentAnswer();
    showStatus('草稿已保存', 'success');
  }, [saveCurrentAnswer]);

  // 显示状态消息
  const showStatus = (message: string, type: 'success' | 'error') => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // 验证当前答案
  const validateCurrentAnswer = (): boolean => {
    return currentAnswer.trim().length >= MIN_ANSWER_LENGTH;
  };

  // 上一题
  const handlePrev = () => {
    saveCurrentAnswer();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // 下一题
  const handleNext = () => {
    saveCurrentAnswer();

    if (!validateCurrentAnswer()) {
      showStatus(`请输入至少${MIN_ANSWER_LENGTH}个字的回答`, 'error');
      return;
    }

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // 提交问卷
  const handleSubmit = async () => {
    saveCurrentAnswer();

    // 验证所有答案
    const missing: number[] = [];
    QUESTIONS.forEach((q, idx) => {
      const answer = answers[q.id];
      if (!answer || answer.trim().length < MIN_ANSWER_LENGTH) {
        missing.push(idx + 1);
      }
    });

    if (missing.length > 0) {
      showStatus(`请完成所有问题的回答。未完成的问题: ${missing.join(', ')}`, 'error');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        user_id: 'default_user',
        answers: QUESTIONS.map(q => ({
          question_id: q.id,
          initial_answer: answers[q.id]
        } as Answer))
      };

      const response = await fetch(`${API_BASE_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();

      if (result.success) {
        showStatus('问卷提交成功！即将进入深度访谈...', 'success');

        // 清除本地存储
        localStorage.removeItem(STORAGE_KEYS.QUESTIONNAIRE_ANSWERS);
        localStorage.removeItem(STORAGE_KEYS.QUESTIONNAIRE_TIMESTAMP);

        // 保存会话信息
        if (result.sessions) {
          localStorage.setItem(STORAGE_KEYS.INTERVIEW_SESSIONS, JSON.stringify(result.sessions));
        }

        // 跳转到访谈页面
        setTimeout(() => {
          navigate('/interview');
        }, 2000);
      } else {
        showStatus(`提交失败: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('❌ 提交失败:', error);
      showStatus(`提交失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 保存草稿
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveDraft();
      }
      // Alt+左箭头 上一题
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
      // Alt+右箭头 下一题
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
      // Ctrl+Enter 提交（最后一题）
      if (e.ctrlKey && e.key === 'Enter' && isLastQuestion) {
        e.preventDefault();
        handleSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentAnswer, isLastQuestion]);

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
        <p className="text-pip-green text-sm">-PERSONAL PROFILE QUESTIONNAIRE-</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-h-0 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Question Panel */}
          <PipBoyPanel className="min-h-[500px] p-8 mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-pip-green mb-2">
                问题 {currentIndex + 1}/{QUESTIONS.length}
              </h2>
              <p className="text-pip-green-bright text-lg leading-relaxed">
                {currentQuestion.text}
              </p>
            </div>

            <textarea
              className="w-full min-h-[300px] bg-black/50 border border-pip-green text-pip-green-bright font-mono p-4 resize-y focus:outline-none focus:shadow-pip-glow"
              placeholder="请输入您的回答..."
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              autoFocus
            />

            <div className="mt-4 text-sm text-pip-green-dim">
              当前字数: {currentAnswer.length} 字
              {currentAnswer.length < MIN_ANSWER_LENGTH && (
                <span className="text-pip-amber ml-2">
                  (至少需要 {MIN_ANSWER_LENGTH} 字)
                </span>
              )}
            </div>
          </PipBoyPanel>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full h-6 bg-black border-2 border-pip-green relative">
              <div
                className="h-full bg-pip-green transition-all duration-500"
                style={{ width: `${progress}%`, boxShadow: '0 0 10px rgba(74, 246, 38, 0.5)' }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-black font-bold">
                {currentIndex + 1}/{QUESTIONS.length}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between gap-4 mb-4">
            <PipBoyButton
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              ◀ 上一题
            </PipBoyButton>

            <PipBoyButton onClick={saveDraft}>
              💾 保存草稿
            </PipBoyButton>

            {!isLastQuestion ? (
              <PipBoyButton onClick={handleNext}>
                下一题 ▶
              </PipBoyButton>
            ) : (
              <PipBoyButton
                variant="primary"
                onClick={handleSubmit}
                loading={loading}
              >
                提交问卷并进入深度访谈
              </PipBoyButton>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`text-center p-3 border ${
                statusType === 'success'
                  ? 'bg-pip-green/10 border-pip-green text-pip-green-bright'
                  : 'bg-red-900/10 border-red-600 text-red-400'
              }`}
            >
              {statusMessage}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-2 px-4 border-t-2 border-pip-green-dim text-center text-sm text-pip-green-dim">
        <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">Alt+←</kbd> 上一题 |
        <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">Alt+→</kbd> 下一题 |
        <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">Ctrl+S</kbd> 保存
      </footer>
    </div>
  );
}

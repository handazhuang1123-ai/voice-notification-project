/**
 * Questionnaire Page (迭代模式)
 * 基础问卷页面 - 单题提交模式
 * 每题回答完成后立即进入访谈环节
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PipBoyPanel, PipBoyButton } from '@packages/pip-boy-theme';
import {
  QUESTIONS,
  API_BASE_URL,
  STORAGE_KEYS,
  MIN_ANSWER_LENGTH,
  getNextUncompletedQuestionIndex,
  getCompletedQuestionsCount
} from '../constants';

export function Questionnaire() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [allCompleted, setAllCompleted] = useState(false);

  // 页面加载时，获取下一个未完成的问题
  useEffect(() => {
    const nextIndex = getNextUncompletedQuestionIndex();

    if (nextIndex === -1) {
      // 所有问题已完成
      setAllCompleted(true);
      console.log('✅ 所有问题已完成！');
    } else {
      setCurrentIndex(nextIndex);

      // 尝试恢复草稿
      const saved = localStorage.getItem(STORAGE_KEYS.QUESTIONNAIRE_ANSWERS);
      if (saved) {
        try {
          const parsedAnswers = JSON.parse(saved);
          const questionId = QUESTIONS[nextIndex].id;
          setCurrentAnswer(parsedAnswers[questionId] || '');
          console.log(`✅ 加载问题 ${nextIndex + 1}/${QUESTIONS.length}`);
        } catch (e) {
          console.error('❌ 无法解析本地存储的答案');
        }
      }
    }
  }, []);

  const currentQuestion = currentIndex >= 0 ? QUESTIONS[currentIndex] : null;
  const completedCount = getCompletedQuestionsCount();
  const totalCount = QUESTIONS.length;

  // 保存草稿
  const saveDraft = useCallback(() => {
    if (currentAnswer.trim() && currentQuestion) {
      const saved = localStorage.getItem(STORAGE_KEYS.QUESTIONNAIRE_ANSWERS);
      let answers: Record<string, string> = {};

      if (saved) {
        try {
          answers = JSON.parse(saved);
        } catch {
          answers = {};
        }
      }

      answers[currentQuestion.id] = currentAnswer.trim();
      localStorage.setItem(STORAGE_KEYS.QUESTIONNAIRE_ANSWERS, JSON.stringify(answers));
      localStorage.setItem(STORAGE_KEYS.QUESTIONNAIRE_TIMESTAMP, new Date().toISOString());

      showStatus('草稿已保存', 'success');
    }
  }, [currentAnswer, currentQuestion]);

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

  // 提交当前问题并开始访谈
  const handleSubmitAndInterview = async () => {
    if (!currentQuestion) return;

    if (!validateCurrentAnswer()) {
      showStatus(`请输入至少${MIN_ANSWER_LENGTH}个字的回答`, 'error');
      return;
    }

    setLoading(true);
    setStatusMessage('正在提交问题...');

    try {
      // 调用后端 API 提交单个问题
      const response = await fetch(`${API_BASE_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'default_user',
          answers: [{
            question_id: currentQuestion.id,
            initial_answer: currentAnswer.trim()
          }]
        })
      });

      const result = await response.json();

      if (result.success && result.sessions && result.sessions.length > 0) {
        const sessionId = result.sessions[0].session_id;

        showStatus('问题已提交，即将进入访谈...', 'success');

        // 清除当前问题的草稿
        const saved = localStorage.getItem(STORAGE_KEYS.QUESTIONNAIRE_ANSWERS);
        if (saved) {
          try {
            const answers = JSON.parse(saved);
            delete answers[currentQuestion.id];
            localStorage.setItem(STORAGE_KEYS.QUESTIONNAIRE_ANSWERS, JSON.stringify(answers));
          } catch {
            // ignore
          }
        }

        // 跳转到访谈页面
        setTimeout(() => {
          navigate(`/interview?session_id=${sessionId}`);
        }, 1500);
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

  // 重置所有进度（用于测试）
  const handleResetProgress = () => {
    if (confirm('确定要重置所有进度吗？这将清除所有已完成的问题和草稿。')) {
      localStorage.removeItem(STORAGE_KEYS.COMPLETED_QUESTIONS);
      localStorage.removeItem(STORAGE_KEYS.QUESTIONNAIRE_ANSWERS);
      localStorage.removeItem(STORAGE_KEYS.QUESTIONNAIRE_TIMESTAMP);
      window.location.reload();
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
      // Ctrl+Enter 提交
      if (e.ctrlKey && e.key === 'Enter' && !allCompleted) {
        e.preventDefault();
        handleSubmitAndInterview();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentAnswer, allCompleted, saveDraft, handleSubmitAndInterview]);

  // 所有问题已完成页面
  if (allCompleted) {
    return (
      <div className="h-screen flex flex-col">
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

        <main className="flex-1 flex items-center justify-center p-6">
          <PipBoyPanel className="max-w-2xl w-full p-12 text-center">
            <div className="text-6xl mb-6">✓</div>
            <h2 className="text-3xl font-bold text-pip-green-bright mb-4">
              恭喜！所有问题已完成
            </h2>
            <p className="text-pip-green text-lg mb-8">
              您已经完成了全部 {totalCount} 个问题的问卷填写和访谈。
            </p>
            <p className="text-pip-green-dim mb-8">
              您的个人画像正在后台处理中...
            </p>
            <PipBoyButton onClick={handleResetProgress} variant="danger">
              重置所有进度（仅用于测试）
            </PipBoyButton>
          </PipBoyPanel>
        </main>

        <footer className="py-2 px-4 border-t-2 border-pip-green-dim text-center text-sm text-pip-green-dim">
          Phase 1: 问卷已完成 | 感谢您的参与
        </footer>
      </div>
    );
  }

  // 加载中
  if (currentIndex === -1 || !currentQuestion) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-pip-green text-xl">加载中...</div>
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
        <p className="text-pip-green text-sm">-PERSONAL PROFILE QUESTIONNAIRE-</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-h-0 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Progress Info */}
          <div className="mb-4 p-4 bg-black border border-pip-green flex justify-between items-center">
            <div className="text-pip-green">
              <span className="font-bold">进度：</span>
              第 {currentIndex + 1} / {totalCount} 题
            </div>
            <div className="text-pip-green-dim text-sm">
              已完成：{completedCount} 题
            </div>
          </div>

          {/* Question Panel */}
          <PipBoyPanel className="min-h-[500px] p-8 mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-pip-green mb-2">
                问题 {currentIndex + 1}/{totalCount}
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

          {/* Buttons */}
          <div className="flex justify-between gap-4 mb-4">
            <PipBoyButton onClick={saveDraft} disabled={!currentAnswer.trim()}>
              💾 保存草稿
            </PipBoyButton>

            <PipBoyButton
              variant="primary"
              onClick={handleSubmitAndInterview}
              loading={loading}
            >
              提交并开始访谈 →
            </PipBoyButton>
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
        <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">Ctrl+S</kbd> 保存 |
        <kbd className="bg-pip-green/20 px-2 py-0.5 border border-pip-green mx-1">Ctrl+Enter</kbd> 提交
      </footer>
    </div>
  );
}

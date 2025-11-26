/**
 * Approval Page
 * 洞察审批页面 - Phase 3
 * 用户审核和认可 AI 分析结果
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PipBoyPanel, PipBoyButton, PipBoyBadge } from '@packages/pip-boy-theme';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import type { AnalysisSummary, Insight, InsightLayer } from '../types';

type InsightStatus = 'pending' | 'approved' | 'modified' | 'rejected';

export function Approval() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [modifiedInsights, setModifiedInsights] = useState<Record<string, string>>({});
  const [insightStatuses, setInsightStatuses] = useState<Record<string, InsightStatus>>({});
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    loadSummaryData();
  }, []);

  const loadSummaryData = () => {
    const summaryData = localStorage.getItem(STORAGE_KEYS.CURRENT_SUMMARY);
    const currentSessionId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);

    if (summaryData && currentSessionId) {
      try {
        const parsedSummary = JSON.parse(summaryData);
        setSummary(parsedSummary);
        setSessionId(currentSessionId);

        // 初始化所有洞察状态为 pending
        const initialStatuses: Record<string, InsightStatus> = {};
        parsedSummary.insights?.forEach((insight: Insight) => {
          initialStatuses[insight.id] = 'pending';
        });
        setInsightStatuses(initialStatuses);

        console.log('✅ 分析数据加载成功');
      } catch (error) {
        console.error('❌ 解析分析数据失败:', error);
        alert('分析数据格式错误，请重新生成');
        navigate('/interview');
      }
    } else {
      alert('没有找到分析数据，请先完成访谈');
      navigate('/interview');
    }
  };

  const handleApprove = (insightId: string) => {
    setInsightStatuses(prev => ({ ...prev, [insightId]: 'approved' }));
  };

  const handleModify = (insightId: string, newContent: string) => {
    setModifiedInsights(prev => ({ ...prev, [insightId]: newContent }));
    setInsightStatuses(prev => ({ ...prev, [insightId]: 'modified' }));
  };

  const handleReject = (insightId: string) => {
    setInsightStatuses(prev => ({ ...prev, [insightId]: 'rejected' }));
  };

  const handleSubmitApproval = async () => {
    if (!summary || !sessionId) return;

    setLoading(true);
    setStatusMessage('正在提交审批结果...');

    try {
      const approvalData = {
        session_id: sessionId,
        insights: summary.insights.map(insight => ({
          insight_id: insight.id,
          status: insightStatuses[insight.id] || 'pending',
          modified_content: modifiedInsights[insight.id] || insight.content
        }))
      };

      const response = await fetch(`${API_BASE_URL}/approve-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approvalData)
      });

      const result = await response.json();

      if (result.success) {
        setStatusMessage('审批提交成功！个人画像已生成。');

        // 清除本地存储
        localStorage.removeItem(STORAGE_KEYS.CURRENT_SUMMARY);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID);

        setTimeout(() => {
          // 可以跳转到查看完整画像的页面，或返回首页
          navigate('/questionnaire');
        }, 3000);
      } else {
        setStatusMessage(`提交失败: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ 提交审批失败:', error);
      setStatusMessage(`提交失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const getLayerName = (layer: InsightLayer): string => {
    const names = {
      fact: '事实层',
      interpretation: '解释层',
      insight: '洞察层'
    };
    return names[layer];
  };

  const getLayerColor = (layer: InsightLayer): string => {
    const colors = {
      fact: 'border-pip-green-dim',
      interpretation: 'border-pip-green',
      insight: 'border-pip-green-bright'
    };
    return colors[layer];
  };

  const getStatusBadge = (status: InsightStatus) => {
    const variants: Record<InsightStatus, 'success' | 'warning' | 'error' | 'info'> = {
      pending: 'info',
      approved: 'success',
      modified: 'warning',
      rejected: 'error'
    };
    const labels = {
      pending: '待审核',
      approved: '已认可',
      modified: '已修改',
      rejected: '已拒绝'
    };
    return <PipBoyBadge variant={variants[status]}>{labels[status]}</PipBoyBadge>;
  };

  if (!summary) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-pip-green text-xl">加载中...</div>
      </div>
    );
  }

  const insightsByLayer = {
    fact: summary.insights?.filter(i => i.layer === 'fact') || [],
    interpretation: summary.insights?.filter(i => i.layer === 'interpretation') || [],
    insight: summary.insights?.filter(i => i.layer === 'insight') || []
  };

  const stats = {
    totalInsights: summary.insights?.length || 0,
    values: summary.core_values?.length || 0,
    goals: summary.goals?.length || 0,
    patterns: summary.behavioral_patterns?.length || 0,
    approved: Object.values(insightStatuses).filter(s => s === 'approved').length,
    modified: Object.values(insightStatuses).filter(s => s === 'modified').length,
    rejected: Object.values(insightStatuses).filter(s => s === 'rejected').length
  };

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
        <p className="text-pip-green text-sm">-INSIGHT APPROVAL SYSTEM-</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-h-0 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Summary Overview */}
          <PipBoyPanel className="mb-6 p-6">
            <h2 className="text-xl font-bold text-pip-green-bright mb-4">分析总结概览</h2>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-pip-green">{stats.totalInsights}</div>
                <div className="text-sm text-pip-green-dim">总洞察数</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pip-green">{stats.values}</div>
                <div className="text-sm text-pip-green-dim">核心价值观</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pip-green">{stats.goals}</div>
                <div className="text-sm text-pip-green-dim">目标</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pip-green">{stats.patterns}</div>
                <div className="text-sm text-pip-green-dim">行为模式</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-pip-green-dim grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-pip-green">{stats.approved}</div>
                <div className="text-xs text-pip-green-dim">已认可</div>
              </div>
              <div>
                <div className="text-lg font-bold text-pip-amber">{stats.modified}</div>
                <div className="text-xs text-pip-green-dim">已修改</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-400">{stats.rejected}</div>
                <div className="text-xs text-pip-green-dim">已拒绝</div>
              </div>
            </div>
          </PipBoyPanel>

          {/* Core Values */}
          {summary.core_values && summary.core_values.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-pip-green mb-3">核心价值观</h3>
              <div className="grid grid-cols-3 gap-4">
                {summary.core_values.map((value, idx) => (
                  <PipBoyPanel key={idx} className="p-4">
                    <div className="font-bold text-pip-green-bright mb-2">{value.value}</div>
                    <div className="text-sm text-pip-green-dim">{value.description}</div>
                  </PipBoyPanel>
                ))}
              </div>
            </div>
          )}

          {/* Three-Layer Insights */}
          {(['fact', 'interpretation', 'insight'] as InsightLayer[]).map(layer => (
            insightsByLayer[layer].length > 0 && (
              <div key={layer} className="mb-6">
                <h3 className="text-lg font-bold text-pip-green mb-3 pb-2 border-b border-pip-green-dim">
                  {getLayerName(layer)}
                  <span className="ml-3 text-sm text-pip-green-dim">
                    ({insightsByLayer[layer].length} 条)
                  </span>
                </h3>

                {insightsByLayer[layer].map(insight => (
                  <PipBoyPanel
                    key={insight.id}
                    className={`mb-4 p-4 border-l-4 ${getLayerColor(layer)}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        {insightStatuses[insight.id] === 'modified' ? (
                          <textarea
                            className="w-full bg-black/50 border border-pip-green text-pip-green-bright font-mono p-2 resize-y focus:outline-none"
                            value={modifiedInsights[insight.id] || insight.content}
                            onChange={(e) => handleModify(insight.id, e.target.value)}
                          />
                        ) : (
                          <div className="text-pip-green-bright leading-relaxed">
                            {insight.content}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {getStatusBadge(insightStatuses[insight.id] || 'pending')}
                      </div>
                    </div>

                    {insight.evidence && insight.evidence.length > 0 && (
                      <div className="mt-2 text-sm text-pip-green-dim">
                        <div className="font-bold mb-1">证据:</div>
                        <ul className="list-disc list-inside">
                          {insight.evidence.slice(0, 2).map((ev, idx) => (
                            <li key={idx}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <PipBoyButton
                        variant="primary"
                        onClick={() => handleApprove(insight.id)}
                        disabled={insightStatuses[insight.id] === 'approved'}
                      >
                        ✓ 认可
                      </PipBoyButton>
                      <PipBoyButton
                        onClick={() => {
                          if (insightStatuses[insight.id] !== 'modified') {
                            setModifiedInsights(prev => ({ ...prev, [insight.id]: insight.content }));
                            setInsightStatuses(prev => ({ ...prev, [insight.id]: 'modified' }));
                          }
                        }}
                      >
                        ✎ 修改
                      </PipBoyButton>
                      <PipBoyButton
                        variant="danger"
                        onClick={() => handleReject(insight.id)}
                        disabled={insightStatuses[insight.id] === 'rejected'}
                      >
                        ✗ 拒绝
                      </PipBoyButton>
                    </div>
                  </PipBoyPanel>
                ))}
              </div>
            )
          ))}

          {/* Submit Button */}
          <div className="mt-8 text-center">
            <PipBoyButton
              variant="primary"
              onClick={handleSubmitApproval}
              loading={loading}
              className="px-12 py-3 text-lg"
            >
              提交审批并生成最终画像
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
        Phase 3: 洞察审批 | 请仔细审核每条洞察，确保准确反映您的个人画像
      </footer>
    </div>
  );
}

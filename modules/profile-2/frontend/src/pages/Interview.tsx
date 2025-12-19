/**
 * 访谈对话页面 - 固定 frame 边框
 * 光标紧跟输入文字
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

// 阶段英文名称
const PHASE_NAMES_EN: Record<string, string> = {
    'opening': 'OPENING',
    'values_narrative': 'VALUES NARRATIVE',
    'deep_exploration': 'DEEP EXPLORATION',
    'grow': 'GROW',
    'values_validation': 'VALUES VALIDATION',
    'summary': 'SUMMARY'
};

interface SessionState {
    sessionId: string | null;
    phase: string;
    phaseIndex: number;
    totalPhases: number;
    progressPercent: number;
    turnNumber: number;
}

interface SummaryState {
    isGenerating: boolean;
    content: string;
    showConfirm: boolean;
    isApproving: boolean;
}

export default function Interview() {
    const { questionId } = useParams<{ questionId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const questionOrder = (location.state as { questionOrder?: number })?.questionOrder || 1;

    const [currentAiMessage, setCurrentAiMessage] = useState('');
    const [currentUserInput, setCurrentUserInput] = useState('');
    const [displayedAiText, setDisplayedAiText] = useState('');

    const [systemLogs, setSystemLogs] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [sessionState, setSessionState] = useState<SessionState>({
        sessionId: null,
        phase: 'opening',
        phaseIndex: 0,
        totalPhases: 5,
        progressPercent: 0,
        turnNumber: 0,
    });
    const [showExistingDialog, setShowExistingDialog] = useState(false);
    const [existingSession, setExistingSession] = useState<{
        session_id: string;
        total_turns: number;
        started_at: string;
    } | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [pendingInitialAnswer, setPendingInitialAnswer] = useState('');

    const [summaryState, setSummaryState] = useState<SummaryState>({
        isGenerating: false,
        content: '',
        showConfirm: false,
        isApproving: false,
    });

    const contentRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const question = questionId ? QUESTIONS.find((q) => q.id === questionId) : null;

    // 添加系统日志
    const addSystemLog = useCallback((text: string) => {
        setSystemLogs((prev) => [...prev.slice(-4), text]);
    }, []);

    // 流式显示 AI 回复
    const typeAiMessage = useCallback(async (text: string) => {
        setDisplayedAiText('');
        for (let i = 0; i <= text.length; i++) {
            await new Promise((r) => setTimeout(r, 8));
            setDisplayedAiText(text.slice(0, i));
        }
    }, []);

    useEffect(() => {
        if (!loading && inputRef.current) {
            inputRef.current.focus();
        }
    }, [loading, currentAiMessage]);

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [displayedAiText, systemLogs, currentUserInput]);

    // ESC 返回
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !showExistingDialog) {
                navigate('/');
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [navigate, showExistingDialog]);

    if (!question || !questionId) {
        return (
            <div className="terminal-frame pip-text">
                <div className="terminal-header">
                    <div className="terminal-header-row">
                        <span>ERROR</span>
                    </div>
                </div>
                <div className="terminal-body">
                    <div className="empty-state">QUESTION NOT FOUND</div>
                </div>
            </div>
        );
    }

    const handleInitialSubmit = async () => {
        if (!currentUserInput.trim() || !questionId) return;

        const initialAnswer = currentUserInput.trim();
        setCurrentUserInput('');
        setLoading(true);
        addSystemLog('[SYSTEM] Session initialized');

        try {
            const result = await api.startSession({
                userId: USER_ID,
                questionId,
                questionOrder,
                initialAnswer,
            });

            if (result.action === 'existing_found' && result.session) {
                setExistingSession({
                    session_id: result.session.session_id,
                    total_turns: result.session.total_turns || 0,
                    started_at: result.session.started_at || '',
                });
                setShowExistingDialog(true);
                setPendingInitialAnswer(initialAnswer);
            } else if (result.session) {
                addSystemLog(`[SYSTEM] Phase: ${PHASE_NAMES_EN[result.session.current_phase] || result.session.current_phase}`);

                setSessionState({
                    sessionId: result.session.session_id,
                    phase: result.session.current_phase,
                    phaseIndex: 0,
                    totalPhases: result.session.phase_order?.length || 5,
                    progressPercent: 0,
                    turnNumber: 1,
                });

                const response = await api.sendMessage(result.session.session_id, initialAnswer);

                setCurrentAiMessage(response.response);
                await typeAiMessage(response.response);

                setSessionState((prev) => ({
                    ...prev,
                    phase: response.phase,
                    phaseIndex: response.progress.phase_index,
                    progressPercent: response.progress.progress_percent,
                    turnNumber: response.turn_number,
                }));
            }
        } catch (error) {
            console.error('Start session failed:', error);
            addSystemLog(`[ERROR] ${error instanceof Error ? error.message : 'Failed to start'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleContinueExisting = async () => {
        if (!existingSession) return;

        setShowExistingDialog(false);
        setLoading(true);
        addSystemLog('[SYSTEM] Resuming session...');

        try {
            const sessionData = await api.getSession(existingSession.session_id);

            setSessionState({
                sessionId: existingSession.session_id,
                phase: sessionData.session.current_phase,
                phaseIndex: sessionData.session.progress.phase_index,
                totalPhases: sessionData.session.progress.total_phases,
                progressPercent: sessionData.session.progress.progress_percent,
                turnNumber: sessionData.session.turns.length,
            });

            addSystemLog(`[SYSTEM] Phase: ${PHASE_NAMES_EN[sessionData.session.current_phase] || sessionData.session.current_phase}`);

            const lastTurn = sessionData.session.turns[sessionData.session.turns.length - 1];
            if (lastTurn) {
                setCurrentAiMessage(lastTurn.ai_message);
                await typeAiMessage(lastTurn.ai_message);
            }

            setPendingInitialAnswer('');
            if (sessionData.session.status === 'completed') {
                setIsCompleted(true);
            }
        } catch (error) {
            console.error('Load session failed:', error);
            addSystemLog('[ERROR] Resume failed');
        } finally {
            setLoading(false);
        }
    };

    const handleStartNew = async () => {
        if (!questionId) return;
        setShowExistingDialog(false);
        setLoading(true);

        const initialAnswer = pendingInitialAnswer;
        addSystemLog('[SYSTEM] Creating new session...');

        try {
            const result = await api.startSession({
                userId: USER_ID,
                questionId,
                questionOrder,
                initialAnswer,
                forceNew: true,
            });

            if (result.session) {
                addSystemLog(`[SYSTEM] Phase: ${PHASE_NAMES_EN[result.session.current_phase] || result.session.current_phase}`);

                setSessionState({
                    sessionId: result.session.session_id,
                    phase: result.session.current_phase,
                    phaseIndex: 0,
                    totalPhases: result.session.phase_order?.length || 5,
                    progressPercent: 0,
                    turnNumber: 1,
                });

                const response = await api.sendMessage(result.session.session_id, initialAnswer);

                setCurrentAiMessage(response.response);
                await typeAiMessage(response.response);

                setSessionState((prev) => ({
                    ...prev,
                    phase: response.phase,
                    phaseIndex: response.progress.phase_index,
                    progressPercent: response.progress.progress_percent,
                    turnNumber: response.turn_number,
                }));
            }
        } catch (error) {
            console.error('Start new session failed:', error);
            addSystemLog('[ERROR] Create failed');
        } finally {
            setLoading(false);
            setPendingInitialAnswer('');
        }
    };

    const handleSendMessage = async () => {
        if (!currentUserInput.trim() || !sessionState.sessionId || loading) return;

        const message = currentUserInput.trim();
        setCurrentUserInput('');
        setDisplayedAiText('');
        setLoading(true);

        try {
            const response = await api.sendMessage(sessionState.sessionId, message);

            if (response.phase_transition) {
                addSystemLog(`[SYSTEM] Phase: ${PHASE_NAMES_EN[response.phase] || response.phase}`);
            }

            setCurrentAiMessage(response.response);
            await typeAiMessage(response.response);

            setSessionState((prev) => ({
                ...prev,
                phase: response.phase,
                phaseIndex: response.progress.phase_index,
                progressPercent: response.progress.progress_percent,
                turnNumber: response.turn_number,
            }));

            if (response.requires_summary) {
                addSystemLog('[SYSTEM] Generating summary...');
                await handleGenerateSummary();
            }
        } catch (error) {
            console.error('Send message failed:', error);
            addSystemLog(`[ERROR] ${error instanceof Error ? error.message : 'Send failed'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSummary = async () => {
        if (!sessionState.sessionId) return;
        setSummaryState((prev) => ({ ...prev, isGenerating: true }));

        try {
            const result = await api.generateSummary(sessionState.sessionId);
            addSystemLog('[SYSTEM] Summary generated');
            setSummaryState({
                isGenerating: false,
                content: result.summary,
                showConfirm: true,
                isApproving: false,
            });
        } catch (error) {
            console.error('Generate summary failed:', error);
            addSystemLog('[ERROR] Summary generation failed');
            setSummaryState((prev) => ({ ...prev, isGenerating: false }));
        }
    };

    const handleApproveSummary = async () => {
        if (!sessionState.sessionId) return;
        setSummaryState((prev) => ({ ...prev, isApproving: true }));

        try {
            await api.approveSummary(sessionState.sessionId);
            addSystemLog('[SYSTEM] Summary approved');
            setSummaryState((prev) => ({ ...prev, showConfirm: false }));
            setIsCompleted(true);
        } catch (error) {
            console.error('Approve summary failed:', error);
            addSystemLog('[ERROR] Approval failed');
        } finally {
            setSummaryState((prev) => ({ ...prev, isApproving: false }));
        }
    };

    const handleRejectSummary = async () => {
        if (!sessionState.sessionId) return;

        try {
            await api.rejectSummary(sessionState.sessionId);
            addSystemLog('[SYSTEM] Summary rejected');
            setSummaryState((prev) => ({ ...prev, showConfirm: false }));
            setIsCompleted(true);
        } catch (error) {
            console.error('Reject summary failed:', error);
            addSystemLog('[ERROR] Rejection failed');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (sessionState.sessionId) {
                handleSendMessage();
            } else {
                handleInitialSubmit();
            }
        }
    };

    // 计算进度条
    const filledBars = Math.round((sessionState.progressPercent / 100) * 5);
    const phaseName = PHASE_NAMES_EN[sessionState.phase] || sessionState.phase.toUpperCase();
    const questionTitle = QUESTION_TITLES_EN[question.id] || (question.title || '').toUpperCase();

    return (
        <div className="terminal-frame pip-text">
            {/* Header */}
            <div className="terminal-header">
                <div className="terminal-header-row">
                    <span>INTERVIEW: {questionTitle}</span>
                    <span>PHASE: {phaseName} #{String(sessionState.turnNumber).padStart(2, '0')}</span>
                </div>
                <div style={{ marginTop: '8px' }}>
                    [<span className="progress-filled">{'■'.repeat(filledBars)}</span>
                    <span className="progress-empty">{'□'.repeat(5 - filledBars)}</span>] {sessionState.progressPercent}%
                </div>
            </div>

            {/* Body */}
            <div className="terminal-body" ref={contentRef}>
                {/* System Logs */}
                {systemLogs.map((log, i) => (
                    <div key={i} className="system-log">{log}</div>
                ))}

                {systemLogs.length > 0 && <div className="divider" />}

                {/* AI Message or Initial Prompt */}
                <div className="ai-message">
                    <span style={{ fontWeight: 'bold' }}>[AI] </span>
                    {!sessionState.sessionId ? (
                        question.prompt
                    ) : (
                        <>
                            {displayedAiText}
                            {loading && !summaryState.isGenerating && <span className="cursor"></span>}
                            {summaryState.isGenerating && <span className="pip-text-dim"> Generating summary...</span>}
                        </>
                    )}
                </div>

                <div className="divider" />

                {/* User Input */}
                {!isCompleted && !summaryState.showConfirm && (
                    <div className="input-line">
                        <span className="input-prompt">&gt;</span>
                        <div className="input-wrapper">
                            <input
                                ref={inputRef}
                                type="text"
                                className="terminal-input"
                                value={currentUserInput}
                                onChange={(e) => setCurrentUserInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={loading || summaryState.isGenerating}
                                placeholder="Enter your response..."
                                style={{ width: currentUserInput ? `${currentUserInput.length + 1}ch` : '200px' }}
                            />
                            {!loading && !summaryState.isGenerating && <span className="cursor"></span>}
                        </div>
                    </div>
                )}

                {/* Summary Confirmation */}
                {summaryState.showConfirm && (
                    <div>
                        <div style={{ marginBottom: '10px' }}>[SUMMARY]</div>
                        <div className="summary-panel">{summaryState.content}</div>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                            <button
                                className="pip-button"
                                onClick={handleApproveSummary}
                                disabled={summaryState.isApproving}
                            >
                                {summaryState.isApproving ? '[...] Processing' : '[Y] Approve'}
                            </button>
                            <button
                                className="pip-button danger"
                                onClick={handleRejectSummary}
                                disabled={summaryState.isApproving}
                            >
                                [N] Reject
                            </button>
                        </div>
                    </div>
                )}

                {/* Completed State */}
                {isCompleted && (
                    <div className="completed-state">
                        <div className="completed-title">[SESSION COMPLETE]</div>
                        <div className="pip-text-dim">Press ESC to return</div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="terminal-footer">
                <div className="terminal-footer-row">
                    <span>[ESC] BACK</span>
                    <span>[ENTER] SEND</span>
                </div>
            </div>

            {/* Existing Session Dialog */}
            {showExistingDialog && existingSession && (
                <div className="modal-overlay">
                    <div className="modal-box pip-text">
                        <div style={{ marginBottom: '20px', color: '#ffcc00' }}>[SESSION FOUND]</div>
                        <div style={{ marginBottom: '15px' }}>
                            <p>Existing session detected</p>
                            <p className="pip-text-dim" style={{ fontSize: '20px' }}>
                                Started: {new Date(existingSession.started_at).toLocaleString()}
                            </p>
                            <p className="pip-text-dim" style={{ fontSize: '20px' }}>
                                Turns: {existingSession.total_turns}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="pip-button" onClick={handleContinueExisting}>[C] Continue</button>
                            <button className="pip-button danger" onClick={handleStartNew}>[N] New</button>
                            <button className="pip-button" onClick={() => {
                                setShowExistingDialog(false);
                                setPendingInitialAnswer('');
                            }}>[X] Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

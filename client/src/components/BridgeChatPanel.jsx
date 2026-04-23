/**
 * BridgeChatPanel
 *
 * "Crew Comms" — Direct communication console with AI crew members.
 * Part of The Bridge (Phase 2b).
 *
 * Features:
 * - Agent selector tabs: DATA (amber) / WORF (red)
 * - Streaming chat via SSE from /api/agent/:id/chat
 * - LCARS-styled message area, input, send button
 * - Context-aware: passes currentView + currentProject
 * - OFFLINE state for unavailable agents
 * - Pulsing PROCESSING indicator during streaming
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const AGENTS = {
  data: {
    id: 'data',
    name: 'DATA',
    fullName: 'LT. CMDR. DATA',
    color: '#cc8800',
    colorDim: 'rgba(204, 136, 0, 0.15)',
    colorBorder: 'rgba(204, 136, 0, 0.4)',
    tagline: 'READY FOR YOUR QUERY, COMMANDER.',
    personality: 'Precise. Analytical. At your service.',
  },
  worf: {
    id: 'worf',
    name: 'WORF',
    fullName: 'LT. CMDR. WORF',
    color: '#aa3333',
    colorDim: 'rgba(170, 51, 51, 0.15)',
    colorBorder: 'rgba(170, 51, 51, 0.4)',
    tagline: 'CHANNEL OPEN. MAKE IT QUICK.',
    personality: 'Terse. Direct. Tactical.',
  },
};

function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

function ChatMessage({ msg, agentConfig }) {
  const isUser = msg.role === 'user';
  const isAgent = msg.role === 'assistant';

  if (isUser) {
    return (
      <div className="chat-msg chat-msg--user">
        <div className="chat-msg__user-label">COMMANDER</div>
        <div className="chat-msg__user-bubble">
          {msg.content}
        </div>
        {msg.ts && (
          <div className="chat-msg__time">{formatTime(msg.ts)}</div>
        )}
      </div>
    );
  }

  if (isAgent) {
    return (
      <div
        className="chat-msg chat-msg--agent"
        style={{ '--agent-chat-color': agentConfig.color }}
      >
        <div
          className="chat-msg__accent-bar"
          style={{ background: agentConfig.color }}
        />
        <div className="chat-msg__agent-body">
          <div
            className="chat-msg__agent-name"
            style={{ color: agentConfig.color }}
          >
            {agentConfig.fullName}
            {msg.mock && (
              <span className="chat-msg__mock-badge">LOCAL MODE</span>
            )}
          </div>
          <div className="chat-msg__agent-text">{msg.content}</div>
          {msg.ts && (
            <div className="chat-msg__time">{formatTime(msg.ts)}</div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function StreamingIndicator({ agentConfig }) {
  return (
    <div
      className="chat-msg chat-msg--agent chat-streaming"
      style={{ '--agent-chat-color': agentConfig.color }}
    >
      <div
        className="chat-msg__accent-bar"
        style={{ background: agentConfig.color }}
      />
      <div className="chat-msg__agent-body">
        <div
          className="chat-msg__agent-name"
          style={{ color: agentConfig.color }}
        >
          {agentConfig.fullName}
        </div>
        <div className="chat-streaming__indicator">
          <span className="chat-streaming__dot" style={{ background: agentConfig.color }} />
          <span className="chat-streaming__dot" style={{ background: agentConfig.color }} />
          <span className="chat-streaming__dot" style={{ background: agentConfig.color }} />
          <span
            className="chat-streaming__label"
            style={{ color: agentConfig.color }}
          >
            PROCESSING
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BridgeChatPanel({ currentView = 'bridge', currentProject = null, agents = [], initialAgent = null, initialContext = null }) {
  const [activeAgent, setActiveAgent] = useState(initialAgent?.name?.toLowerCase() || 'data');
  const [messages, setMessages] = useState({ data: [], worf: [] });
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState({ data: false, worf: false });
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const streamingTextRef = useRef('');
  const abortRef = useRef(null);

  const agentConfig = AGENTS[activeAgent] || AGENTS.data;

  // Determine if the agent is "offline" from roster
  const rosterAgent = agents.find((a) => a.name?.toLowerCase() === activeAgent);
  const isOffline = rosterAgent ? rosterAgent.status?.toLowerCase() !== 'online' : activeAgent === 'worf';

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  // Load history when switching agents
  useEffect(() => {
    if (historyLoaded[activeAgent]) return;

    fetch(`/api/agent/${activeAgent}/history`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length) {
          setMessages((prev) => ({
            ...prev,
            [activeAgent]: data.messages,
          }));
        }
        setHistoryLoaded((prev) => ({ ...prev, [activeAgent]: true }));
      })
      .catch(() => {
        setHistoryLoaded((prev) => ({ ...prev, [activeAgent]: true }));
      });
  }, [activeAgent, historyLoaded]);

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    setError(null);
    setInputValue('');

    const userMsg = {
      role: 'user',
      content: text,
      ts: new Date().toISOString(),
    };

    setMessages((prev) => ({
      ...prev,
      [activeAgent]: [...(prev[activeAgent] || []), userMsg],
    }));

    setIsStreaming(true);
    streamingTextRef.current = '';
    setStreamingText('');

    // Abort any ongoing request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`/api/agent/${activeAgent}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            currentView,
            currentProject: currentProject || initialContext?.activeProject || null,
            currentTask: initialContext?.currentTask || null,
            lastCompleted: initialContext?.lastCompleted || null,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let isDone = false;

      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (separated by double newline)
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          let eventType = null;
          let dataStr = null;

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6).trim();
            }
          }

          if (!dataStr) continue;

          try {
            const evt = JSON.parse(dataStr);
            if (eventType === 'token' || evt.token !== undefined) {
              streamingTextRef.current += evt.token;
              setStreamingText(streamingTextRef.current);
            } else if (eventType === 'done') {
              isDone = true;
            }
          } catch { /* skip malformed */ }
        }
      }

      // Finalize: add agent message to history
      const agentMsg = {
        role: 'assistant',
        content: streamingTextRef.current,
        agentId: activeAgent,
        ts: new Date().toISOString(),
      };

      setMessages((prev) => ({
        ...prev,
        [activeAgent]: [...(prev[activeAgent] || []), agentMsg],
      }));

    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(`Connection error: ${err.message}`);
        // Still add partial text if any
        if (streamingTextRef.current) {
          setMessages((prev) => ({
            ...prev,
            [activeAgent]: [
              ...(prev[activeAgent] || []),
              {
                role: 'assistant',
                content: streamingTextRef.current,
                agentId: activeAgent,
                ts: new Date().toISOString(),
              },
            ],
          }));
        }
      }
    } finally {
      setIsStreaming(false);
      streamingTextRef.current = '';
      setStreamingText('');
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [inputValue, isStreaming, activeAgent, currentView, currentProject]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleAgentSwitch = (agentId) => {
    if (isStreaming) return; // Don't switch mid-stream
    setActiveAgent(agentId);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const currentMessages = messages[activeAgent] || [];
  const isEmpty = currentMessages.length === 0 && !isStreaming;

  return (
    <div className="bridge-chat-panel">
      {/* Panel Header */}
      <div className="bridge-chat-panel__header">
        <div className="bridge-chat-panel__title-row">
          <div
            className="bridge-chat-panel__title-bar"
            style={{ background: agentConfig.color }}
          />
          <div>
            <div
              className="bridge-chat-panel__title"
              style={{ color: agentConfig.color }}
            >
              CREW COMMS
            </div>
            <div className="bridge-chat-panel__subtitle">
              DIRECT CHANNEL — BRIDGE CONSOLE
            </div>
          </div>
        </div>

        {/* Agent Selector Tabs */}
        <div className="bridge-chat-panel__agent-tabs">
          {Object.values(AGENTS).map((agent) => {
            const rAgent = agents.find((a) => a.name?.toLowerCase() === agent.id);
            const agentIsOffline = rAgent ? rAgent.status?.toLowerCase() !== 'online' : agent.id === 'worf';
            const isActive = activeAgent === agent.id;

            return (
              <button
                key={agent.id}
                className={`bridge-chat-panel__agent-tab ${isActive ? 'active' : ''}`}
                style={{
                  '--tab-color': agent.color,
                  '--tab-color-dim': agent.colorDim,
                  '--tab-color-border': agent.colorBorder,
                }}
                onClick={() => handleAgentSwitch(agent.id)}
                disabled={isStreaming}
              >
                <span
                  className="bridge-chat-panel__agent-tab-dot"
                  style={{ background: agentIsOffline ? 'var(--lcars-gray)' : agent.color }}
                />
                <span className="bridge-chat-panel__agent-tab-name">{agent.name}</span>
                <span
                  className="bridge-chat-panel__agent-tab-status"
                  style={{ color: agentIsOffline ? 'var(--lcars-gray)' : agent.color }}
                >
                  {agentIsOffline ? 'OFFLINE' : 'ONLINE'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Area */}
      <div
        className="bridge-chat-panel__messages"
        style={{ '--chat-accent': agentConfig.color }}
      >
        {/* Empty State */}
        {isEmpty && (
          <div className="bridge-chat-panel__empty">
            <div
              className="bridge-chat-panel__empty-line"
              style={{ background: agentConfig.color }}
            />
            <div
              className="bridge-chat-panel__empty-agent"
              style={{ color: agentConfig.color }}
            >
              {agentConfig.fullName}
            </div>
            <div className="bridge-chat-panel__empty-tagline">
              {agentConfig.tagline}
            </div>
            <div className="bridge-chat-panel__empty-personality">
              {agentConfig.personality}
            </div>
          </div>
        )}

        {/* Messages */}
        {currentMessages.map((msg, i) => (
          <ChatMessage
            key={i}
            msg={msg}
            agentConfig={agentConfig}
          />
        ))}

        {/* Streaming state */}
        {isStreaming && !streamingText && (
          <StreamingIndicator agentConfig={agentConfig} />
        )}
        {isStreaming && streamingText && (
          <div
            className="chat-msg chat-msg--agent"
            style={{ '--agent-chat-color': agentConfig.color }}
          >
            <div
              className="chat-msg__accent-bar"
              style={{ background: agentConfig.color }}
            />
            <div className="chat-msg__agent-body">
              <div
                className="chat-msg__agent-name"
                style={{ color: agentConfig.color }}
              >
                {agentConfig.fullName}
                <span
                  className="chat-streaming__cursor"
                  style={{ background: agentConfig.color }}
                />
              </div>
              <div className="chat-msg__agent-text">{streamingText}</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bridge-chat-panel__error">
            <span className="bridge-chat-panel__error-icon">⚠</span>
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area — or Offline Banner */}
      {isOffline ? (
        <div
          className="bridge-chat-panel__offline"
          style={{ '--offline-color': agentConfig.color }}
        >
          <div
            className="bridge-chat-panel__offline-bar"
            style={{ background: agentConfig.color }}
          />
          <div className="bridge-chat-panel__offline-content">
            <span className="bridge-chat-panel__offline-icon">◈</span>
            <div>
              <div
                className="bridge-chat-panel__offline-title"
                style={{ color: agentConfig.color }}
              >
                OFFLINE — CHANNEL UNAVAILABLE
              </div>
              <div className="bridge-chat-panel__offline-sub">
                {agentConfig.name} is not reachable on this network.
                Check AGENT-ROSTER.md to update status.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="bridge-chat-panel__input-area"
          style={{ '--input-color': agentConfig.color }}
        >
          {/* Context indicator */}
          <div className="bridge-chat-panel__context-bar">
            {initialContext?.activeProject ? (
              <>
                <span className="bridge-chat-panel__context-label">PROJECT</span>
                <span className="bridge-chat-panel__context-value" style={{ color: agentConfig.color }}>
                  {initialContext.activeProject.toUpperCase()}
                </span>
                {initialContext?.currentTask && (
                  <>
                    <span className="bridge-chat-panel__context-sep">·</span>
                    <span className="bridge-chat-panel__context-value" style={{ color: 'var(--lcars-gray-light)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-body)', fontSize: 'var(--text-meta)' }}>
                      {initialContext.currentTask.length > 50 ? initialContext.currentTask.slice(0, 50) + '…' : initialContext.currentTask}
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="bridge-chat-panel__context-label">VIEW</span>
                <span className="bridge-chat-panel__context-value" style={{ color: agentConfig.color }}>
                  {currentView?.toUpperCase() || 'BRIDGE'}
                </span>
                {currentProject && (
                  <>
                    <span className="bridge-chat-panel__context-sep">›</span>
                    <span className="bridge-chat-panel__context-value" style={{ color: agentConfig.color }}>
                      {currentProject.toUpperCase()}
                    </span>
                  </>
                )}
              </>
            )}
            <span className="bridge-chat-panel__context-agent" style={{ color: agentConfig.color, marginLeft: 'auto' }}>
              ⟶ {agentConfig.name}
            </span>
          </div>

          <div className="bridge-chat-panel__input-row">
            <textarea
              ref={inputRef}
              className="bridge-chat-panel__input"
              style={{ '--input-focus-color': agentConfig.color }}
              placeholder={`Send message to ${agentConfig.name}...`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={1}
            />
            <button
              className="bridge-chat-panel__send-btn"
              style={{
                background: isStreaming ? 'var(--lcars-gray)' : agentConfig.color,
                cursor: isStreaming ? 'not-allowed' : 'pointer',
              }}
              onClick={sendMessage}
              disabled={isStreaming || !inputValue.trim()}
            >
              {isStreaming ? (
                <span className="bridge-chat-panel__send-processing">■</span>
              ) : (
                'SEND'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

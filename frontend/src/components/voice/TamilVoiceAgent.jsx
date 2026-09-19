import { useState, useEffect, useRef } from 'react';

export default function TamilVoiceAgent({
  voiceAgent,
  isOpen,
  onClose,
  onOpen,
}) {
  const {
    status,
    transcript,
    chatLog,
    activeVisualizer,
    startListening,
    stopListening,
    toggleVoice,
    processEnglishIntent,
  } = voiceAgent;

  const [textInput, setTextInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, transcript]);

  const handleSendText = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const msg = textInput;
    setTextInput('');
    processEnglishIntent(msg);
  };

  return (
    <>
      {/* ── LIVE DIALOG DRAWER (VELA AI VOICE ASSISTANT) ── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            right: '1.5rem',
            width: '380px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '520px',
            maxHeight: 'calc(100vh - 7rem)',
            background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)',
            color: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(244, 114, 182, 0.2)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'linear-gradient(135deg, #831843 0%, #be185d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                }}
              >
                <i className="bi bi-flower1" style={{ fontSize: '1.25rem', color: '#fdf2f8' }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                  Vela AI Assistant
                </div>
                <div style={{ fontSize: '0.72rem', color: '#fbcfe8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'listening' ? '#4ade80' : '#f472b6' }} />
                  {status === 'speaking' ? '🔊 Speaking...' : status === 'listening' ? '🎙️ Listening...' : 'AI Voice Assistant'}
                </div>
              </div>
            </div>

            <button
              onClick={() => { stopListening(); onClose(); }}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.15rem' }}
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>

          {/* Quick Voice Prompt Chips */}
          <div
            style={{
              padding: '0.5rem 0.75rem',
              background: 'rgba(39, 39, 42, 0.6)',
              borderBottom: '1px solid #27272a',
              display: 'flex',
              gap: '0.4rem',
              overflowX: 'auto',
            }}
          >
            <button
              onClick={() => processEnglishIntent('Add 2 Jasmine to cart')}
              style={{
                whiteSpace: 'nowrap',
                padding: '0.3rem 0.65rem',
                fontSize: '0.72rem',
                borderRadius: '9999px',
                background: '#27272a',
                color: '#f472b6',
                border: '1px solid rgba(244,114,182,0.3)',
                cursor: 'pointer',
              }}
            >
              🌸 Add 2 Jasmine
            </button>
            <button
              onClick={() => processEnglishIntent('Show Rose Garlands')}
              style={{
                whiteSpace: 'nowrap',
                padding: '0.3rem 0.65rem',
                fontSize: '0.72rem',
                borderRadius: '9999px',
                background: '#27272a',
                color: '#f87171',
                border: '1px solid rgba(248,113,113,0.3)',
                cursor: 'pointer',
              }}
            >
              🌹 Rose Garlands
            </button>
            <button
              onClick={() => processEnglishIntent('View Cart')}
              style={{
                whiteSpace: 'nowrap',
                padding: '0.3rem 0.65rem',
                fontSize: '0.72rem',
                borderRadius: '9999px',
                background: '#27272a',
                color: '#fbbf24',
                border: '1px solid rgba(251,191,36,0.3)',
                cursor: 'pointer',
              }}
            >
              🛒 View Cart
            </button>
          </div>

          {/* Chat Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {chatLog.length === 0 && (
              <div style={{ textAlign: 'center', margin: 'auto', color: '#a1a1aa', padding: '1rem' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'rgba(190, 24, 93, 0.15)',
                    color: '#f472b6',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 0.75rem',
                    fontSize: '1.6rem',
                  }}
                >
                  <i className="bi bi-mic-fill" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '0.25rem' }}>
                  Hello! I am Vela.
                </div>
                <p style={{ fontSize: '0.78rem', lineHeight: 1.4, color: '#d4d4d8' }}>
                  You can order fresh flowers and pooja items with your voice.
                  <br />
                  Try saying: <span style={{ color: '#f472b6' }}>"Add 2 Jasmine to cart"</span>!
                </p>
              </div>
            )}

            {chatLog.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, #be185d, #9d174d)' : '#27272a',
                  color: '#fff',
                  padding: '0.65rem 0.9rem',
                  borderRadius: msg.sender === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                  fontSize: '0.84rem',
                  lineHeight: 1.4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {msg.text}
              </div>
            ))}

            {status === 'listening' && transcript && (
              <div
                style={{
                  alignSelf: 'flex-end',
                  background: 'rgba(244, 114, 182, 0.15)',
                  border: '1px solid #f472b6',
                  color: '#fbcfe8',
                  padding: '0.45rem 0.8rem',
                  borderRadius: '14px',
                  fontSize: '0.78rem',
                }}
              >
                <i className="bi bi-soundwave me-1 text-pink-400" />
                {transcript}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Audio Visualizer Waves */}
          {activeVisualizer && (
            <div
              style={{
                height: '32px',
                background: '#18181b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                borderTop: '1px solid #27272a',
              }}
            >
              {[12, 24, 16, 28, 20, 10, 26, 18, 22, 14, 25, 15].map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: 3,
                    height: `${h}px`,
                    background: status === 'speaking' ? '#ec4899' : '#38bdf8',
                    borderRadius: 2,
                    animation: 'pk-voice-pulse 0.8s infinite alternate',
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Footer Voice / Text Bar */}
          <form
            onSubmit={handleSendText}
            style={{
              padding: '0.75rem 1rem',
              background: '#27272a',
              borderTop: '1px solid #3f3f46',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <button
              type="button"
              onClick={toggleVoice}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: status === 'listening' ? '#ef4444' : 'linear-gradient(135deg, #be185d, #831843)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.15rem',
                flexShrink: 0,
                boxShadow: status === 'listening' ? '0 0 0 4px rgba(239, 68, 68, 0.35)' : 'none',
                transition: 'all 0.2s',
              }}
              title={status === 'listening' ? 'Stop Listening' : 'Speak'}
            >
              <i className={`bi ${status === 'listening' ? 'bi-mic-fill' : 'bi-mic'}`} />
            </button>

            <input
              type="text"
              className="pk-input"
              style={{
                flex: 1,
                background: '#18181b',
                color: '#fff',
                border: '1px solid #3f3f46',
                borderRadius: '12px',
                fontSize: '0.82rem',
                padding: '0.45rem 0.8rem',
              }}
              placeholder="Speak or type your command…"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />

            <button
              type="submit"
              className="pk-btn pk-btn--primary pk-btn--sm"
              style={{
                borderRadius: '12px',
                padding: '0.45rem 0.8rem',
                background: '#be185d',
                borderColor: '#be185d',
              }}
              disabled={!textInput.trim()}
            >
              <i className="bi bi-send-fill" />
            </button>
          </form>
        </div>
      )}

      {/* ── FLOATING VOICE TRIGGER BUTTON (ENGLISH) ── */}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9990,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        {!isOpen && (
          <button
            type="button"
            onClick={() => { onOpen(); startListening(); }}
            style={{
              background: 'linear-gradient(135deg, #831843 0%, #be185d 100%)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '9999px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 8px 24px rgba(190, 24, 93, 0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <i className="bi bi-mic-fill" style={{ fontSize: '1rem', color: '#fbcfe8' }} />
            <span>🎙️ Speak with Vela</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (!isOpen) {
              onOpen();
              startListening();
            } else {
              toggleVoice();
            }
          }}
          title="Vela AI Voice Assistant"
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: status === 'listening'
              ? 'linear-gradient(135deg,#ef4444,#dc2626)'
              : 'linear-gradient(135deg,#be185d,#831843)',
            color: '#ffffff',
            border: '2px solid rgba(255,255,255,0.3)',
            boxShadow: status === 'listening'
              ? '0 0 0 8px rgba(239,68,68,0.3), 0 10px 30px rgba(0,0,0,0.3)'
              : '0 8px 25px rgba(190, 24, 93, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.45rem',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <i className={`bi ${status === 'listening' ? 'bi-mic-fill' : 'bi-flower1'}`} />
        </button>
      </div>
    </>
  );
}

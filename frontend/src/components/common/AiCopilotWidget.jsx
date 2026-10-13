import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../features/auth/AuthContext';

export default function AiCopilotWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'invoice' | 'status'
  
  // Chat state
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.name ? user.name.split(' ')[0] : 'there'}! 👋 I am your **AI Business Copilot** powered by OpenRouter multi-model intelligence. Ask me for marketing campaigns, inventory restock insights, or customer khata credit recovery.`,
      model_used: 'openrouter/free',
      actions: [
        { title: '🚀 Weekend Campaign', prompt: 'Create a WhatsApp flash sale discount campaign for my store' },
        { title: '📦 Check Stock Items', prompt: 'Which items are low in stock and need restock?' },
        { title: '💰 Khata Reminders', prompt: 'How do I recover customer pending credit smoothly?' },
      ]
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openrouter/free');

  // Invoice state
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [isParsingInvoice, setIsParsingInvoice] = useState(false);
  const [parsedInvoice, setParsedInvoice] = useState(null);
  const [invoiceError, setInvoiceError] = useState(null);
  const [isIntaking, setIsIntaking] = useState(false);
  const [intakeSuccess, setIntakeSuccess] = useState(null);

  const handleIntakeInvoice = async () => {
    if (!parsedInvoice?.items?.length || isIntaking) return;
    setIsIntaking(true);
    setIntakeSuccess(null);
    try {
      const payload = {
        merchant_name: parsedInvoice.merchant_name || 'Vendor Intake',
        invoice_number: parsedInvoice.invoice_number,
        items: parsedInvoice.items.map(it => ({
          name: it.name,
          quantity: it.quantity,
          unit: it.unit || 'pcs',
          unit_price: it.unit_price,
          category: it.category || 'General'
        }))
      };

      const res = await api.post('/ai/invoice/intake', payload);
      const data = res.data?.data;
      setIntakeSuccess(`✅ Added ${data?.total_intaked || parsedInvoice.items.length} items to shop inventory! (${data?.created_products || 0} new products created, ${data?.updated_products || 0} updated).`);
    } catch (err) {
      alert(`Intake failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsIntaking(false);
    }
  };


  // Health & Routing Status state
  const [healthStatus, setHealthStatus] = useState(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await api.get('/ai/health');
      setHealthStatus(res.data?.data || null);
    } catch (err) {
      console.warn('AI health check failed:', err);
      // Fallback direct check to microservice if backend bridge is busy
      try {
        const directRes = await fetch('http://127.0.0.1:8001/api/v1/health');
        const json = await directRes.json();
        setHealthStatus(json?.data || null);
      } catch (directErr) {
        setHealthStatus({ status: 'offline', error: directErr.message });
      }
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleSendMessage = async (promptToSend) => {
    const prompt = (promptToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: prompt }];
    setMessages(newMessages);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Assemble history for context
      const history = newMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call through Laravel backend or direct to AI microservice
      let responseData = null;
      try {
        const res = await api.post('/ai/copilot/chat', {
          prompt,
          history,
          model: selectedModel || undefined,
        });
        responseData = res.data?.data;
      } catch (apiErr) {
        // Direct fallback to AI service port 8001
        const directRes = await fetch('http://127.0.0.1:8001/api/v1/copilot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            context: {
              shop_name: user?.shop_name || 'Pookal Store',
              vertical: user?.business_type || 'retail'
            },
            history,
            model: selectedModel || undefined
          })
        });
        const json = await directRes.json();
        responseData = json?.data;
      }

      if (responseData) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: responseData.reply,
            model_used: responseData.model_used || selectedModel,
            suggested_actions: responseData.suggested_actions || []
          }
        ]);
      } else {
        throw new Error('No response data received');
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **AI Response Note**: ${err.message || 'Could not reach AI engine'}. Using offline recommendations.\n\nTip: You can reorder stock or create WhatsApp offers from your dashboard navigation.`,
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = (action) => {
    if (action.action_type === 'NAVIGATE' && action.payload?.route) {
      navigate(action.payload.route);
      setIsOpen(false);
    } else if (action.action_type === 'CREATE_CAMPAIGN') {
      alert(`🚀 Campaign Blast Template (${action.title}) ready! Redirecting to CRM campaigns.`);
      navigate('/crm');
      setIsOpen(false);
    } else if (action.action_type === 'RESTOCK_ITEM') {
      alert(`📥 Auto-generated PO threshold: ${action.payload?.threshold_days || 4} days stock.`);
      navigate('/inventory');
      setIsOpen(false);
    }
  };

  const handleInvoiceFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceFile(file);
      setParsedInvoice(null);
      setInvoiceError(null);
      const reader = new FileReader();
      reader.onloadend = () => setInvoicePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleParseInvoice = async () => {
    if (!invoiceFile || isParsingInvoice) return;
    setIsParsingInvoice(true);
    setInvoiceError(null);

    const formData = new FormData();
    formData.append('file', invoiceFile);

    try {
      let result = null;
      try {
        const res = await api.post('/ai/invoice/parse', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        result = res.data?.data;
      } catch (err) {
        // Direct call to port 8001
        const directRes = await fetch('http://127.0.0.1:8001/api/v1/invoice/parse', {
          method: 'POST',
          body: formData
        });
        const json = await directRes.json();
        result = json?.data;
      }

      if (result) {
        setParsedInvoice(result);
      } else {
        throw new Error('Extraction failed to return structured items.');
      }
    } catch (err) {
      setInvoiceError(err.message || 'Failed to parse invoice.');
    } finally {
      setIsParsingInvoice(false);
    }
  };

  return (
    <>
      {/* ── Floating Launcher Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1050,
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '50px',
          padding: '12px 20px',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4), 0 2px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.92rem',
          transition: 'all 0.25s ease',
          transform: isOpen ? 'scale(0.95)' : 'scale(1)',
        }}
        title="Open AI Business Copilot"
      >
        <span style={{ fontSize: '1.2rem', animation: 'spin 4s linear infinite' }}>✨</span>
        <span>AI Copilot</span>
        <span
          style={{
            background: 'rgba(255,255,255,0.25)',
            fontSize: '0.7rem',
            padding: '2px 7px',
            borderRadius: '10px',
            letterSpacing: '0.5px'
          }}
        >
          OpenRouter
        </span>
      </button>

      {/* ── Slide-Over AI Copilot Drawer ── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '84px',
            right: '24px',
            width: '420px',
            maxWidth: 'calc(100vw - 32px)',
            height: '620px',
            maxHeight: 'calc(100vh - 110px)',
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            boxShadow: '0 20px 48px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1050,
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            fontFamily: 'inherit',
            animation: 'fadeInUp 0.2s ease-out'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  UBP AI Intelligence
                  <span style={{ fontSize: '0.65rem', background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontWeight: 600 }}>LIVE</span>
                </div>
                <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                  Unified Multi-Model Routing
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Model Selection Bar */}
          <div
            style={{
              padding: '8px 14px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem'
            }}
          >
            <span style={{ color: '#64748b', fontWeight: 500 }}>Active Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                fontSize: '0.78rem',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#fff',
                color: '#334155',
                outline: 'none',
                maxWidth: '220px'
              }}
            >
              <option value="openrouter/free">⚡ Auto Free (openrouter/free)</option>
              <option value="nvidia/nemotron-3.5-lightning:free">⚡ NVIDIA Nemotron 3.5 (Free)</option>
              <option value="liquid/lfm-2.5-2.6b:free">💧 Liquid LFM 2.5 (Free)</option>
              <option value="google/gemma-4-31b-it:free">🔷 Google Gemma 4 31B (Free)</option>
              <option value="dots-studio/dots-3-note-preview:free">📝 Dots 3 Note (Free)</option>
            </select>
          </div>

          {/* Sub Navigation Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1,
                padding: '9px 0',
                border: 'none',
                background: 'none',
                fontWeight: activeTab === 'chat' ? 600 : 500,
                color: activeTab === 'chat' ? '#6366f1' : '#64748b',
                borderBottom: activeTab === 'chat' ? '2px solid #6366f1' : '2px solid transparent',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              💬 Merchant Copilot
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invoice')}
              style={{
                flex: 1,
                padding: '9px 0',
                border: 'none',
                background: 'none',
                fontWeight: activeTab === 'invoice' ? 600 : 500,
                color: activeTab === 'invoice' ? '#6366f1' : '#64748b',
                borderBottom: activeTab === 'invoice' ? '2px solid #6366f1' : '2px solid transparent',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              📸 Scan Invoice
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('status')}
              style={{
                flex: 1,
                padding: '9px 0',
                border: 'none',
                background: 'none',
                fontWeight: activeTab === 'status' ? 600 : 500,
                color: activeTab === 'status' ? '#6366f1' : '#64748b',
                borderBottom: activeTab === 'status' ? '2px solid #6366f1' : '2px solid transparent',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              ⚙️ Status
            </button>
          </div>

          {/* ── TAB 1: COPILOT CHAT ── */}
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Message scroll container */}
              <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        backgroundColor: m.role === 'user' ? '#6366f1' : '#f1f5f9',
                        color: m.role === 'user' ? '#ffffff' : '#1e293b',
                        fontSize: '0.88rem',
                        lineHeight: '1.45',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {m.content}
                    </div>

                    {/* Model metadata tag */}
                    {m.model_used && (
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '3px', paddingLeft: '4px' }}>
                        via {m.model_used}
                      </span>
                    )}

                    {/* Clickable quick prompt chips */}
                    {m.actions && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {m.actions.map((act, aIdx) => (
                          <button
                            key={aIdx}
                            type="button"
                            onClick={() => handleSendMessage(act.prompt)}
                            style={{
                              background: '#fff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '16px',
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              color: '#475569',
                              cursor: 'pointer',
                              fontWeight: 500,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                          >
                            {act.title}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Actionable response buttons */}
                    {m.suggested_actions && m.suggested_actions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {m.suggested_actions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleExecuteAction(sug)}
                            style={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '14px',
                              padding: '5px 12px',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
                            }}
                          >
                            {sug.title} →
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div style={{ alignSelf: 'flex-start', padding: '8px 14px', background: '#f1f5f9', borderRadius: '12px', fontSize: '0.82rem', color: '#64748b' }}>
                    <span style={{ display: 'inline-block', animation: 'pulse 1.2s infinite' }}>🤖 OpenRouter thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                style={{
                  padding: '10px 14px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  gap: '8px',
                  backgroundColor: '#ffffff'
                }}
              >
                <input
                  type="text"
                  placeholder="Ask copilot or command restock/campaign..."
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: '24px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || isLoading}
                  style={{
                    backgroundColor: inputPrompt.trim() && !isLoading ? '#6366f1' : '#cbd5e1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '38px',
                    height: '38px',
                    cursor: inputPrompt.trim() && !isLoading ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem'
                  }}
                >
                  ➤
                </button>
              </form>
            </div>
          )}

          {/* ── TAB 2: INVOICE & RECEIPT OCR ── */}
          {activeTab === 'invoice' && (
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#1e293b' }}>
                  Smart Receipt & Invoice Vision OCR
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Extract supplier line items and quantities directly into your inventory.
                </div>
              </div>

              <div
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '18px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  marginBottom: '14px',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('ai-invoice-upload-input')?.click()}
              >
                <input
                  id="ai-invoice-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleInvoiceFileChange}
                  style={{ display: 'none' }}
                />
                {invoicePreview ? (
                  <div>
                    <img
                      src={invoicePreview}
                      alt="Invoice Preview"
                      style={{ maxHeight: '140px', borderRadius: '8px', marginBottom: '8px', objectFit: 'contain' }}
                    />
                    <div style={{ fontSize: '0.78rem', color: '#475569' }}>{invoiceFile?.name} (Click to change)</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '4px' }}>📄</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>Upload Invoice or Vendor Bill</div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>PNG, JPG, or WEBP up to 10MB</div>
                  </div>
                )}
              </div>

              {invoiceFile && (
                <button
                  type="button"
                  onClick={handleParseInvoice}
                  disabled={isParsingInvoice}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: isParsingInvoice ? '#94a3b8' : '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: isParsingInvoice ? 'default' : 'pointer',
                    marginBottom: '14px'
                  }}
                >
                  {isParsingInvoice ? 'Scanning with OpenRouter Vision...' : '✨ Extract Items with AI OCR'}
                </button>
              )}

              {invoiceError && (
                <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '12px' }}>
                  ⚠️ {invoiceError}
                </div>
              )}

              {parsedInvoice && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.84rem', fontWeight: 600 }}>
                    <span>Vendor: {parsedInvoice.merchant_name || 'N/A'}</span>
                    <span style={{ color: '#059669' }}>₹{parsedInvoice.total_amount}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>
                    Invoice #: {parsedInvoice.invoice_number || 'Auto-Detected'} · Date: {parsedInvoice.invoice_date || 'N/A'}
                  </div>

                  <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                          <th style={{ textAlign: 'left', padding: '4px' }}>Item</th>
                          <th style={{ textAlign: 'center', padding: '4px' }}>Qty</th>
                          <th style={{ textAlign: 'right', padding: '4px' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(parsedInvoice.items || []).map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 4px' }}>{it.name}</td>
                            <td style={{ padding: '5px 4px', textAlign: 'center' }}>{it.quantity} {it.unit || ''}</td>
                            <td style={{ padding: '5px 4px', textAlign: 'right' }}>₹{it.total_price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {intakeSuccess && (
                    <div style={{ padding: '8px 12px', background: '#dcfce7', color: '#166534', borderRadius: '8px', fontSize: '0.8rem', marginTop: '10px', fontWeight: 500, lineHeight: 1.4 }}>
                      {intakeSuccess}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleIntakeInvoice}
                    disabled={isIntaking}
                    style={{
                      width: '100%',
                      marginTop: '12px',
                      padding: '10px',
                      backgroundColor: isIntaking ? '#94a3b8' : '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: isIntaking ? 'default' : 'pointer'
                    }}
                  >
                    {isIntaking ? '⏳ Updating Inventory Ledger...' : '📥 1-Click Intake Into Stock Ledger'}
                  </button>

                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: STATUS & DIAGNOSTICS ── */}
          {activeTab === 'status' && (
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
              <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '8px' }}>
                OpenRouter Integration Diagnostics
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '14px' }}>
                Check communication between frontend, Laravel bridge, and Python AI intelligence engine.
              </p>

              <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '12px', border: '1px solid #e2e8f0', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>AI Service Microservice:</span>
                  <span style={{ fontWeight: 600, color: healthStatus?.status === 'ok' ? '#10b981' : '#ef4444' }}>
                    {healthStatus?.status === 'ok' ? '● Connected' : '○ Offline'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Active Provider:</span>
                  <span style={{ fontWeight: 600 }}>{healthStatus?.active_provider || 'openrouter'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>OpenRouter Key Configured:</span>
                  <span style={{ fontWeight: 600, color: healthStatus?.openrouter_configured ? '#10b981' : '#f59e0b' }}>
                    {healthStatus?.openrouter_configured ? 'Yes (Verified)' : 'Not Set'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Default Free Model:</span>
                  <span style={{ fontWeight: 600 }}>{healthStatus?.openrouter_default_model || 'openrouter/free'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchHealth}
                disabled={isCheckingHealth}
                style={{
                  width: '100%',
                  marginTop: '14px',
                  padding: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: isCheckingHealth ? 'default' : 'pointer'
                }}
              >
                {isCheckingHealth ? 'Pinging endpoints...' : '🔄 Re-test Connection'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

import { useState } from 'react'
import { FileText, Download, Info, ExternalLink, X, ShieldAlert,  } from 'lucide-react'

export default function InsuranceCenter() {
  const [showClaimModal, setShowClaimModal] = useState(false)

  const handleToolAction = (title: string) => {
    if (title === 'Policy Wordings') {
      // 🌐 Legal / RTO Redirect: Hands off safely to official vehicle records portal
      window.open('https://vahan.parivahan.gov.in/', '_blank', 'noopener,noreferrer')
    } else if (title === 'Claim Procedure') {
      // ⚡ Internal Feature Trigger: Launches center interactive modal window
      setShowClaimModal(true)
    }
  }

  const items = [
    { title: 'Claim Procedure', desc: 'Step-by-step guide for claims', icon: FileText, isExternal: false },
    { title: 'Policy Wordings', desc: 'Download coverage details via Parivahan', icon: FileText, isExternal: true },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* ─── SIDEBAR CARD CONTAINER ─── */}
      <div className="data-card" style={{ padding: 20, background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12 }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
          Insurance Center
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--gray-400)', lineHeight: 1.4 }}>
          Templates and resources for your vehicle protection needs.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, idx) => {
            const IconComponent = item.icon
            return (
              <div 
                key={idx} 
                onClick={() => handleToolAction(item.title)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 8, 
                  background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ 
                  width: 34, height: 34, borderRadius: 6, background: 'var(--brand-50)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-600)', flexShrink: 0 
                }}>
                  <IconComponent size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{item.title}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>{item.desc}</p>
                </div>
                {item.isExternal ? (
                  <ExternalLink size={14} color="#94a3b8" style={{ marginLeft: 4 }} />
                ) : (
                  <Download size={14} color="#94a3b8" style={{ marginLeft: 4 }} />
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 20, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: 8, padding: 14, display: 'flex', gap: 12 }}>
          <Info size={20} color="var(--brand-600)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-800)' }}>Renewal Reminder</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--brand-700)', lineHeight: 1.45 }}>
              Renew before expiry to avoid inspection and break-in insurance penalties.
            </p>
          </div>
        </div>
      </div>

      {/* ─── MODAL LAYER: INTERACTIVE CLAIM PROCEDURE POPUP ─── */}
      {showClaimModal && (
        <div className="modal-backdrop" onClick={() => setShowClaimModal(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', padding: 24, borderRadius: 12, maxWidth: 520, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
                <ShieldAlert size={18} color="var(--brand-600)" /> Accident & Claim Settlement Steps
              </h3>
              <button onClick={() => setShowClaimModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
              {[
                { step: '1', title: 'Spot Documentation', desc: 'Take clear photos of vehicle damage and note the location context.' },
                { step: '2', title: 'Intimate AutoNidhi', desc: 'Tap "Get Insurance" or contact your helpdesk manager to record the claim incident.' },
                { step: '3', title: 'Surveyor Inspection', desc: 'An insurance underwriter inspector will visit the showroom/garage within 24 hours.' },
                { step: '4', title: 'Cashless Settlement', desc: 'Once sanctioned, repairs begin with directly integrated companion workshop desks.' }
              ].map((s, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--brand-600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                    {s.step}
                  </div>
                  <div>
                    <h5 style={{ margin: '0 0 2px 0', fontWeight: 700, color: '#1e293b' }}>{s.title}</h5>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
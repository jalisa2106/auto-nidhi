// 📄 src/components/CustomerPages/LoanResourceCenter.tsx
import React, { useState } from 'react'
import { TrendingUp, FileText, Landmark, Info, ExternalLink, X } from 'lucide-react'

export default function LoanResourceCenter() {
  // Modal visibility states
  const [activeModal, setActiveModal] = useState<'emi' | 'banks' | null>(null)

  // Interactive internal calculator states
  const [calcAmount, setCalcAmount] = useState(500000)
  const [calcRate, setCalcRate] = useState(9.5)
  const [calcTenure, setCalcTenure] = useState(36)

  // 🧮 EMI Mathematical Calculation Engine Formula
  const monthlyEMI = React.useMemo(() => {
    const principal = calcAmount
    const monthlyRate = calcRate / 12 / 100
    const numberOfMonths = calcTenure
    if (monthlyRate === 0) return principal / numberOfMonths
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfMonths)) / 
                (Math.pow(1 + monthlyRate, numberOfMonths) - 1)
    return Math.round(emi)
  }, [calcAmount, calcRate, calcTenure])

  const totalPayment = monthlyEMI * calcTenure
  const totalInterest = totalPayment - calcAmount

  const handleToolAction = (title: string) => {
    if (title === 'Required Documents List') {
      window.open('https://sarathi.parivahan.gov.in/', '_blank', 'noopener,noreferrer')
    } else if (title === 'EMI Calculator') {
      setActiveModal('emi')
    } else if (title === 'Preferred Banks') {
      setActiveModal('banks')
    }
  }

  const tools = [
    { title: 'EMI Calculator', desc: 'Plan your monthly repayments', icon: TrendingUp, isExternal: false },
    { title: 'Required Documents List', desc: 'Checklist for swift compliance via Parivahan', icon: FileText, isExternal: true },
    { title: 'Preferred Banks', desc: 'List of our verified lending partners', icon: Landmark, isExternal: false },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* ─── SIDEBAR CARD CONTAINER ─── */}
      <div className="data-card" style={{ padding: 20, background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12 }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
          Loan Resource Center
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--gray-400)', lineHeight: 1.4 }}>
          Tools and documents to help you manage your vehicle financing effectively.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tools.map((item, idx) => {
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
                {item.isExternal && <ExternalLink size={14} color="#94a3b8" style={{ marginLeft: 4 }} />}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 20, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: 8, padding: 14, display: 'flex', gap: 12 }}>
          <Info size={20} color="var(--brand-600)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-800)' }}>Sanction Tip</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--brand-700)', lineHeight: 1.45 }}>
              Files with complete KYC and 6 months bank statements are usually sanctioned within <strong>24-48 hours</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ─── MODAL LAYER: EMI CALCULATOR POPUP ─── */}
      {activeModal === 'emi' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', padding: 24, borderRadius: 12, maxWidth: 480, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
                <TrendingUp size={18} color="var(--brand-600)" /> Interactive Loan Estimator
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem', fontWeight: 600 }}>
                  <span style={{ color: '#64748b' }}>Loan Capital</span>
                  <span style={{ color: 'var(--brand-700)' }}>₹{calcAmount.toLocaleString('en-IN')}</span>
                </div>
                <input type="range" min="100000" max="3000000" step="50000" value={calcAmount} onChange={(e) => setCalcAmount(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--brand-600)' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem', fontWeight: 600 }}>
                  <span style={{ color: '#64748b' }}>Interest Rate</span>
                  <span style={{ color: 'var(--brand-700)' }}>{calcRate}% p.a.</span>
                </div>
                <input type="range" min="5" max="20" step="0.1" value={calcRate} onChange={(e) => setCalcRate(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--brand-600)' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem', fontWeight: 600 }}>
                  <span style={{ color: '#64748b' }}>Tenure Duration</span>
                  <span style={{ color: 'var(--brand-700)' }}>{calcTenure} Months</span>
                </div>
                <input type="range" min="12" max="84" step="12" value={calcTenure} onChange={(e) => setCalcTenure(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--brand-600)' }} />
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 12 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Monthly EMI Repayment</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.7rem', fontWeight: 800, color: 'var(--brand-600)' }}>₹{monthlyEMI.toLocaleString('en-IN')}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.8rem', fontWeight: 600 }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Total Interest</span>
                  <span style={{ color: '#0f172a' }}>₹{totalInterest.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Total Repayment</span>
                  <span style={{ color: '#0f172a' }}>₹{totalPayment.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL LAYER: PREFERRED LENDING PARTNERS POPUP ─── */}
      {activeModal === 'banks' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', padding: 24, borderRadius: 12, maxWidth: 500, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
                <Landmark size={18} color="var(--brand-600)" /> Preferred Financial Associates
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18}/></button>
            </div>
            
            <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
              AutoNidhi partners with premier banking channels to ensure your loans clear at competitive processing rates.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { name: 'State Bank of India', rate: '8.75% - 9.50%', processing: 'Min ₹1,500' },
                { name: 'HDFC Bank Corporate Desk', rate: '8.90% - 10.25%', processing: 'Zero for select profiles' },
                { name: 'ICICI Bank Financing', rate: '9.05% - 10.50%', processing: '0.5% of Loan Cap' },
                { name: 'Bank of Baroda Direct', rate: '8.80% - 9.70%', processing: 'Flat ₹2,000 override' }
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{b.name}</h5>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Charges: {b.processing}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', display: 'block' }}>{b.rate}</span>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>Tentative Rate p.a.</span>
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
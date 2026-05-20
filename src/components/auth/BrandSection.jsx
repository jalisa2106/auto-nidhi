import React from 'react'
import {
  CarOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  BarChartOutlined,
} from '@ant-design/icons'

const BrandSection = () => {
  return (
    <>
      <div className="brand-logo">
        <CarOutlined
          style={{
            fontSize: '34px',
            color: '#1677ff',
          }}
        />

        <h1>Auto-Nidhi</h1>
      </div>

      <h2 className="brand-heading">
        Driving <span>Smarter</span>
        <br />
        Business Operations
      </h2>

      <p className="brand-subtext">
        Auto consultancy powered by
        automation, compliance, and
        enterprise-grade workflow
        management.
      </p>

      <div className="feature-list">

        <div className="feature-item">
          <SafetyCertificateOutlined />
          <span> Trusted Operations</span>
        </div>

        <div className="feature-item">
          <FileTextOutlined />
          <span> Documentation Flow</span>
        </div>

        <div className="feature-item">
          <BarChartOutlined />
          <span> Business Insights</span>
        </div>

      </div>
    </>
  )
}

export default BrandSection
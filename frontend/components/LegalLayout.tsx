'use client';

/**
 * Legal Layout - Strictly follows design system
 * Uses light palette tokens and proper typography
 * Pure CSS animations (no framer-motion, no styled-jsx)
 */

import React from 'react';

interface LegalLayoutProps {
  children: React.ReactNode;
  title: string;
  lastUpdated: string;
  contactEmail: string;
}

export default function LegalLayout({ children, title, lastUpdated, contactEmail }: LegalLayoutProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F8FA',
      fontFamily: 'var(--font-display)'
    }}>
      {/* Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .legal-animate-slide-down {
          animation: slideDown 0.6s ease-out;
        }

        .legal-animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out;
        }

        .legal-content {
          font-size: 15px;
          line-height: 1.7;
          color: #4B5563;
        }

        .legal-content h2 {
          font-size: 28px;
          font-weight: 600;
          margin-top: 48px;
          margin-bottom: 16px;
          color: var(--pleero-green);
          letter-spacing: -0.01em;
          padding-bottom: 12px;
          border-bottom: 2px solid rgba(11, 12, 14, 0.1);
        }

        .legal-content h3 {
          font-size: 20px;
          font-weight: 600;
          margin-top: 32px;
          margin-bottom: 12px;
          color: #374151;
        }

        .legal-content p {
          margin-bottom: 16px;
        }

        .legal-content ul,
        .legal-content ol {
          margin-bottom: 16px;
          padding-left: 24px;
        }

        .legal-content li {
          margin-bottom: 8px;
        }

        .legal-content strong {
          font-weight: 600;
          color: var(--pleero-green);
        }

        .legal-content a {
          color: #0B0C0E;
          text-decoration: none;
          border-bottom: 1px solid rgba(11, 12, 14, 0.3);
          transition: all 0.15s;
        }

        .legal-content a:hover {
          color: #1a1b1e;
          border-bottom-color: #1a1b1e;
        }

        .legal-content code {
          font-family: var(--font-mono);
          font-size: 13px;
          background: rgba(0, 0, 0, 0.04);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--pleero-green);
        }

        .legal-content nav {
          background: rgba(11, 12, 14, 0.04);
          border-left: 3px solid #0B0C0E;
          padding: 24px;
          border-radius: 10px;
          margin-bottom: 32px;
        }

        .legal-content nav h2 {
          margin-top: 0;
          font-size: 18px;
          border-bottom: none;
          padding-bottom: 0;
          margin-bottom: 16px;
        }

        .legal-content nav ul {
          padding-left: 0;
          list-style: none;
        }

        .legal-content nav li {
          margin-bottom: 12px;
        }

        .legal-content nav a {
          border-bottom: none;
          font-weight: 500;
        }

        .legal-content .bg-yellow-50 {
          background: rgba(252, 211, 77, 0.1);
          border-left: 4px solid #FCD34D;
          padding: 20px;
          border-radius: 8px;
          margin: 24px 0;
        }

        .legal-content .bg-blue-50 {
          background: rgba(59, 130, 246, 0.06);
          border-left: 4px solid #3B82F6;
          padding: 20px;
          border-radius: 8px;
          margin: 24px 0;
        }

        .legal-content .bg-green-50 {
          background: rgba(11, 12, 14, 0.06);
          border-left: 4px solid #0B0C0E;
          padding: 20px;
          border-radius: 8px;
          margin: 24px 0;
        }

        .legal-content .bg-gray-50 {
          background: #F7F8FA;
          padding: 24px;
          border-radius: 8px;
          margin: 24px 0;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }
      `}} />

      {/* Header/Navigation */}
      <nav
        className="legal-animate-slide-down"
        style={{
          background: 'rgba(247, 248, 250, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          padding: '16px 0'
        }}
      >
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Logo - Link to home */}
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/app-icon.png"
              alt="Pleero Logo"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px'
              }}
            />
            <span style={{
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--pleero-green)'
            }}>Pleero</span>
          </a>

          {/* Back to Home */}
          <a
            href="/"
            style={{
              fontSize: '14px',
              color: '#6B7280',
              textDecoration: 'none',
              transition: 'color 0.15s'
            }}
          >
            ← Back to Home
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <div
        className="legal-animate-fade-in-up"
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '64px 24px'
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 48px)',
            fontWeight: 600,
            color: 'var(--pleero-green)',
            marginBottom: '8px',
            letterSpacing: '-0.02em'
          }}>
            {title}
          </h1>
          <p style={{
            fontSize: '14px',
            fontFamily: 'var(--font-mono)',
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Content Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: 'clamp(32px, 5vw, 64px)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.02)'
        }}>
          <div className="legal-content">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '64px',
          padding: '32px',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
            Questions about this document?
          </p>
          <a
            href={`mailto:${contactEmail}`}
            style={{
              fontSize: '16px',
              color: '#0B0C0E',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'color 0.15s'
            }}
          >
            {contactEmail}
          </a>

          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            flexWrap: 'wrap'
          }}>
            <FooterLink href="/legal/privacy" text="Privacy Policy" />
            <FooterLink href="/legal/terms" text="Terms of Service" />
            <FooterLink href="/" text="Home" />
          </div>
        </div>

        {/* Copyright */}
        <p style={{
          textAlign: 'center',
          fontSize: '14px',
          color: '#9CA3AF',
          marginTop: '32px'
        }}>
          © {new Date().getFullYear()} Pleero. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function FooterLink({ href, text }: { href: string; text: string }) {
  return (
    <a
      href={href}
      style={{
        fontSize: '14px',
        color: '#6B7280',
        textDecoration: 'none',
        transition: 'color 0.15s'
      }}
    >
      {text}
    </a>
  );
}

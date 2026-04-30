import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/lib/language';
import axios from 'axios';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';
import { CardHeader, CardTitle } from '@/components/ui/card';

/* ─────────────────────────────────────────────
   INLINE DESIGN TOKENS & GLOBAL STYLES
   ───────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --saffron:      #E8631A;
    --saffron-lt:   #FFF4EC;
    --saffron-mid:  #F5994A;
    --maroon:       #7B1E1E;
    --maroon-lt:    #F9EDED;
    --gold:         #C6922A;
    --gold-lt:      #FEF9ED;
    --cream:        #FDFAF5;
    --ink:          #1C1510;
    --ink-60:       #6B5B52;
    --ink-30:       #B8A89F;
    --border:       #E6D8CE;
    --shadow-sm:    0 1px 3px rgba(28,21,16,0.08);
    --shadow-md:    0 4px 16px rgba(28,21,16,0.10);
    --shadow-lg:    0 12px 40px rgba(28,21,16,0.14);
    --radius:       10px;
    --radius-sm:    6px;
  }

  .trp-root {
    font-family: 'DM Sans', sans-serif;
    background: var(--cream);
    min-height: 100vh;
    color: var(--ink);
  }

  /* ── Header ── */
  .trp-header {
    background: linear-gradient(135deg, var(--saffron) 0%, #C94F0E 100%);
    padding: 20px 28px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid var(--gold);
    z-index: 100;
    box-shadow: var(--shadow-md);
  }
  .trp-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .trp-header-icon {
    width: 42px;
    height: 42px;
    background: rgba(198,146,42,0.18);
    border: 1.5px solid var(--gold);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }
  .trp-header h1 {
    font-family: 'Playfair Display', serif;
    color: #fff;
    font-size: 20px;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
  }
  .trp-header-sub {
    color: rgba(255,255,255,0.6);
    font-size: 12px;
    margin-top: 2px;
  }
  .trp-header-badge {
    background: rgba(232,99,26,0.25);
    border: 1px solid var(--saffron-mid);
    color: var(--saffron-mid);
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 20px;
    letter-spacing: 0.5px;
  }

  /* ── Layout ── */
  .trp-body {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px 20px 40px;
  }
  .trp-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 1024px) {
    .trp-layout { grid-template-columns: 1fr; }
  }

  /* ── Cards ── */
  .trp-card {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    margin-bottom: 12px;
  }
  .trp-card-header {
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    background: var(--cream);
  }
  .trp-card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Playfair Display', serif;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--saffron);
  }
  .trp-card-title-icon {
    width: 24px;
    height: 24px;
    background: var(--saffron-lt);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }
  .trp-card-body {
    padding: 14px;
  }

  /* ── Accent cards ── */
  .trp-card--saffron .trp-card-header { background: var(--saffron-lt); border-color: #F5C9A9; }
  .trp-card--saffron .trp-card-title  { color: var(--saffron); }
  .trp-card--amber .trp-card-header   { background: #FFFBEC; border-color: #F5DFA9; }
  .trp-card--amber .trp-card-title    { color: #92650A; }
  .trp-card--gold .trp-card-header    { background: var(--gold-lt); border-color: #E8D5A0; }
  .trp-card--gold .trp-card-title     { color: var(--gold); }

  /* ── Grid helpers ── */
  .trp-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
  .trp-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  .trp-grid-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
  @media (max-width: 900px) {
    .trp-grid-4 { grid-template-columns: repeat(2,1fr); }
    .trp-grid-3 { grid-template-columns: repeat(2,1fr); }
  }
  @media (max-width: 600px) {
    .trp-grid-4, .trp-grid-3, .trp-grid-2 { grid-template-columns: 1fr; }
  }

  /* ── Form Fields ── */
  .trp-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-60);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .trp-label .req { color: var(--saffron); margin-left: 2px; }

  .trp-input {
    width: 100%;
    height: 34px;
    padding: 0 10px;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    color: var(--ink);
    background: #FAFAF9;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    box-sizing: border-box;
  }
  .trp-input:focus {
    border-color: var(--saffron);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(232,99,26,0.10);
  }
  .trp-input:read-only, .trp-input[disabled] {
    background: #F5F2EE;
    color: var(--ink-60);
    cursor: not-allowed;
  }
  .trp-input--error { border-color: #DC2626 !important; }

  .trp-select {
    width: 100%;
    height: 34px;
    padding: 0 28px 0 10px;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    color: var(--ink);
    background: #FAFAF9 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B5B52' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 10px center;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    outline: none;
    appearance: none;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .trp-select:focus {
    border-color: var(--saffron);
    background-color: #fff;
    box-shadow: 0 0 0 3px rgba(232,99,26,0.10);
  }

  .trp-textarea {
    width: 100%;
    padding: 8px 10px;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    color: var(--ink);
    background: #FAFAF9;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    outline: none;
    resize: vertical;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .trp-textarea:focus {
    border-color: var(--saffron);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(232,99,26,0.10);
  }

  .trp-err-text { font-size: 11px; color: #DC2626; margin-top: 3px; }

  /* ── Ref card row ── */
  .trp-ref-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--gold-lt);
    border: 1px solid var(--gold);
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--gold);
    font-family: 'Playfair Display', serif;
    letter-spacing: 0.5px;
  }
  .trp-ref-label {
    font-size: 10px;
    color: var(--ink-30);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 4px;
  }

  /* ── Buttons ── */
  .trp-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    border-radius: var(--radius-sm);
    cursor: pointer;
    border: none;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .trp-btn--primary {
    background: linear-gradient(135deg, var(--saffron) 0%, #C94F0E 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(232,99,26,0.30);
  }
  .trp-btn--primary:hover { filter: brightness(1.08); box-shadow: 0 4px 14px rgba(232,99,26,0.38); }
  .trp-btn--primary:disabled { opacity: 0.55; cursor: not-allowed; }

  .trp-btn--outline {
    background: #fff;
    color: var(--ink-60);
    border: 1.5px solid var(--border);
  }
  .trp-btn--outline:hover { border-color: var(--saffron); color: var(--saffron); background: var(--saffron-lt); }

  .trp-btn--ghost {
    background: transparent;
    color: var(--ink-60);
    border: none;
    padding: 0 8px;
    height: 28px;
    font-size: 12px;
  }
  .trp-btn--ghost:hover { color: var(--saffron); }

  .trp-btn--maroon {
    background: var(--maroon);
    color: #fff;
  }
  .trp-btn--maroon:hover { background: #5C1515; }

  .trp-btn--icon {
    width: 34px;
    padding: 0;
    flex-shrink: 0;
  }

  .trp-btn--save {
    width: 100%;
    height: 44px;
    font-size: 15px;
    border-radius: var(--radius);
    background: linear-gradient(135deg, var(--saffron) 0%, #C94F0E 100%);
    color: #fff;
    border: none;
    font-family: 'Playfair Display', serif;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(232,99,26,0.28);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .trp-btn--save:hover { filter: brightness(1.1); box-shadow: 0 6px 20px rgba(232,99,26,0.36); }
  .trp-btn--save:disabled { opacity: 0.55; cursor: not-allowed; }

  .trp-btn--clear {
    width: 100%;
    height: 36px;
    font-size: 13px;
    border-radius: var(--radius-sm);
    background: #fff;
    color: var(--ink-60);
    border: 1.5px solid var(--border);
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .trp-btn--clear:hover { border-color: var(--saffron); color: var(--saffron); }

  /* ── Toggle/Collapse header ── */
  .trp-toggle-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
  }
  .trp-toggle-header:hover .trp-card-title { color: var(--saffron); }

  /* ── Dropdown suggestions ── */
  .trp-dropdown {
    position: absolute;
    z-index: 50;
    left: 0;
    right: 0;
    top: calc(100% + 4px);
    background: #fff;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-lg);
    max-height: 220px;
    overflow-y: auto;
  }
  .trp-dropdown-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 12px;
    background: none;
    border: none;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.1s;
    font-family: 'DM Sans', sans-serif;
  }
  .trp-dropdown-item:last-child { border-bottom: none; }
  .trp-dropdown-item:hover { background: var(--saffron-lt); }
  .trp-dropdown-name { font-size: 13px; font-weight: 600; color: var(--ink); }
  .trp-dropdown-meta { font-size: 11px; color: var(--ink-60); margin-top: 2px; }
  .trp-dropdown-id {
    font-size: 10px;
    color: var(--ink-30);
    background: var(--cream);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 5px;
  }
  .trp-dropdown-empty { padding: 12px; text-align: center; font-size: 12px; color: var(--ink-30); }

  /* ── Input-row ── */
  .trp-input-row { display: flex; gap: 6px; align-items: flex-end; }
  .trp-input-row .trp-input { flex: 1; }

  /* ── Amount tiles ── */
  .trp-amount-tile {
    background: var(--cream);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
  }
  .trp-amount-tile-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--ink-60);
    margin-bottom: 4px;
  }
  .trp-amount-tile-value {
    font-size: 17px;
    font-weight: 700;
    font-family: 'Playfair Display', serif;
    color: var(--saffron);
  }
  .trp-amount-tile-value--green { color: #15803D; }
  .trp-amount-tile-value--red   { color: #DC2626; }
  .trp-amount-tile-value--blue  { color: #1D4ED8; }
  .trp-amount-tile--editable {
    border-color: var(--saffron-mid);
    background: var(--saffron-lt);
  }
  .trp-amount-tile--editable .trp-amount-tile-label { color: var(--saffron); }

  /* ── Photo box ── */
  .trp-photo-box {
    width: 100%;
    aspect-ratio: 3/4;
    max-height: 180px;
    background: var(--cream);
    border: 2px dashed var(--border);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .trp-photo-box:hover { border-color: var(--saffron-mid); }
  .trp-photo-box img { width: 100%; height: 100%; object-fit: cover; }
  .trp-photo-placeholder { text-align: center; color: var(--ink-30); }
  .trp-photo-placeholder svg { display: block; margin: 0 auto 6px; }
  .trp-photo-placeholder span { font-size: 11px; }

  /* ── Status chips ── */
  .trp-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 20px;
  }
  .trp-chip--orange { background: var(--saffron-lt); color: var(--saffron); border: 1px solid #F5C9A9; }
  .trp-chip--green  { background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; }
  .trp-chip--red    { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }

  /* ── Lock toggle ── */
  .trp-lock-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
    cursor: pointer;
    border: none;
    transition: all 0.15s;
  }
  .trp-lock-btn--locked   { background: #FFF4EC; color: var(--saffron); border: 1px solid #F5C9A9; }
  .trp-lock-btn--unlocked { background: var(--cream); color: var(--ink-60); border: 1px solid var(--border); }
  .trp-lock-btn:hover { opacity: 0.8; }

  /* ── Breadcrumb/Meta row ── */
  .trp-meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 8px 14px;
    background: var(--cream);
    border-bottom: 1px solid var(--border);
    font-size: 11px;
    color: var(--ink-60);
  }
  .trp-meta-row strong { color: var(--ink); }

  /* ── Heirs table ── */
  .trp-heirs-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .trp-heirs-table th {
    background: var(--cream);
    color: var(--ink-60);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 6px 8px;
    text-align: left;
    border-bottom: 1.5px solid var(--border);
  }
  .trp-heirs-table td {
    padding: 5px 6px;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  .trp-heirs-table tr:hover td { background: var(--saffron-lt); }
  .trp-heirs-input {
    width: 100%;
    padding: 4px 6px;
    font-size: 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: #fff;
    outline: none;
    font-family: 'DM Sans', sans-serif;
  }
  .trp-heirs-input:focus { border-color: var(--saffron); }
  .trp-heirs-remove {
    background: none;
    border: none;
    color: #DC2626;
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    transition: background 0.1s;
  }
  .trp-heirs-remove:hover { background: #FEF2F2; }

  /* ── Breakdown table ── */
  .trp-breakdown-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    border-bottom: 1px dashed var(--border);
    font-size: 12px;
  }
  .trp-breakdown-row:last-child { border-bottom: none; }
  .trp-breakdown-year { font-weight: 600; color: var(--ink); }
  .trp-breakdown-status { font-size: 10px; color: var(--ink-60); margin-top: 1px; }
  .trp-breakdown-amt--red    { font-weight: 700; color: #DC2626; }
  .trp-breakdown-amt--green  { font-weight: 700; color: #15803D; }
  .trp-breakdown-total {
    display: flex;
    justify-content: space-between;
    padding: 8px 0 0;
    border-top: 2px solid var(--saffron);
    font-size: 13px;
    font-weight: 700;
    color: var(--saffron);
    font-family: 'Playfair Display', serif;
  }

  /* ── Alert ── */
  .trp-alert-err {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    margin-bottom: 12px;
    font-size: 13px;
    color: #991B1B;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .trp-alert-err svg { flex-shrink: 0; margin-top: 1px; }

  /* ── Tip text ── */
  .trp-tip {
    font-size: 11px;
    color: var(--ink-60);
    margin-top: 4px;
    display: flex;
    align-items: flex-start;
    gap: 4px;
  }

  /* ── Modal overlay ── */
  .trp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(28,21,16,0.45);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .trp-modal {
    background: #fff;
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    max-width: 460px;
    width: 100%;
    overflow: hidden;
  }
  .trp-modal-header {
    padding: 16px 20px;
    background: linear-gradient(135deg, var(--saffron) 0%, #C94F0E 100%);
    color: #fff;
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .trp-modal-close {
    background: rgba(255,255,255,0.15);
    border: none;
    color: #fff;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }
  .trp-modal-close:hover { background: rgba(255,255,255,0.25); }
  .trp-modal-body { padding: 24px 20px; }

  /* ── Section divider ── */
  .trp-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, var(--border), transparent);
    margin: 4px 0;
  }

  /* ── Spinner ── */
  .trp-spinner {
    width: 40px; height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--saffron);
    border-radius: 50%;
    animation: trp-spin 0.7s linear infinite;
    margin: 0 auto 12px;
  }
  @keyframes trp-spin { to { transform: rotate(360deg); } }

  /* ── Linked family badge ── */
  .trp-family-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #FFFBEC;
    border: 1px solid #F5DFA9;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    color: #92650A;
    font-weight: 600;
  }

  /* ── Search loader dot ── */
  .trp-dot-loader {
    display: inline-flex;
    gap: 3px;
    align-items: center;
    margin-left: 6px;
  }
  .trp-dot-loader span {
    width: 4px; height: 4px;
    background: var(--saffron);
    border-radius: 50%;
    animation: trp-dot 0.9s infinite;
  }
  .trp-dot-loader span:nth-child(2) { animation-delay: 0.15s; }
  .trp-dot-loader span:nth-child(3) { animation-delay: 0.30s; }
  @keyframes trp-dot {
    0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
    40%         { transform: scale(1);   opacity: 1;   }
  }

  fieldset[disabled] .trp-input,
  fieldset[disabled] .trp-select,
  fieldset[disabled] .trp-textarea {
    background: #F5F2EE;
    color: var(--ink-60);
    cursor: not-allowed;
    pointer-events: none;
  }
`;

/* ─────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────── */
interface Heir {
  id: string;
  serialNumber: number;
  name: string;
  race: string;
  maritalStatus: string;
  education: string;
  birthDate: string;
}

/* ─────────────────────────────────────────────
   SMALL UI HELPERS
   ───────────────────────────────────────────── */
const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, required, error, hint, children, className }) => (
  <div className={className}>
    <label className="trp-label">
      {label}{required && <span className="req"> *</span>}
    </label>
    {children}
    {error && <p className="trp-err-text">⚠ {error}</p>}
    {hint && !error && <p className="trp-tip">💡 {hint}</p>}
  </div>
);

const SectionCard: React.FC<{
  icon: string;
  title: string;
  accent?: 'saffron' | 'amber' | 'gold';
  action?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}> = ({ icon, title, accent, action, children, collapsible, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  const accentClass = accent ? `trp-card--${accent}` : '';

  return (
    <div className={`trp-card ${accentClass}`}>
      <div
        className="trp-card-header"
        style={{ cursor: collapsible ? 'pointer' : 'default' }}
        onClick={collapsible ? () => setOpen(v => !v) : undefined}
      >
        <div className="trp-card-title">
          <div className="trp-card-title-icon">{icon}</div>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {action}
          {collapsible && (
            <span style={{ color: 'var(--ink-30)', fontSize: 12, transition: 'transform .2s', display: 'inline-block', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
          )}
        </div>
      </div>
      {(!collapsible || open) && <div className="trp-card-body">{children}</div>}
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────── */
export default function TaxUserEntryPage() {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [form, setForm] = useState({
    referenceNumber: '',
    date: today,
    name: '',
    alternativeName: '',
    wifeName: '',
    wifeFatherName: '',
    wifeContact: '',
    education: '',
    occupation: '',
    fatherName: '',
    address: '',
    birthDate: '',
    village: '',
    mobileNumber: '',
    aadhaarNumber: '',
    panNumber: '',
    clan: '',
    group: '',
    postalCode: '',
    maleHeirs: 0,
    femaleHeirs: 0,
    gender: '',
    maritalStatus: '',
    parentReferenceId: '',
    familyHeadReference: '',
    relationshipType: 'self',
    separateFromFamily: true,
    year: new Date().getFullYear(),
    taxAmount: '',
    amountPaid: '',
    outstandingAmount: '',
    fromAccount: 'TAX A/C',
    transferTo: 'INCOME A/C',
    memberId: '',
  });

  const [newUser, setNewUser] = useState({ heirs: [] as Heir[], photo: null as File | null });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lookingUp, setLookingUp] = useState(false);
  const [nameLookingUp, setNameLookingUp] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: number; value: string; label: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [taxBreakdown, setTaxBreakdown] = useState<any[]>([]);
  const [cumulativeInfo, setCumulativeInfo] = useState<any>(null);
  const [initialDue, setInitialDue] = useState<number>(0);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [nameResults, setNameResults] = useState<any[]>([]);
  const [showNameResults, setShowNameResults] = useState(false);
  const [mobileResults, setMobileResults] = useState<any[]>([]);
  const [showMobileResults, setShowMobileResults] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const suppressNameLookupRef = useRef<number>(0);
  const suppressMobileLookupRef = useRef<number>(0);
  const amountPaidRef = useRef<HTMLInputElement>(null);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [autoLocked, setAutoLocked] = useState(false);
  const [masterClans, setMasterClans] = useState<string[]>([]);
  const [masterGroups, setMasterGroups] = useState<string[]>([]);
  const [masterOccupations, setMasterOccupations] = useState<string[]>([]);
  const [masterEducations, setMasterEducations] = useState<string[]>([]);

  const masterRaces = [
    { value: 'tamil', label: 'Tamil' },
    { value: 'telugu', label: 'Telugu' },
    { value: 'malayalam', label: 'Malayalam' },
    { value: 'kannada', label: 'Kannada' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'other', label: 'Other' },
  ];
  const maritalStatusOptions = [
    { value: 'unmarried', label: 'Unmarried' },
    { value: 'married', label: 'Married' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' },
  ];

  // ── Language helper ──
  const L = (en: string, ta: string) => (language === 'english' ? ta : en);

  // ── Load master data ──
  useEffect(() => {
    if (user?.templeId && token) {
      (async () => {
        setLoading(true);
        try {
          const [clansRes, groupsRes, occupationsRes, educationsRes] = await Promise.all([
            fetch(`https://templeapi.agniplay.com/api/master/clans/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`https://templeapi.agniplay.com/api/master/groups/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`https://templeapi.agniplay.com/api/master/occupations/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`https://templeapi.agniplay.com/api/master/educations/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (clansRes.ok) setMasterClans((await clansRes.json()).map((x: any) => x.name));
          if (groupsRes.ok) setMasterGroups((await groupsRes.json()).map((x: any) => x.name));
          if (occupationsRes.ok) setMasterOccupations((await occupationsRes.json()).map((x: any) => x.name));
          if (educationsRes.ok) {
            setMasterEducations((await educationsRes.json()).map((x: any) => x.name));
          } else {
            setMasterEducations(['Illiterate','Primary','Secondary','Higher Secondary','Diploma','Bachelor Degree','Master Degree','PhD','Professional Course','Technical Training','Other']);
          }
        } catch { setErr('Failed to load master data'); }
        finally { setLoading(false); }
      })();
    } else { setLoading(false); }
  }, [user, token]);

  useEffect(() => {
    if (!token) return;
    axios.get<any>('https://templeapi.agniplay.com/api/ledger/categories', { headers: { Authorization: `Bearer ${token}` } })
      .then(resp => {
        const data = (resp?.data?.data && Array.isArray(resp.data.data)) ? resp.data.data : (Array.isArray(resp?.data) ? resp.data : []);
        setCategories(data.map((item: any, i: number) =>
          typeof item === 'string' ? { id: i+1, value: item, label: item } : { id: item.id||i+1, value: item.value||item.label, label: item.label||item.value }
        ));
      }).catch(console.error);
  }, [token]);

  useEffect(() => {
    if (user?.templeId && token && !loading) {
      fetchTaxAmountForYear(form.year);
      fetchNextReferenceNumber(form.year);
    }
  }, [user?.templeId, token, loading]);

  // Debounced name lookup
  useEffect(() => {
    if (suppressNameLookupRef.current && Date.now() < suppressNameLookupRef.current) return;
    const q = form.name?.trim() || '';
    if (!q || q.length < 2) return;
    const t = setTimeout(() => lookupUsersByName(q), 400);
    return () => clearTimeout(t);
  }, [form.name]);

  // Debounced mobile lookup
  useEffect(() => {
    const digits = form.mobileNumber?.replace(/\D/g, '') || '';
    if (digits.length !== 10) return;
    const t = setTimeout(() => lookupUserByMobile(form.mobileNumber), 300);
    return () => clearTimeout(t);
  }, [form.mobileNumber]);

  // Auto-fill amount paid
  useEffect(() => {
    const due = Number(form.outstandingAmount || form.taxAmount || 0);
    if ((!form.amountPaid || Number(form.amountPaid) <= 0) && Number.isFinite(due) && due > 0) {
      setForm(prev => ({ ...prev, amountPaid: String(due) }));
    }
  }, [form.outstandingAmount, form.taxAmount]);

  // Click outside dropdowns
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (nameInputRef.current && !nameInputRef.current.closest('.trp-relative')?.contains(t)) setShowNameResults(false);
      if (mobileInputRef.current && !mobileInputRef.current.closest('.trp-relative')?.contains(t)) setShowMobileResults(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const remainingDue = Math.max(0, Number(form.outstandingAmount || 0) - Number(form.amountPaid || 0));

  const showSuccessAlert = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
    setTimeout(() => { setShowSuccessModal(false); setSuccessMessage(''); }, 4000);
  };

  const formatMobileNumber = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 10);
    if (clean.length >= 6) return `${clean.slice(0,3)}-${clean.slice(3,6)}-${clean.slice(6)}`;
    if (clean.length >= 3) return `${clean.slice(0,3)}-${clean.slice(3)}`;
    return clean;
  };
  const formatAadhaarNumber = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 12);
    if (clean.length >= 8) return `${clean.slice(0,4)}-${clean.slice(4,8)}-${clean.slice(8)}`;
    if (clean.length >= 4) return `${clean.slice(0,4)}-${clean.slice(4)}`;
    return clean;
  };

  const fillFormFromRegistration = (userData: any) => {
    setForm(prev => ({
      ...prev,
      name: userData.name || '',
      alternativeName: userData.alternative_name || '',
      wifeName: userData.wife_name || '',
      wifeFatherName: userData.wife_father_name || '',
      fatherName: userData.father_name || '',
      address: userData.address || '',
      birthDate: userData.birth_date || '',
      village: userData.village || '',
      aadhaarNumber: userData.aadhaar_number ? formatAadhaarNumber(userData.aadhaar_number) : '',
      panNumber: userData.pan_number || '',
      clan: userData.clan || '',
      group: userData.group || '',
      postalCode: userData.postal_code || '',
      education: userData.education || '',
      occupation: userData.occupation || '',
      maleHeirs: userData.male_heirs || 0,
      femaleHeirs: userData.female_heirs || 0,
      gender: userData.gender || '',
      maritalStatus: userData.marital_status || '',
      parentReferenceId: userData.parent_reference_id || '',
      familyHeadReference: userData.family_head_reference || '',
      relationshipType: userData.relationship_type || 'self',
      mobileNumber: userData.mobile_number ? formatMobileNumber(userData.mobile_number) : prev.mobileNumber,
      memberId: userData.reference_number ? userData.reference_number.toString() : '',
    }));
    setAutoLocked(true);
    const img = (() => {
      const raw = userData.photo_path || userData.photoUrl || userData.image_path || userData.photo || userData.image;
      if (!raw) return null;
      if (/^https?:\/\//i.test(raw)) return raw;
      const path = raw.startsWith('/public/') ? raw : raw.startsWith('/uploads/') ? `/public${raw}` : null;
      if (!path) return null;
      const { origin } = window.location;
      try {
        const u = new URL(origin);
        const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
        return isLocal ? `${u.protocol}//${u.hostname}:4000${path}` : `${origin}${path}`;
      } catch { return `${origin}${path}`; }
    })();
    setExistingPhotoUrl(img);
  };

  const fetchNextReferenceNumber = async (year: number) => {
    if (!token || !year) return;
    try {
      const res = await fetch(`https://templeapi.agniplay.com/api/tax-registrations/next-ref?year=${year}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.ref) setForm(prev => ({ ...prev, referenceNumber: data.ref }));
      }
    } catch {}
  };

  const lookupUserByMobile = async (mobileNumber: string) => {
    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length < 3) { setMobileResults([]); setShowMobileResults(false); return; }
    if (suppressMobileLookupRef.current && Date.now() < suppressMobileLookupRef.current) return;
    setLookingUp(true);
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/registrations?search=${cleanMobile}&pageSize=10`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        const rows = (data?.data && Array.isArray(data.data)) ? data.data : [];
        setMobileResults(rows);
        if (rows.length === 0) { setShowMobileResults(false); setMsg(L('No matches found','பொருந்தும் பதிவுகள் இல்லை')); setTimeout(()=>setMsg(null),3000); }
        else if (rows.length === 1) { setShowMobileResults(false); fillFormFromRegistration(rows[0]); const mob = rows[0]?.mobile_number ? formatMobileNumber(rows[0].mobile_number) : ''; if (mob && user?.templeId && token) fetchCumulativeTax(mob, form.year); showSuccessAlert(`✅ Auto-filled: ${rows[0].name}`); }
        else { setShowMobileResults(true); }
      }
    } catch {}
    finally { setLookingUp(false); }
  };

  const lookupUsersByName = async (query: string) => {
    const q = (query || '').trim();
    if (!q || q.length < 2 || !token) { setNameResults([]); setShowNameResults(false); return; }
    setNameLookingUp(true);
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/registrations?search=${encodeURIComponent(q)}&pageSize=10`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        const rows = (data?.data && Array.isArray(data.data)) ? data.data : [];
        setNameResults(rows);
        if (rows.length === 0) { setShowNameResults(false); }
        else if (rows.length === 1) { setShowNameResults(false); fillFormFromRegistration(rows[0]); const mob = rows[0]?.mobile_number ? formatMobileNumber(rows[0].mobile_number) : ''; if (mob && user?.templeId && token) fetchCumulativeTax(mob, form.year); showSuccessAlert(`✅ Auto-filled: ${rows[0].name}`); }
        else { setShowNameResults(true); }
      }
    } catch {}
    finally { setNameLookingUp(false); }
  };

  const lookupByReceiptNumber = async (receiptNumber: string) => {
    const cleanReceipt = (receiptNumber || '').trim();
    if (cleanReceipt.length < 3) { setErr(L('Receipt number too short','ரசீது எண் மிகவும் குறுகியது')); return; }
    setLookingUp(true); setErr(null); setMsg(null);
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/registrations?search=${encodeURIComponent(cleanReceipt)}&pageSize=10`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        const rows = (data?.data && Array.isArray(data.data)) ? data.data : [];
        if (rows.length > 0) { 
          fillFormFromRegistration(rows[0]); 
          const mob = rows[0]?.mobile_number ? formatMobileNumber(rows[0].mobile_number) : '';
          if (mob && user?.templeId && token) fetchCumulativeTax(mob, form.year);
          showSuccessAlert(`✅ Found: ${rows[0].name} — Ref ${rows[0].reference_number}`); 
        }
        else setErr(L('No user registration found','இந்த குறிப்பு எண்ணுடன் பயனர் பதிவு இல்லை'));
      } else setErr(L('Failed to search','தேட முடியவில்லை'));
    } catch { setErr(L('Error searching','தேடுவதில் பிழை')); }
    finally { setLookingUp(false); }
  };

  const lookupFamilyByReference = async (refNumber: string) => {
    const cleanRef = (refNumber || '').trim();
    if (!cleanRef || cleanRef.length < 3) { setErr(L('Reference number too short','குறிப்பு எண் மிகவும் குறுகியது')); return; }
    setLookingUp(true); setErr(null); setMsg(null);
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/tax-registrations/by-reference/${encodeURIComponent(cleanRef)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const fd = data.data;
          setForm(prev => ({ ...prev, address: fd.address||prev.address, village: fd.village||prev.village, fatherName: fd.name||prev.fatherName, mobileNumber: fd.mobile_number ? formatMobileNumber(fd.mobile_number) : prev.mobileNumber, clan: fd.clan||prev.clan, group: fd.group||prev.group, postalCode: fd.postal_code||prev.postalCode, parentReferenceId: cleanRef }));
          const mob = fd.mobile_number ? formatMobileNumber(fd.mobile_number) : '';
          if (mob && user?.templeId && token) fetchCumulativeTax(mob, form.year);
          showSuccessAlert(`✅ Linked to family: ${fd.name}`);
        } else setErr(L('No tax registration found','இந்த குறிப்பு எண்ணுடன் வரி பதிவு இல்லை'));
      } else setErr(L('Failed to search','தேட முடியவில்லை'));
    } catch { setErr(L('Error searching','தேடுவதில் பிழை')); }
    finally { setLookingUp(false); }
  };

  const handleSelectRegistration = (userData: any) => {
    fillFormFromRegistration(userData);
    const mobile = userData?.mobile_number ? formatMobileNumber(userData.mobile_number) : '';
    if (mobile && user?.templeId && token) fetchCumulativeTax(mobile, form.year);
    showSuccessAlert(`✅ Selected: ${userData.name} — ID ${userData.id}`);
    setShowNameResults(false); setNameResults([]);
    suppressNameLookupRef.current = Date.now() + 800;
    if (nameInputRef.current) nameInputRef.current.blur();
    setTimeout(() => { if (amountPaidRef.current) { amountPaidRef.current.focus(); amountPaidRef.current.select(); } }, 0);
  };

  const handleSelectMobile = (userData: any) => {
    fillFormFromRegistration(userData);
    const mobile = userData?.mobile_number ? formatMobileNumber(userData.mobile_number) : '';
    if (mobile && user?.templeId && token) fetchCumulativeTax(mobile, form.year);
    showSuccessAlert(`✅ Selected: ${userData.name} — ID ${userData.id}`);
    setShowMobileResults(false); setMobileResults([]);
    suppressMobileLookupRef.current = Date.now() + 800;
    if (mobileInputRef.current) mobileInputRef.current.blur();
    setTimeout(() => { if (amountPaidRef.current) { amountPaidRef.current.focus(); amountPaidRef.current.select(); } }, 0);
  };

  const handleMobileChange = (value: string) => {
    const formatted = formatMobileNumber(value);
    setForm(prev => ({ ...prev, mobileNumber: formatted }));
    if (errors.mobileNumber) setErrors(prev => ({ ...prev, mobileNumber: '' }));
    const cleanMobile = value.replace(/\D/g, '');
    if (cleanMobile.length >= 3 && user?.templeId && token) lookupUserByMobile(formatted);
    else { setMobileResults([]); setShowMobileResults(false); }
  };

  const fetchCumulativeTax = async (mobileNumber: string, year: number) => {
    if (!token || !mobileNumber || !year) return;
    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length !== 10) return;
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/tax-calculations/cumulative/${cleanMobile}?currentYear=${year}`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const { cumulativeOutstanding, currentYearTax, totalTaxDue, yearBreakdown } = data.data;
          setForm(prev => ({ ...prev, taxAmount: currentYearTax.toString(), outstandingAmount: totalTaxDue.toString() }));
          setInitialDue(totalTaxDue);
          setTaxBreakdown(yearBreakdown || []);
          setCumulativeInfo({ cumulativeOutstanding, currentYearTax, totalTaxDue, hasExistingRegistration: data.data.hasExistingRegistration });
        }
      }
    } catch {}
  };

  const fetchTaxAmountForYear = async (year: number) => {
    if (!token || !year) return;
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/tax-settings/year/${year}`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setForm(prev => ({ ...prev, taxAmount: data.data.tax_amount.toString(), outstandingAmount: data.data.tax_amount.toString() }));
          setInitialDue(Number(data.data.tax_amount) || 0);
        } else {
          setForm(prev => ({ ...prev, taxAmount: '', outstandingAmount: '' }));
        }
      }
    } catch {}
  };

  const handleYearChange = (year: number) => {
    setForm(prev => ({ ...prev, year }));
    if (form.mobileNumber && form.mobileNumber.replace(/\D/g,'').length === 10) fetchCumulativeTax(form.mobileNumber, year);
    else fetchTaxAmountForYear(year);
    fetchNextReferenceNumber(year);
  };

  const handleAmountPaidChange = (amountPaid: string) => {
    const paid = parseFloat(amountPaid) || 0;
    const totalDue = Number.isFinite(initialDue) ? initialDue : (parseFloat(form.outstandingAmount) || 0);
    setForm(prev => ({ ...prev, amountPaid, outstandingAmount: Math.max(0, totalDue - paid).toString() }));
  };

  const addHeir = () => {
    setNewUser(prev => ({ ...prev, heirs: [...prev.heirs, { id: Date.now().toString(), serialNumber: prev.heirs.length + 1, name: '', race: '', maritalStatus: 'unmarried', education: '', birthDate: '' }] }));
  };
  const updateHeir = (id: string, field: keyof Heir, value: string) => {
    setNewUser(prev => ({ ...prev, heirs: prev.heirs.map(h => h.id === id ? { ...h, [field]: value } : h) }));
  };
  const removeHeir = (id: string) => {
    setNewUser(prev => ({ ...prev, heirs: prev.heirs.filter(h => h.id !== id).map((h, i) => ({ ...h, serialNumber: i + 1 })) }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024) { setErr('Photo must be < 100KB'); return; }
      setNewUser(prev => ({ ...prev, photo: file }));
      if (existingPhotoUrl) setExistingPhotoUrl(null);
      setErr(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.referenceNumber?.trim()) newErrors.referenceNumber = 'Ref No not generated yet';
    if (!form.year || isNaN(Number(form.year))) newErrors.year = 'Year is required';
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.fatherName.trim()) newErrors.fatherName = 'Father name is required';
    if (!form.address.trim()) newErrors.address = 'Address is required';
    if (form.mobileNumber && form.mobileNumber.replace(/\D/g,'').length !== 10) newErrors.mobileNumber = 'Must be 10 digits';
    if (form.aadhaarNumber && form.aadhaarNumber.replace(/\D/g,'').length !== 12) newErrors.aadhaarNumber = 'Must be 12 digits';
    const paid = Number(form.amountPaid);
    if (!form.amountPaid || isNaN(paid) || paid <= 0) newErrors.amountPaid = 'Enter a valid amount (> 0)';
    newUser.heirs.forEach((heir, i) => {
      if (!heir.name.trim()) newErrors[`heir_${i}_name`] = 'Heir name required';
      if (!heir.race) newErrors[`heir_${i}_race`] = 'Race required';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearForm = () => {
    const currentYear = new Date().getFullYear();
    setForm({ referenceNumber:'', date:today, name:'', alternativeName:'', wifeName:'', wifeFatherName:'', wifeContact:'', education:'', occupation:'', fatherName:'', address:'', birthDate:'', village:'', mobileNumber:'', aadhaarNumber:'', panNumber:'', clan:'', group:'', postalCode:'', maleHeirs:0, femaleHeirs:0, gender:'', maritalStatus:'', parentReferenceId:'', familyHeadReference:'', relationshipType:'self', separateFromFamily:true, year:currentYear, taxAmount:'', amountPaid:'', outstandingAmount:'', fromAccount:'TAX A/C', transferTo:'INCOME A/C', memberId:'' });
    fetchTaxAmountForYear(currentYear);
    fetchNextReferenceNumber(currentYear);
    setNewUser({ heirs:[], photo:null });
    setExistingPhotoUrl(null);
    setAutoLocked(false);
    setErrors({}); setErr(null);
    setCumulativeInfo(null); setTaxBreakdown([]);
  };

  const submit = async () => {
    if (!validateForm()) { setErr('Please fix the highlighted errors'); return; }
    if (!user?.templeId) { setErr('Temple ID not found. Please login again.'); return; }

    if (cumulativeInfo?.hasExistingRegistration) {
      const isFullyPaid = Number(cumulativeInfo.totalTaxDue) <= 0;
      const confirmMsg = isFullyPaid 
        ? L(`This user is already fully paid for ${form.year}. Create another registration anyway?`, `இந்த பயனர் ஏற்கனவே ${form.year} ஆண்டிற்கு முழுமையாக பணம் செலுத்திவிட்டார். மற்றொரு பதிவை உருவாக்க வேண்டுமா?`)
        : L(`This user already has a registration for ${form.year}. Add another payment/registration?`, `இந்த பயனர் ஏற்கனவே ${form.year} ஆண்டிற்கு ஒரு பதிவைக் கொண்டுள்ளார். மற்றொரு பணம்/பதிவைச் சேர்க்க வேண்டுமா?`);
      
      if (!window.confirm(confirmMsg)) return;
    }

    setSaving(true); setErr(null); setMsg(null);
    try {
      const formData = new FormData();
      const fields: Record<string, any> = { referenceNumber:form.referenceNumber, date:form.date, name:form.name, alternativeName:form.alternativeName, wifeName:form.wifeName, wifeFatherName:form.wifeFatherName, education:form.education, occupation:form.occupation, fatherName:form.fatherName, address:form.address, birthDate:form.birthDate, village:form.village, mobileNumber:form.mobileNumber.replace(/\D/g,''), aadhaarNumber:form.aadhaarNumber.replace(/\D/g,''), panNumber:form.panNumber, clan:form.clan, group:form.group, postalCode:form.postalCode, maleHeirs:form.maleHeirs.toString(), femaleHeirs:form.femaleHeirs.toString(), gender:form.gender, maritalStatus:form.maritalStatus, parentReferenceId:form.parentReferenceId, familyHeadReference:form.familyHeadReference, relationshipType:form.relationshipType, separateFromFamily:String(form.separateFromFamily), year:form.year.toString(), taxAmount:form.taxAmount, amountPaid:form.amountPaid, outstandingAmount:String(remainingDue), fromAccount:(form as any).fromAccount||'TAX A/C', transferTo:(form as any).transferTo||'INCOME A/C', templeId:user.templeId.toString(), memberId:(form as any).memberId||'' };
      Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
      if (newUser.heirs.length > 0) formData.append('heirs', JSON.stringify(newUser.heirs.map(h => ({ serialNumber:h.serialNumber, name:h.name, race:h.race, maritalStatus:h.maritalStatus, education:h.education, birthDate:h.birthDate }))));
      if (newUser.photo) formData.append('photo', newUser.photo);
      const res = await fetch('https://templeapi.agniplay.com/api/tax-registrations', { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:formData });
      let data: any = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data?.error || data?.message || `Failed (${res.status})`);
      showSuccessAlert(`Tax Registration #${data.id} saved successfully!`);
      if (typeof data?.id === 'number') { setLastCreatedId(data.id); setShowPrintPrompt(true); }
      clearForm();
    } catch (e: any) { setErr(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="trp-root" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <style>{styles}</style>
      <div style={{ textAlign:'center' }}>
        <div className="trp-spinner" />
        <p style={{ color:'var(--ink-60)', fontSize:14 }}>{L('Loading master data…','முதன்மை தரவு ஏற்றுகிறது…')}</p>
      </div>
    </div>
  );

  const isMarriedMale = form.maritalStatus === 'married' && form.gender === 'male';

  return (
    <div className="trp-root">
      <style>{styles}</style>

      {/* ── Header ── */}
      <header className="trp-header">
        <div className="trp-header-left">
          <div className="trp-header-icon">🛕</div>
          <div>
            <h1>{L('Tax Entry', 'வரி பதிவு')}</h1>

          </div>
        </div>
        
      </header>

      <div className="trp-body">
        {/* Error Alert */}
        {err && (
          <div className="trp-alert-err">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.5"/><path d="M8 5v3M8 10.5v.5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/></svg>
            {err}
          </div>
        )}

        <div className="trp-layout">
          {/* ─── LEFT COLUMN ─── */}
          <div>

            {/* ① Basic Info */}
            <SectionCard icon="📋" title={L('Basic Information','அடிப்படை தகவல்')} action={
              <button className="trp-btn trp-btn--ghost" onClick={clearForm} title="Clear all">🗑 {L('Clear','அழிக்க')}</button>
            }>
              <div className="trp-grid-4">
                <Field label={L('Date','தேதி')}>
                  <input type="date" className="trp-input" value={form.date} onChange={e => set('date', e.target.value)} autoFocus />
                </Field>

                <Field label={L('Year','வருடம்')} required error={errors.year}>
                  <select className="trp-select" value={form.year} onChange={e => handleYearChange(parseInt(e.target.value))}>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Field>

                <Field label={L('Reference No','குறிப்பு எண்')} error={errors.referenceNumber}>
                  <div className="trp-ref-badge" style={{ display:'flex', height:34, alignItems:'center' }}>
                    {form.referenceNumber || <span style={{ color:'var(--ink-30)' }}>Generating…</span>}
                  </div>
                </Field>

                <Field label={L('Search by Ref No','குறிப்பு எண் தேடல்')}>
                  <div className="trp-input-row">
                    <input
                      className="trp-input"
                      value={receiptSearch}
                      onChange={e => setReceiptSearch(e.target.value)}
                      placeholder={L('Enter reference…','குறிப்பு எண்…')}
                      onKeyDown={e => e.key === 'Enter' && lookupByReceiptNumber(receiptSearch)}
                    />
                    <button
                      className="trp-btn trp-btn--outline trp-btn--icon"
                      onClick={() => lookupByReceiptNumber(receiptSearch)}
                      disabled={!receiptSearch.trim() || lookingUp}
                      title="Search"
                    >
                      {lookingUp ? '⏳' : '🔍'}
                    </button>
                  </div>
                </Field>
              </div>
            </SectionCard>

            {/* ② Personal Status */}
            <SectionCard icon="👤" title={L('Personal Status','தனிப்பட்ட நிலை')} accent="saffron">
              <div className="trp-grid-4">
                <Field label={L('Gender','பாலினம்')} required error={errors.gender}>
                  <select className={`trp-select${errors.gender?' trp-input--error':''}`} value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">{L('Select','தேர்ந்தெடு')}</option>
                    <option value="male">{L('Male','ஆண்')}</option>
                    <option value="female">{L('Female','பெண்')}</option>
                    <option value="other">{L('Other','மற்றவை')}</option>
                  </select>
                </Field>
                <Field label={L('Marital Status','திருமண நிலை')} required error={errors.maritalStatus}>
                  <select className={`trp-select${errors.maritalStatus?' trp-input--error':''}`} value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)}>
                    <option value="">{L('Select','தேர்ந்தெடு')}</option>
                    <option value="unmarried">{L('Unmarried','திருமணமாகாத')}</option>
                    <option value="married">{L('Married','திருமணமான')}</option>
                    <option value="divorced">{L('Divorced','விவாகரத்து')}</option>
                    <option value="widowed">{L('Widowed','விதவை/விதவன்')}</option>
                  </select>
                </Field>
              </div>
            </SectionCard>

            {/* ③ Family Reference — only married male */}
            {isMarriedMale && (
              <SectionCard icon="🏠" title={L("Father's Family Reference","தந்தையின் குடும்ப குறிப்பு")} accent="amber">
                <div className="trp-grid-3">
                  <Field label={L("Father's Tax Ref","தந்தையின் வரி குறிப்பு")} hint={L("Link to father's tax record to auto-fill family details","தானாக நிரப்ப தந்தையின் வரி குறிப்பு எண்ணை உள்ளிடவும்")}>
                    <div className="trp-input-row">
                      <input className="trp-input" value={form.parentReferenceId} onChange={e => set('parentReferenceId', e.target.value)} placeholder={L('Enter reference…','குறிப்பு எண்…')} />
                      <button className="trp-btn trp-btn--outline trp-btn--icon" onClick={() => lookupFamilyByReference(form.parentReferenceId)} disabled={!form.parentReferenceId.trim() || lookingUp}>🔍</button>
                    </div>
                  </Field>
                  {form.parentReferenceId && (
                    <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:2 }}>
                      <div className="trp-family-badge">🔗 {L('Linked:','இணைக்கப்பட்டது:')} <strong>{form.parentReferenceId}</strong></div>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* ④ Personal Details */}
            <SectionCard
              icon="📝"
              title={L('Personal Details','தனிப்பட்ட விவரங்கள்')}
              action={
                <button
                  className={`trp-lock-btn ${autoLocked ? 'trp-lock-btn--locked' : 'trp-lock-btn--unlocked'}`}
                  onClick={() => setAutoLocked(v => !v)}
                  title={autoLocked ? L('Unlock fields','திற') : L('Lock fields','பூட்டு')}
                >
                  {autoLocked ? '🔒' : '🔓'} {autoLocked ? L('Locked','பூட்டப்பட்டது') : L('Unlocked','திறக்கப்பட்டது')}
                </button>
              }
            >
              <div className="trp-grid-4">
                {/* Mobile */}
                <Field label={L('Mobile Number','கைபேசி எண்')} required error={errors.mobileNumber}>
                  <div className="trp-relative" style={{ position:'relative' }}>
                    <input
                      type="tel"
                      ref={mobileInputRef}
                      className={`trp-input${errors.mobileNumber?' trp-input--error':''}`}
                      value={form.mobileNumber}
                      onChange={e => { handleMobileChange(e.target.value); if (showMobileResults) setShowMobileResults(false); }}
                      placeholder={L('Search by mobile…','கைபேசி எண்…')}
                      maxLength={12}
                      autoComplete="off"
                    />
                    {lookingUp && <div className="trp-dot-loader" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)' }}><span/><span/><span/></div>}
                    {showMobileResults && (
                      <div className="trp-dropdown">
                        {mobileResults.length > 0 ? mobileResults.map((row: any) => (
                          <button key={row.id} type="button" className="trp-dropdown-item" onClick={() => handleSelectMobile(row)}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <span className="trp-dropdown-name">{row.name}</span>
                              <span className="trp-dropdown-id">#{row.id}</span>
                            </div>
                            <div className="trp-dropdown-meta">
                              {row.mobile_number ? `📱 ${formatMobileNumber(row.mobile_number)}` : ''}
                              {row.village ? ` · ${row.village}` : ''}
                            </div>
                          </button>
                        )) : <div className="trp-dropdown-empty">{L('No matches','பொருந்தும் பதிவுகள் இல்லை')}</div>}
                      </div>
                    )}
                  </div>
                </Field>

                {/* Name */}
                <Field label={L('Name','பெயர்')} required error={errors.name}>
                  <div className="trp-relative" style={{ position:'relative' }}>
                    <input
                      ref={nameInputRef}
                      className={`trp-input${errors.name?' trp-input--error':''}`}
                      value={form.name}
                      onChange={e => { set('name', e.target.value); if (showNameResults) setShowNameResults(false); }}
                      placeholder={L('Type name to search…','பெயரைத் தட்டச்சு…')}
                    />
                    {nameLookingUp && <div className="trp-dot-loader" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)' }}><span/><span/><span/></div>}
                    {showNameResults && (
                      <div className="trp-dropdown">
                        {nameResults.length > 0 ? nameResults.map((row: any) => (
                          <button key={row.id} type="button" className="trp-dropdown-item" onClick={() => handleSelectRegistration(row)}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <span className="trp-dropdown-name">{row.name}</span>
                              <span className="trp-dropdown-id">#{row.id}</span>
                            </div>
                            <div className="trp-dropdown-meta">
                              {row.mobile_number ? `📱 ${formatMobileNumber(row.mobile_number)}` : ''}
                              {row.village ? ` · ${row.village}` : ''}
                            </div>
                          </button>
                        )) : <div className="trp-dropdown-empty">{L('No matches','பொருந்தும் பதிவுகள் இல்லை')}</div>}
                      </div>
                    )}
                  </div>
                </Field>

                <Field label={L('Last Name','கடைசி பெயர்')}>
                  <input className="trp-input" value={form.alternativeName} onChange={e => set('alternativeName', e.target.value)} />
                </Field>

                {/* Wife fields — married male only */}
                {isMarriedMale && (
                  <>
                    <Field label={L("Wife's Name","மனைவி பெயர்")}>
                      <input className="trp-input" value={form.wifeName} onChange={e => set('wifeName', e.target.value)} />
                    </Field>
                    <Field label={L("Wife's Father","மனைவி தந்தை")}>
                      <input className="trp-input" value={form.wifeFatherName} onChange={e => set('wifeFatherName', e.target.value)} />
                    </Field>
                    <Field label={L('Wife Contact','மனைவி தொடர்பு')}>
                      <input className="trp-input" value={form.wifeContact} onChange={e => set('wifeContact', e.target.value)} placeholder={L('Mobile/Phone','கைபேசி')} />
                    </Field>
                  </>
                )}

                {/* Locked fields */}
                <fieldset disabled={autoLocked} className="contents" style={{ all:'unset', display:'contents' }}>
                  <Field label={L('Father','தந்தை')} required error={errors.fatherName}>
                    <input className={`trp-input${errors.fatherName?' trp-input--error':''}`} value={form.fatherName} onChange={e => set('fatherName', e.target.value)} />
                  </Field>
                  <Field label={L('Birth Date','பிறந்த தேதி')}>
                    <input type="date" className="trp-input" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} />
                  </Field>
                  <Field label={L('Education','கல்வி')}>
                    <select className="trp-select" value={form.education} onChange={e => set('education', e.target.value)}>
                      <option value="">{L('Select','தேர்ந்தெடு')}</option>
                      {masterEducations.map(edu => <option key={edu} value={edu}>{edu}</option>)}
                    </select>
                  </Field>
                  <Field label={L('Occupation','தொழில்')}>
                    <select className="trp-select" value={form.occupation} onChange={e => set('occupation', e.target.value)}>
                      <option value="">{L('Select','தேர்ந்தெடு')}</option>
                      {masterOccupations.map(occ => <option key={occ} value={occ}>{occ}</option>)}
                    </select>
                  </Field>
                  <Field label={L('Village','கிராமம்')}>
                    <input className="trp-input" value={form.village} onChange={e => set('village', e.target.value)} />
                  </Field>
                </fieldset>

                {isMarriedMale && (
                  <div style={{ gridColumn: '1 / -1', display:'flex', alignItems:'center', gap:8, background:'var(--saffron-lt)', border:'1px solid #F5C9A9', borderRadius:6, padding:'8px 12px' }}>
                    <input type="checkbox" id="sep-family" checked={form.separateFromFamily} onChange={e => set('separateFromFamily', e.target.checked)} style={{ accentColor:'var(--saffron)', width:15, height:15, flexShrink:0 }} />
                    <label htmlFor="sep-family" style={{ fontSize:12, color:'var(--saffron)', fontWeight:600, cursor:'pointer' }}>
                      {L('Create Separate Tax ID (New Family Branch)','தனி வரி ID உருவாக்கு (புதிய குடும்ப கிளை)')}
                    </label>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* ⑤ Address */}
            <SectionCard icon="🏘" title={L('Address','முகவரி')} collapsible defaultOpen={false}>
              <fieldset disabled={autoLocked} style={{ all:'unset', display:'block' }}>
                <Field label={L('Full Address','முழு முகவரி')} required error={errors.address}>
                  <textarea className={`trp-textarea${errors.address?' trp-input--error':''}`} rows={3} value={form.address} onChange={e => set('address', e.target.value)} />
                </Field>
              </fieldset>
            </SectionCard>

            {/* ⑥ ID & Other Details */}
            <SectionCard icon="🪪" title={L('ID & Other Details','அடையாள விவரங்கள்')} collapsible defaultOpen={false}>
              <fieldset disabled={autoLocked} style={{ all:'unset', display:'block' }}>
                <div className="trp-grid-4">
                  <Field label={L('Aadhaar','ஆதார்')} error={errors.aadhaarNumber}>
                    <input className={`trp-input${errors.aadhaarNumber?' trp-input--error':''}`} value={form.aadhaarNumber} onChange={e => { const f = formatAadhaarNumber(e.target.value); setForm(p=>({...p,aadhaarNumber:f})); if(errors.aadhaarNumber) setErrors(p=>({...p,aadhaarNumber:''})); }} placeholder="XXXX-XXXX-XXXX" maxLength={14} />
                  </Field>
                  <Field label="PAN">
                    <input className="trp-input" value={form.panNumber} onChange={e => set('panNumber', e.target.value)} placeholder="AAAPX1234X" />
                  </Field>
                  <Field label={L('Clan','குலம்')}>
                    <select className="trp-select" value={form.clan} onChange={e => set('clan', e.target.value)}>
                      <option value="">{L('Select','தேர்ந்தெடு')}</option>
                      {masterClans.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label={L('Group','குழு')}>
                    <select className="trp-select" value={form.group} onChange={e => set('group', e.target.value)}>
                      <option value="">{L('Select','தேர்ந்தெடு')}</option>
                      {masterGroups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label={L('Postal Code','அஞ்சல் குறியீடு')}>
                    <input className="trp-input" value={form.postalCode} onChange={e => set('postalCode', e.target.value)} maxLength={6} />
                  </Field>
                  <Field label={L('Male Heirs','ஆண் வாரிசு')}>
                    <input type="number" className="trp-input" value={form.maleHeirs} onChange={e => set('maleHeirs', parseInt(e.target.value)||0)} min="0" />
                  </Field>
                  <Field label={L('Female Heirs','பெண் வாரிசு')}>
                    <input type="number" className="trp-input" value={form.femaleHeirs} onChange={e => set('femaleHeirs', parseInt(e.target.value)||0)} min="0" />
                  </Field>
                </div>
              </fieldset>
            </SectionCard>

            {/* ⑦ Cumulative Tax Breakdown */}
            {cumulativeInfo && taxBreakdown.length > 0 && (
              <SectionCard icon="📊" title={L('Outstanding Balance','நிலுவை கணக்கீடு')} accent="gold" collapsible defaultOpen>
                <div className="trp-grid-2">
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--ink-60)', marginBottom:8 }}>{L('Year-wise Breakdown','ஆண்டு வாரியாக')}</div>
                    {taxBreakdown.map((item: any) => (
                      <div key={item.year} className="trp-breakdown-row">
                        <div>
                          <div className="trp-breakdown-year">{item.year}</div>
                        </div>
                        <div className={`trp-breakdown-amt--${item.outstanding > 0 ? 'red':'green'}`}>
                          ₹{item.outstanding.toLocaleString()}
                        </div>
                      </div>
                    ))}
                    <div className="trp-breakdown-total">
                      <span>{L('Total Due','மொத்த நிலுவை')}</span>
                      <span>₹{cumulativeInfo.totalTaxDue.toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--ink-60)', marginBottom:8 }}>{L('Summary','சுருக்கம்')}</div>
                    <div className="trp-amount-tile" style={{ marginBottom:8 }}>
                      <div className="trp-amount-tile-label">{L('Previous Outstanding','முந்தைய நிலுவை')}</div>
                      <div className="trp-amount-tile-value trp-amount-tile-value--red">₹{cumulativeInfo.cumulativeOutstanding.toLocaleString()}</div>
                    </div>
                    <div className="trp-amount-tile" style={{ marginBottom:8 }}>
                      <div className="trp-amount-tile-label">{L('Current Year','தற்போதைய ஆண்டு')} ({form.year})</div>
                      <div className="trp-amount-tile-value trp-amount-tile-value--blue">₹{cumulativeInfo.currentYearTax.toLocaleString()}</div>
                    </div>
                    <div style={{ background:'var(--maroon-lt)', border:'1.5px solid var(--maroon)', borderRadius:8, padding:'10px 12px' }}>
                      <div className="trp-amount-tile-label" style={{ color:'var(--maroon)' }}>{L('Total Due','மொத்த நிலுவை')}</div>
                      <div className="trp-amount-tile-value">₹{cumulativeInfo.totalTaxDue.toLocaleString()}</div>
                    </div>
                    <p className="trp-tip" style={{ marginTop:8 }}>
                      {cumulativeInfo.hasExistingRegistration
                        ? `⚠ ${L('Only actual unpaid amounts included.','பதிவு செய்யப்பட்ட ஆண்டுகளில் செலுத்தாத தொகைகள் மட்டும்.')}`
                        : `🆕 ${L('NEW Registration: Previous years per Tax Settings.','புதிய பதிவு: வரி அமைப்பின் அடிப்படையில் முந்தைய ஆண்டுகள்.')}`}
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ⑧ Heirs */}
            <SectionCard
              icon="👨‍👩‍👦"
              title={L('Heirs Details','வாரிசு விவரம்')}
              collapsible
              defaultOpen={newUser.heirs.length > 0}
              action={
                <button className="trp-btn trp-btn--outline" style={{ fontSize:12, height:28, padding:'0 10px', color:'var(--maroon)', borderColor:'var(--maroon)' }} onClick={addHeir}>
                  + {L('Add Heir','வாரிசு சேர்')}
                </button>
              }
            >
              {newUser.heirs.length > 0 ? (
                <div style={{ overflowX:'auto' }}>
                  <table className="trp-heirs-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{L('Name','பெயர்')}</th>
                        <th>{L('Race','இனம்')}</th>
                        <th>{L('Status','நிலை')}</th>
                        <th>{L('Education','கல்வி')}</th>
                        <th>{L('DOB','பிறந்த தேதி')}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newUser.heirs.map((heir, index) => (
                        <tr key={heir.id}>
                          <td style={{ textAlign:'center', color:'var(--ink-60)', fontWeight:600 }}>{heir.serialNumber}</td>
                          <td>
                            <input
                              type="text"
                              value={heir.name}
                              onChange={e => updateHeir(heir.id, 'name', e.target.value)}
                              className={`trp-heirs-input${errors[`heir_${index}_name`]?' trp-input--error':''}`}
                              placeholder={L('Full name','முழு பெயர்')}
                            />
                          </td>
                          <td>
                            <select value={heir.race} onChange={e => updateHeir(heir.id,'race',e.target.value)} className={`trp-heirs-input${errors[`heir_${index}_race`]?' trp-input--error':''}`}>
                              <option value="">{L('Select','தேர்ந்தெடு')}</option>
                              {masterRaces.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          </td>
                          <td>
                            <select value={heir.maritalStatus} onChange={e => updateHeir(heir.id,'maritalStatus',e.target.value)} className="trp-heirs-input">
                              {maritalStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </td>
                          <td>
                            <select value={heir.education} onChange={e => updateHeir(heir.id,'education',e.target.value)} className="trp-heirs-input">
                              <option value="">{L('Select','தேர்ந்தெடு')}</option>
                              {masterEducations.map(edu => <option key={edu} value={edu}>{edu}</option>)}
                            </select>
                          </td>
                          <td>
                            <input type="date" value={heir.birthDate} onChange={e => updateHeir(heir.id,'birthDate',e.target.value)} className="trp-heirs-input" />
                          </td>
                          <td>
                            <button className="trp-heirs-remove" onClick={() => removeHeir(heir.id)} title="Remove">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'20px 0', color:'var(--ink-30)', fontSize:13 }}>
                  <div style={{ fontSize:28, marginBottom:6 }}>👥</div>
                  {L('No heirs added yet. Click "+ Add Heir" to begin.','வாரிசுகள் இல்லை. "+ வாரிசு சேர்" கிளிக் செய்யவும்.')}
                </div>
              )}
            </SectionCard>

          </div>

          {/* ─── RIGHT COLUMN ─── */}
          <div>

            {/* Photo */}
            <SectionCard icon="📷" title={L('Photo','புகைப்படம்')} collapsible defaultOpen>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                <label className="trp-photo-box" style={{ cursor:'pointer', width:'100%' }}>
                  {(!newUser.photo && existingPhotoUrl) ? (
                    <img src={existingPhotoUrl} alt="Profile" />
                  ) : newUser.photo ? (
                    <img src={URL.createObjectURL(newUser.photo)} alt="Preview" />
                  ) : (
                    <div className="trp-photo-placeholder">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                      <span>{L('Click to upload','கிளிக் செய்து பதிவேற்றவும்')}</span>
                      <span style={{ fontSize:10, marginTop:4, color:'var(--ink-30)' }}>Max 100KB</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhotoChange} />
                </label>
                {(newUser.photo || existingPhotoUrl) && (
                  <button className="trp-btn trp-btn--ghost" style={{ fontSize:11 }} onClick={() => { setNewUser(p=>({...p,photo:null})); setExistingPhotoUrl(null); }}>
                    🗑 {L('Remove','நீக்கு')}
                  </button>
                )}
              </div>
            </SectionCard>

            {/* Amounts */}
            <SectionCard icon="💰" title={L('Payment Summary','செலுத்தும் சுருக்கம்')} accent="saffron">
              {cumulativeInfo?.hasExistingRegistration && (
                <div style={{ 
                  background: '#FFFBEB', 
                  border: '1px solid #FDE68A', 
                  color: '#92400E', 
                  padding: '10px 12px', 
                  borderRadius: 8, 
                  fontSize: 12, 
                  fontWeight: 600, 
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <div>
                    {L(`Registered for ${form.year}`, `${form.year} ஆண்டிற்கு ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது`)}
                    {Number(cumulativeInfo.totalTaxDue) <= 0 && <span style={{ marginLeft: 6, color: '#15803D' }}>({L('Fully Paid', 'முழுமையாக செலுத்தப்பட்டது')})</span>}
                  </div>
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div className="trp-amount-tile">
                  <div className="trp-amount-tile-label">{L('Tax Amount','வரி தொகை')}</div>
                  <div className="trp-amount-tile-value">₹{Number(form.taxAmount||0).toLocaleString()}</div>
                </div>
                <div className="trp-amount-tile">
                  <div className="trp-amount-tile-label">{L('Total Due','மொத்த நிலுவை')}</div>
                  <div className="trp-amount-tile-value trp-amount-tile-value--red">₹{Number(form.outstandingAmount||0).toLocaleString()}</div>
                </div>
                <div className="trp-amount-tile trp-amount-tile--editable">
                  <div className="trp-amount-tile-label">{L('Amount to Pay','செலுத்தும் தொகை')} <span style={{ color:'#DC2626' }}>*</span></div>
                  <input
                    ref={amountPaidRef}
                    type="number"
                    className={`trp-input${errors.amountPaid?' trp-input--error':''}`}
                    value={form.amountPaid}
                    onFocus={e => e.currentTarget.select()}
                    onChange={e => handleAmountPaidChange(e.target.value)}
                    style={{ marginTop:4, fontSize:17, fontWeight:700, fontFamily:"'Playfair Display',serif", height:38 }}
                  />
                  {errors.amountPaid && <p className="trp-err-text">⚠ {errors.amountPaid}</p>}
                </div>
                <div className="trp-amount-tile">
                  <div className="trp-amount-tile-label">{L('Remaining Due','மீதமுள்ள நிலுவை')}</div>
                  <div className={`trp-amount-tile-value ${remainingDue > 0 ? 'trp-amount-tile-value--red' : 'trp-amount-tile-value--green'}`}>
                    ₹{remainingDue.toLocaleString()}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Actions */}
            <div className="trp-card" style={{ padding:14 }}>
              <button 
                className="trp-btn trp-btn--save" 
                disabled={saving || (cumulativeInfo?.hasExistingRegistration && Number(cumulativeInfo.totalTaxDue) <= 0)} 
                onClick={submit}
              >
                {saving ? (
                  <>
                    <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'trp-spin 0.7s linear infinite', display:'inline-block' }} />
                    {L('Saving…','சேமிக்கிறது…')}
                  </>
                ) : (cumulativeInfo?.hasExistingRegistration && Number(cumulativeInfo.totalTaxDue) <= 0) ? (
                  <>{L('Already Paid','ஏற்கனவே செலுத்தப்பட்டது')} ✓</>
                ) : (
                  <>{L('Save Registration','பதிவு சேமிக்க')} ✓</>
                )}
              </button>
              <div style={{ height:8 }} />
              <button className="trp-btn trp-btn--clear" onClick={clearForm}>
                🗑 {L('Clear All Fields','அனைத்தையும் அழி')}
              </button>

            
            </div>

          </div>
        </div>
      </div>

      {/* ── Direct Download Helper ── */}
      {(() => {
        const handleDownloadReceipt = async (id: number) => {
          try {
            const response = await fetch(`https://templeapi.agniplay.com/api/tax-registrations/${id}/receipt.pdf`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (!response.ok) {
              throw new Error('Failed to fetch receipt');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `tax-receipt-${id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          } catch (error) {
            console.error("Error downloading receipt:", error);
            alert(L("Failed to download receipt. Please try again.", "ரசீதைப் பதிவிறக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
          }
        };

        (window as any).taxHandleDownloadReceipt = handleDownloadReceipt;
        return null;
      })()}

      {/* ── Print Prompt Modal ── */}
      {showPrintPrompt && lastCreatedId != null && (
        <div className="trp-modal-overlay">
          <div className="trp-modal">
            <div className="trp-modal-header">
              <span>🖨 {L('Print Receipt','ரசீதை அச்சிடவா?')}</span>
              <button className="trp-modal-close" onClick={() => setShowPrintPrompt(false)}>×</button>
            </div>
            <div className="trp-modal-body">
              <p style={{ fontSize:14, color:'var(--ink-60)', marginBottom:20 }}>
                {L('Do you want to open the PDF receipt for printing?','PDF ரசீதை அச்சிட திறக்க விரும்புகிறீர்களா?')}
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button className="trp-btn trp-btn--outline" onClick={() => setShowPrintPrompt(false)}>
                  {L('No','இல்லை')}
                </button>
                <button className="trp-btn trp-btn--primary" onClick={() => {
                  (window as any).taxHandleDownloadReceipt(lastCreatedId);
                  setShowPrintPrompt(false);
                }}>
                  🖨 {L('Yes, Print','ஆம், அச்சிடு')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {showSuccessModal && (
        <div className="trp-modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="trp-modal" style={{ maxWidth:380 }} onClick={e => e.stopPropagation()}>
            <div className="trp-modal-header" style={{ background:'linear-gradient(135deg,#15803D,#166534)' }}>
              <span>✅ {L('Success','வெற்றி')}</span>
              <button className="trp-modal-close" onClick={() => setShowSuccessModal(false)}>×</button>
            </div>
            <div className="trp-modal-body" style={{ textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
              <p style={{ fontSize:13, color:'var(--ink-60)', marginBottom:20, lineHeight:1.6 }}>{successMessage}</p>
              <button className="trp-btn trp-btn--primary" style={{ background:'linear-gradient(135deg,#15803D,#166534)', minWidth:100 }} onClick={() => setShowSuccessModal(false)}>
                {L('OK','சரி')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
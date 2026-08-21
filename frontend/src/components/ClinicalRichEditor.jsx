import React, { useRef, useEffect } from 'react';

export default function ClinicalRichEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Type here...', 
  minHeight = '80px',
  borderColor = '#CBD5E1',
  focusBorderColor = '#2563EB',
  accentColor = '#2563EB'
}) {
  const editorRef = useRef(null);
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html === '<br>' ? '' : html);
    }
  };

  const applyFormat = (command, val = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, val);
      handleInput();
    }
  };

  const applyHighlight = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('hiliteColor', false, '#FEF08A');
      handleInput();
    }
  };

  return (
    <div style={{
      border: `1.5px solid ${borderColor}`,
      borderRadius: '10px',
      background: '#FFFFFF',
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
    }}>
      {/* Formatting Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 10px',
        background: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
        userSelect: 'none',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }}
          title="Bold (Ctrl+B)"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            fontWeight: 800,
            fontSize: '13px',
            color: '#1E293B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: '0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
        >
          B
        </button>

        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }}
          title="Italic (Ctrl+I)"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: '13px',
            color: '#1E293B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: '0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
        >
          I
        </button>

        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }}
          title="Underline (Ctrl+U)"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            textDecoration: 'underline',
            fontWeight: 700,
            fontSize: '13px',
            color: '#1E293B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: '0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
        >
          U
        </button>

        <div style={{ width: '1px', height: '18px', background: '#CBD5E1', margin: '0 4px' }} />

        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyHighlight(); }}
          title="Highlight Text"
          style={{
            padding: '0 10px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #FDE047',
            background: '#FEF08A',
            fontWeight: 750,
            fontSize: '12px',
            color: '#854D0E',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: '0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#FDE047'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#FEF08A'}
        >
          <span>🖍️</span> Highlight
        </button>

        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('insertUnorderedList'); }}
          title="Bullet List"
          style={{
            padding: '0 10px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            fontWeight: 700,
            fontSize: '12px',
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: '0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
        >
          <span>•</span> Bullet List
        </button>

        <div style={{ flexGrow: 1 }} />

        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('removeFormat'); }}
          title="Clear Formatting"
          style={{
            padding: '0 8px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid transparent',
            background: 'transparent',
            fontWeight: 600,
            fontSize: '11px',
            color: '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            transition: '0.15s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEF2F2'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
        >
          Clear Format
        </button>
      </div>

      {/* Editable Input Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        style={{
          minHeight,
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: 500,
          color: '#1E293B',
          lineHeight: '1.6',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
}

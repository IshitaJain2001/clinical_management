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

  // Smart formatter that formats ONLY the selected word/phrase and never spills over to subsequent typing
  const applySmartFormat = (tag, customStyles = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let range = sel.getRangeAt(0);

    // If no text is selected, auto-select the current word where cursor is resting
    if (range.collapsed) {
      const node = sel.anchorNode;
      if (node && node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const offset = sel.anchorOffset;
        
        let start = offset;
        while (start > 0 && /\S/.test(text[start - 1])) {
          start--;
        }
        let end = offset;
        while (end < text.length && /\S/.test(text[end])) {
          end++;
        }

        if (start < end) {
          range = document.createRange();
          range.setStart(node, start);
          range.setEnd(node, end);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }

    if (!range.collapsed) {
      // Check if already wrapped in this tag (to toggle off)
      let parentEl = range.commonAncestorContainer;
      if (parentEl.nodeType === Node.TEXT_NODE) parentEl = parentEl.parentElement;
      
      const existingTag = parentEl && (parentEl.closest ? parentEl.closest(tag) : null);
      if (existingTag && editorRef.current.contains(existingTag)) {
        // Unwrap
        const parent = existingTag.parentNode;
        while (existingTag.firstChild) {
          parent.insertBefore(existingTag.firstChild, existingTag);
        }
        parent.removeChild(existingTag);
        handleInput();
        return;
      }

      const selectedContent = range.extractContents();
      const wrapper = document.createElement(tag);
      if (customStyles) {
        Object.assign(wrapper.style, customStyles);
      }
      wrapper.appendChild(selectedContent);
      range.insertNode(wrapper);

      // Create a plain text space after the formatted element so subsequent typing is 100% normal/unbold
      const afterSpace = document.createTextNode('\u00A0');
      if (wrapper.nextSibling) {
        wrapper.parentNode.insertBefore(afterSpace, wrapper.nextSibling);
      } else {
        wrapper.parentNode.appendChild(afterSpace);
      }

      // Position the cursor after the space in normal unstyled space
      const newRange = document.createRange();
      newRange.setStartAfter(afterSpace);
      newRange.setEndAfter(afterSpace);
      sel.removeAllRanges();
      sel.addRange(newRange);

      handleInput();
    } else {
      // Toggle standard execCommand fallback
      const cmd = tag === 'strong' ? 'bold' : (tag === 'em' ? 'italic' : (tag === 'u' ? 'underline' : 'bold'));
      document.execCommand(cmd, false, null);
      handleInput();
    }
  };

  const applyBulletList = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertUnorderedList', false, null);
      handleInput();
    }
  };

  const clearFormatting = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('removeFormat', false, null);
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
      <style>{`
        .clinical-rich-content[contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block;
          font-weight: 500;
        }
        .clinical-rich-content ul {
          margin: 4px 0;
          padding-left: 20px;
        }
        .clinical-rich-content li {
          margin-bottom: 4px;
        }
        .clinical-rich-content strong {
          font-weight: 800;
          color: #0F172A;
        }
        .clinical-rich-content mark {
          background-color: #FEF08A;
          padding: 1px 4px;
          border-radius: 4px;
          color: #854D0E;
        }
      `}</style>

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
          onMouseDown={(e) => { e.preventDefault(); applySmartFormat('strong'); }}
          title="Bold Selection (Only selected word will be bold)"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            fontWeight: 900,
            fontSize: '13px',
            color: '#0F172A',
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
          onMouseDown={(e) => { e.preventDefault(); applySmartFormat('em'); }}
          title="Italic Selection"
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
          onMouseDown={(e) => { e.preventDefault(); applySmartFormat('u'); }}
          title="Underline Selection"
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
          onMouseDown={(e) => { 
            e.preventDefault(); 
            applySmartFormat('mark', { backgroundColor: '#FEF08A', padding: '1px 4px', borderRadius: '4px', color: '#854D0E' }); 
          }}
          title="Highlight Selection (Soft yellow)"
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
          onMouseDown={(e) => { e.preventDefault(); applyBulletList(); }}
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
          onMouseDown={(e) => { e.preventDefault(); clearFormatting(); }}
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
        className="clinical-rich-content"
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

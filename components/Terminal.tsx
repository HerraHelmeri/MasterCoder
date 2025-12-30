import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onTerminalReady?: (id: string | null) => void;
  height?: number;
  onResize?: (height: number) => void;
  onNewTerminal?: () => void;
  title?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ isOpen, onClose, onTerminalReady, height = 192, onResize, onNewTerminal, title = 'Terminal' }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const terminalIdRef = useRef<string | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const removeListenerRef = useRef<(() => void) | null>(null);
  const setupCounterRef = useRef(0);
  const [isReady, setIsReady] = useState(false);
  const dragStateRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const pendingHeightRef = useRef<number | null>(null);
  const fitFrameRef = useRef<number | null>(null);

  const setupTerminal = async () => {
    if (!containerRef.current) return;
    setupCounterRef.current += 1;
    const setupId = setupCounterRef.current;
    containerRef.current.innerHTML = '';
    const id = await window.api.terminal.create();
    if (setupId !== setupCounterRef.current || !containerRef.current) {
      window.api.terminal.kill(id);
      return;
    }
    terminalIdRef.current = id;
    onTerminalReady?.(id);

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    term.options.linkHandler = {
      activate: (_event, uri) => {
        window.open(uri, '_blank');
      }
    };
    if (term.element) {
      term.element.style.height = '100%';
      term.element.style.width = '100%';
    }
    fit.fit();
    window.api.terminal.resize(id, term.cols, term.rows);
    term.focus();

    const fitTerminal = () => {
      fit.fit();
      window.api.terminal.resize(id, term.cols, term.rows);
    };

    term.onData(data => {
      window.api.terminal.write(id, data);
    });

    term.attachCustomKeyEventHandler((event) => {
      if (!event.ctrlKey) return true;
      const key = event.key.toLowerCase();
      if (key === 'c') {
        if (term.hasSelection()) {
          navigator.clipboard.writeText(term.getSelection());
          term.clearSelection();
          return false;
        }
      }
      if (key === 'v') {
        navigator.clipboard.readText().then(text => {
          if (text) term.paste(text);
        });
        return false;
      }
      return true;
    });

    removeListenerRef.current = window.api.terminal.onData(payload => {
      if (payload.id === id) {
        term.write(payload.data);
      }
    });

    const observer = new ResizeObserver(() => {
      if (dragStateRef.current) return;
      if (fitFrameRef.current !== null) return;
      fitFrameRef.current = window.requestAnimationFrame(() => {
        fitTerminal();
        fitFrameRef.current = null;
      });
    });
    observer.observe(containerRef.current);

    terminalRef.current = term;
    fitRef.current = fit;
    resizeObserverRef.current = observer;
    setIsReady(true);
  };

  const cleanupTerminal = () => {
    setupCounterRef.current += 1;
    onTerminalReady?.(null);
    removeListenerRef.current?.();
    removeListenerRef.current = null;
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    terminalRef.current?.dispose();
    terminalRef.current = null;
    fitRef.current = null;
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    if (fitFrameRef.current !== null) {
      window.cancelAnimationFrame(fitFrameRef.current);
      fitFrameRef.current = null;
    }
    if (terminalIdRef.current) {
      window.api.terminal.kill(terminalIdRef.current);
      terminalIdRef.current = null;
    }
    setIsReady(false);
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupTerminal();
      return;
    }

    setupTerminal();
    return () => cleanupTerminal();
  }, [isOpen]);

  useEffect(() => {
    if (!wrapperRef.current || dragStateRef.current) return;
    wrapperRef.current.style.height = `${height}px`;
  }, [height]);

  useEffect(() => {
    if (!onResize) return;
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStateRef.current) return;
      const delta = dragStateRef.current.startY - event.clientY;
      const nextHeight = Math.max(120, dragStateRef.current.startHeight + delta);
      pendingHeightRef.current = nextHeight;
      if (wrapperRef.current) {
        wrapperRef.current.style.height = `${nextHeight}px`;
      }
      if (resizeFrameRef.current !== null) return;
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        // Keep re-renders off the hot path; we apply state on mouseup.
        resizeFrameRef.current = null;
      });
    };
    const handleMouseUp = () => {
      dragStateRef.current = null;
      document.body.style.cursor = '';
      if (pendingHeightRef.current !== null) {
        onResize?.(pendingHeightRef.current);
      }
      if (terminalRef.current && fitRef.current && terminalIdRef.current) {
        fitRef.current.fit();
        window.api.terminal.resize(terminalIdRef.current, terminalRef.current.cols, terminalRef.current.rows);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      if (fitFrameRef.current !== null) {
        window.cancelAnimationFrame(fitFrameRef.current);
        fitFrameRef.current = null;
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onResize]);

  if (!isOpen) return null;

  return (
    <div ref={wrapperRef} className="border-t border-neutral-700 bg-neutral-900 flex flex-col shrink-0" style={{ height }}>
      <div
        className="h-1.5 cursor-row-resize bg-neutral-900"
        onMouseDown={(event) => {
          if (!onResize) return;
          dragStateRef.current = { startY: event.clientY, startHeight: height };
          document.body.style.cursor = 'row-resize';
        }}
      />
      <div className="flex items-center justify-between px-4 py-1.5 bg-neutral-900">
        <div className="flex items-center space-x-6 text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">
          <span className="cursor-pointer text-white border-b border-white pb-1">{title}</span>
          <span className="cursor-pointer hover:text-neutral-300 transition-colors">Output</span>
          <span className="cursor-pointer hover:text-neutral-300 transition-colors">Debug Console</span>
          <span className="cursor-pointer hover:text-neutral-300 transition-colors">Problems</span>
        </div>
        <div className="flex items-center space-x-3 text-neutral-300">
          <Plus
            size={14}
            className="cursor-pointer hover:text-white"
            onClick={() => onNewTerminal?.()}
          />
          <Trash2
            size={14}
            className={`cursor-pointer hover:text-white ${!isReady ? 'opacity-40' : ''}`}
            onClick={() => terminalRef.current?.clear()}
          />
          <ChevronUp size={14} className="cursor-pointer hover:text-white" />
          <X size={14} className="cursor-pointer hover:text-white" onClick={onClose} />
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden relative" />
    </div>
  );
};

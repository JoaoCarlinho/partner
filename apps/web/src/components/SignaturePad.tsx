/**
 * SignaturePad - Canvas-based digital signature component
 * Story 5.5: Digital Signature Capture
 * (AC-5.5.1, AC-5.5.2, AC-5.5.3, AC-5.5.4, AC-5.5.6)
 */

'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useCallback,
  MouseEvent,
  TouchEvent,
} from 'react';

/**
 * Signature data interface (AC-5.5.4)
 */
export interface SignatureData {
  /** Base64 PNG data URL */
  dataUrl: string;
  /** ISO timestamp when signature was captured */
  timestamp: string;
  /** Canvas dimensions */
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * SignaturePad props
 */
export interface SignaturePadProps {
  /** Canvas width in pixels (default: 400) */
  width?: number;
  /** Canvas height in pixels (default: 200) */
  height?: number;
  /** Stroke color (default: '#000000') */
  strokeColor?: string;
  /** Stroke width in pixels (default: 2) */
  strokeWidth?: number;
  /** Background color (default: '#ffffff') */
  backgroundColor?: string;
  /** Callback when signature changes */
  onSignatureChange?: (hasSignature: boolean) => void;
  /** Custom class name for the container */
  className?: string;
}

/**
 * SignaturePad ref methods
 */
export interface SignaturePadRef {
  /** Clear the signature pad */
  clear: () => void;
  /** Check if the pad is empty */
  isEmpty: () => boolean;
  /** Get signature data as base64 PNG (returns null if empty) */
  getSignatureData: () => SignatureData | null;
}

/**
 * Get position from mouse or touch event relative to canvas
 */
function getEventPosition(
  event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();

  if ('touches' in event) {
    // Touch event
    const touch = event.touches[0] || event.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  } else {
    // Mouse event
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
}

/**
 * SignaturePad - HTML5 Canvas-based signature capture component
 */
export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  function SignaturePad(
    {
      width = 400,
      height = 200,
      strokeColor = '#000000',
      strokeWidth = 2,
      backgroundColor = '#ffffff',
      onSignatureChange,
      className = '',
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(false);
    const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

    /**
     * Initialize canvas context
     */
    const getContext = useCallback((): CanvasRenderingContext2D | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext('2d');
    }, []);

    /**
     * Clear canvas and reset state (AC-5.5.3)
     */
    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = getContext();
      if (!canvas || !ctx) return;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasContent(false);
      onSignatureChange?.(false);
    }, [backgroundColor, getContext, onSignatureChange]);

    /**
     * Check if canvas is empty
     */
    const isEmpty = useCallback((): boolean => {
      return !hasContent;
    }, [hasContent]);

    /**
     * Get signature as base64 PNG (AC-5.5.4)
     */
    const getSignatureData = useCallback((): SignatureData | null => {
      const canvas = canvasRef.current;
      if (!canvas || !hasContent) return null;

      return {
        dataUrl: canvas.toDataURL('image/png'),
        timestamp: new Date().toISOString(),
        dimensions: {
          width: canvas.width,
          height: canvas.height,
        },
      };
    }, [hasContent]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        clear,
        isEmpty,
        getSignatureData,
      }),
      [clear, isEmpty, getSignatureData]
    );

    /**
     * Initialize canvas on mount
     */
    useEffect(() => {
      clear();
    }, [clear]);

    /**
     * Start drawing (AC-5.5.2)
     */
    const startDrawing = useCallback(
      (event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const ctx = getContext();
        if (!canvas || !ctx) return;

        // Prevent scrolling while drawing on mobile (AC-5.5.2)
        if ('touches' in event) {
          event.preventDefault();
        }

        const pos = getEventPosition(event, canvas);
        lastPositionRef.current = pos;
        setIsDrawing(true);

        // Start path
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      },
      [getContext, strokeColor, strokeWidth]
    );

    /**
     * Continue drawing (AC-5.5.2)
     */
    const draw = useCallback(
      (event: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const ctx = getContext();
        if (!canvas || !ctx) return;

        // Prevent scrolling while drawing on mobile
        if ('touches' in event) {
          event.preventDefault();
        }

        const pos = getEventPosition(event, canvas);

        // Draw line from last position to current
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        lastPositionRef.current = pos;

        // Mark as having content
        if (!hasContent) {
          setHasContent(true);
          onSignatureChange?.(true);
        }
      },
      [isDrawing, getContext, hasContent, onSignatureChange]
    );

    /**
     * Stop drawing (AC-5.5.2)
     */
    const stopDrawing = useCallback(() => {
      if (isDrawing) {
        const ctx = getContext();
        if (ctx) {
          ctx.closePath();
        }
        setIsDrawing(false);
        lastPositionRef.current = null;
      }
    }, [isDrawing, getContext]);

    return (
      <div className={`signature-pad ${className}`} data-testid="signature-pad">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-gray-300 rounded-lg cursor-crosshair touch-none"
          style={{ backgroundColor }}
          // Mouse events (AC-5.5.2)
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          // Touch events for tablet/mobile (AC-5.5.2)
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          role="img"
          aria-label="Signature pad - draw your signature"
          tabIndex={0}
          data-testid="signature-canvas"
        />
      </div>
    );
  }
);

export default SignaturePad;

/**
 * Unit tests for SignaturePad component
 * Story 5.5: Digital Signature Capture
 * (AC-5.5.1, AC-5.5.2, AC-5.5.3, AC-5.5.4)
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SignaturePad, SignaturePadRef } from '../SignaturePad';

// Mock canvas context
const mockContext = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  lineCap: '',
  lineJoin: '',
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  closePath: jest.fn(),
};

// Mock canvas
const mockCanvas = {
  getContext: jest.fn(() => mockContext),
  toDataURL: jest.fn(() => 'data:image/png;base64,mockdata'),
  width: 400,
  height: 200,
  getBoundingClientRect: jest.fn(() => ({
    left: 0,
    top: 0,
    width: 400,
    height: 200,
  })),
};

// Mock HTMLCanvasElement.prototype.getContext
beforeEach(() => {
  jest.clearAllMocks();
  HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext) as any;
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mockdata');
});

describe('SignaturePad', () => {
  describe('AC-5.5.1: Canvas initialization', () => {
    it('should render canvas element', () => {
      render(<SignaturePad />);
      const canvas = screen.getByTestId('signature-canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas.tagName).toBe('CANVAS');
    });

    it('should render with default dimensions (400x200)', () => {
      render(<SignaturePad />);
      const canvas = screen.getByTestId('signature-canvas');
      expect(canvas).toHaveAttribute('width', '400');
      expect(canvas).toHaveAttribute('height', '200');
    });

    it('should render with custom dimensions', () => {
      render(<SignaturePad width={500} height={250} />);
      const canvas = screen.getByTestId('signature-canvas');
      expect(canvas).toHaveAttribute('width', '500');
      expect(canvas).toHaveAttribute('height', '250');
    });

    it('should have proper accessibility attributes', () => {
      render(<SignaturePad />);
      const canvas = screen.getByTestId('signature-canvas');
      expect(canvas).toHaveAttribute('role', 'img');
      expect(canvas).toHaveAttribute('aria-label', 'Signature pad - draw your signature');
      expect(canvas).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('AC-5.5.2: Drawing functionality', () => {
    it('should handle mouse down event', () => {
      render(<SignaturePad />);
      const canvas = screen.getByTestId('signature-canvas');

      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalled();
    });

    it('should handle mouse move while drawing', () => {
      render(<SignaturePad />);
      const canvas = screen.getByTestId('signature-canvas');

      // Start drawing
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
      // Draw
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 60 });

      expect(mockContext.lineTo).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('should handle mouse up to stop drawing', () => {
      render(<SignaturePad />);
      const canvas = screen.getByTestId('signature-canvas');

      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
      fireEvent.mouseUp(canvas);

      expect(mockContext.closePath).toHaveBeenCalled();
    });

    it('should handle touch events for mobile', () => {
      render(<SignaturePad />);
      const canvas = screen.getByTestId('signature-canvas');

      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 100, clientY: 50 }],
      });

      expect(mockContext.beginPath).toHaveBeenCalled();
    });

    it('should call onSignatureChange when drawing starts', () => {
      const onSignatureChange = jest.fn();
      render(<SignaturePad onSignatureChange={onSignatureChange} />);
      const canvas = screen.getByTestId('signature-canvas');

      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 60 });

      expect(onSignatureChange).toHaveBeenCalledWith(true);
    });
  });

  describe('AC-5.5.3: Clear functionality', () => {
    it('should clear canvas via ref.clear()', async () => {
      const ref = React.createRef<SignaturePadRef>();
      render(<SignaturePad ref={ref} />);

      // Draw something first
      const canvas = screen.getByTestId('signature-canvas');
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 60 });
      fireEvent.mouseUp(canvas);

      // Clear
      await act(async () => {
        ref.current?.clear();
      });

      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should return true for isEmpty after clear', async () => {
      const ref = React.createRef<SignaturePadRef>();
      render(<SignaturePad ref={ref} />);

      // Draw something
      const canvas = screen.getByTestId('signature-canvas');
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 60 });
      fireEvent.mouseUp(canvas);

      // Clear
      await act(async () => {
        ref.current?.clear();
      });

      expect(ref.current?.isEmpty()).toBe(true);
    });

    it('should call onSignatureChange(false) when cleared', async () => {
      const onSignatureChange = jest.fn();
      const ref = React.createRef<SignaturePadRef>();
      render(<SignaturePad ref={ref} onSignatureChange={onSignatureChange} />);

      // Draw something
      const canvas = screen.getByTestId('signature-canvas');
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 60 });

      // Clear
      await act(async () => {
        ref.current?.clear();
      });

      expect(onSignatureChange).toHaveBeenLastCalledWith(false);
    });
  });

  describe('AC-5.5.4: Signature export', () => {
    it('should return null when canvas is empty', () => {
      const ref = React.createRef<SignaturePadRef>();
      render(<SignaturePad ref={ref} />);

      const data = ref.current?.getSignatureData();
      expect(data).toBeNull();
    });

    it('should return SignatureData with correct format when has content', () => {
      const ref = React.createRef<SignaturePadRef>();
      render(<SignaturePad ref={ref} />);

      // Draw something
      const canvas = screen.getByTestId('signature-canvas');
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 60 });
      fireEvent.mouseUp(canvas);

      const data = ref.current?.getSignatureData();

      expect(data).not.toBeNull();
      expect(data?.dataUrl).toMatch(/^data:image\/png;base64,/);
      expect(data?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(data?.dimensions).toEqual({ width: 400, height: 200 });
    });

    it('should return valid base64 PNG dataUrl', () => {
      const ref = React.createRef<SignaturePadRef>();
      render(<SignaturePad ref={ref} />);

      // Draw something
      const canvas = screen.getByTestId('signature-canvas');
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 60 });
      fireEvent.mouseUp(canvas);

      const data = ref.current?.getSignatureData();

      expect(data?.dataUrl).toBe('data:image/png;base64,mockdata');
    });
  });

  describe('isEmpty detection', () => {
    it('should return true initially', () => {
      const ref = React.createRef<SignaturePadRef>();
      render(<SignaturePad ref={ref} />);

      expect(ref.current?.isEmpty()).toBe(true);
    });

    it('should return false after drawing', () => {
      const ref = React.createRef<SignaturePadRef>();
      render(<SignaturePad ref={ref} />);

      const canvas = screen.getByTestId('signature-canvas');
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 60 });
      fireEvent.mouseUp(canvas);

      expect(ref.current?.isEmpty()).toBe(false);
    });
  });
});

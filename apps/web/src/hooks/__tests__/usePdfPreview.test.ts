import { renderHook, act, waitFor } from '@testing-library/react';
import { usePdfPreview } from '../usePdfPreview';

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();

beforeAll(() => {
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateObjectURL.mockReturnValue('blob:mock-url');
  localStorage.clear();
  localStorage.setItem('authToken', 'test-token');
});

describe('usePdfPreview', () => {
  const letterId = 'test-letter-123';

  // AC-6.1.3: PDF fetched from GET /api/v1/demands/{id}/preview
  describe('PDF Fetching (AC-6.1.3)', () => {
    it('calls correct API endpoint with Bearer token', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const { result } = renderHook(() => usePdfPreview({ letterId }));

      await act(async () => {
        await result.current.fetchPdf();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/demands/${letterId}/preview`),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            Accept: 'application/pdf',
          }),
        })
      );
    });

    it('creates object URL from blob response', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const { result } = renderHook(() => usePdfPreview({ letterId }));

      await act(async () => {
        await result.current.fetchPdf();
      });

      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(result.current.pdfUrl).toBe('blob:mock-url');
    });
  });

  // AC-6.1.4: Loading spinner shown while PDF loads
  describe('Loading State (AC-6.1.4)', () => {
    it('sets isLoading true during fetch', async () => {
      let resolveBlob: (blob: Blob) => void;
      const blobPromise = new Promise<Blob>((resolve) => {
        resolveBlob = resolve;
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        blob: () => blobPromise,
      });

      const { result } = renderHook(() => usePdfPreview({ letterId }));

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.fetchPdf();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolveBlob!(new Blob(['pdf'], { type: 'application/pdf' }));
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  // AC-6.1.8: Error state displays with retry option on failure
  describe('Error Handling (AC-6.1.8)', () => {
    it('sets error message on 403 forbidden', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const { result } = renderHook(() => usePdfPreview({ letterId }));

      await act(async () => {
        await result.current.fetchPdf();
      });

      expect(result.current.error).toBe("You don't have permission to view this PDF");
    });

    it('sets error message on 404 not found', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => usePdfPreview({ letterId }));

      await act(async () => {
        await result.current.fetchPdf();
      });

      expect(result.current.error).toBe('Letter not found');
    });

    it('sets error message on 500 server error', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => usePdfPreview({ letterId }));

      await act(async () => {
        await result.current.fetchPdf();
      });

      expect(result.current.error).toBe('Unable to generate PDF. Please try again.');
    });
  });

  // AC-6.2.3: Downloaded filename format: demand-letter-{id}.pdf
  describe('Filename Generation (AC-6.2.3)', () => {
    it('generates correct filename format', () => {
      const { result } = renderHook(() => usePdfPreview({ letterId }));

      expect(result.current.filename).toBe(`demand-letter-${letterId}.pdf`);
    });
  });

  // Memory cleanup
  describe('Memory Cleanup', () => {
    it('revokes object URL on clearPdf', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const { result } = renderHook(() => usePdfPreview({ letterId }));

      await act(async () => {
        await result.current.fetchPdf();
      });

      expect(result.current.pdfUrl).toBe('blob:mock-url');

      act(() => {
        result.current.clearPdf();
      });

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      expect(result.current.pdfUrl).toBe(null);
    });

    it('revokes previous URL when fetching new PDF', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      mockCreateObjectURL
        .mockReturnValueOnce('blob:first-url')
        .mockReturnValueOnce('blob:second-url');

      const { result } = renderHook(() => usePdfPreview({ letterId }));

      await act(async () => {
        await result.current.fetchPdf();
      });

      expect(result.current.pdfUrl).toBe('blob:first-url');

      await act(async () => {
        await result.current.fetchPdf();
      });

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:first-url');
      expect(result.current.pdfUrl).toBe('blob:second-url');
    });
  });
});

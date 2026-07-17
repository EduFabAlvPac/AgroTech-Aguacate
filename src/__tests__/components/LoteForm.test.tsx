import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoteForm } from '@/components/cultivos/LoteForm'
import type { Lote } from '@prisma/client'

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('LoteForm', () => {
  const defaultProps = {
    fincaId: 'finca-123',
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('Creation mode (no lote prop)', () => {
    /**
     * Validates: Requirements 1.1
     * Verifies the form renders with all fields empty in creation mode
     */
    it('renders with all fields empty when no lote prop is provided', () => {
      render(<LoteForm {...defaultProps} />)

      const nombreInput = screen.getByLabelText('Nombre del lote') as HTMLInputElement
      const areaInput = screen.getByLabelText('Área (ha)') as HTMLInputElement
      const altitudInput = screen.getByLabelText('Altitud (msnm)') as HTMLInputElement
      const pendienteInput = screen.getByLabelText('Pendiente (°)') as HTMLInputElement
      const notasInput = screen.getByLabelText('Notas') as HTMLTextAreaElement

      expect(nombreInput.value).toBe('')
      expect(areaInput.value).toBe('')
      expect(altitudInput.value).toBe('')
      expect(pendienteInput.value).toBe('')
      expect(notasInput.value).toBe('')
    })

    it('renders "Crear lote" submit button in creation mode', () => {
      render(<LoteForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Crear lote' })).toBeInTheDocument()
    })
  })

  describe('Edit mode (lote prop provided)', () => {
    const mockLote: Lote = {
      id: 'lote-1',
      nombre: 'Lote Norte',
      fincaId: 'finca-123',
      areaHa: 2.5,
      altitud: 1800,
      pendiente: 15,
      notas: 'Zona soleada con buen drenaje',
      geoJson: null,
      lat: null,
      lng: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    }

    /**
     * Validates: Requirements 2.1
     * Verifies fields are pre-loaded with existing lote values in edit mode
     */
    it('renders with pre-filled values when lote prop is provided', () => {
      render(<LoteForm {...defaultProps} lote={mockLote} />)

      const nombreInput = screen.getByLabelText('Nombre del lote') as HTMLInputElement
      const areaInput = screen.getByLabelText('Área (ha)') as HTMLInputElement
      const altitudInput = screen.getByLabelText('Altitud (msnm)') as HTMLInputElement
      const pendienteInput = screen.getByLabelText('Pendiente (°)') as HTMLInputElement
      const notasInput = screen.getByLabelText('Notas') as HTMLTextAreaElement

      expect(nombreInput.value).toBe('Lote Norte')
      expect(areaInput.value).toBe('2.5')
      expect(altitudInput.value).toBe('1800')
      expect(pendienteInput.value).toBe('15')
      expect(notasInput.value).toBe('Zona soleada con buen drenaje')
    })

    it('renders "Guardar cambios" submit button in edit mode', () => {
      render(<LoteForm {...defaultProps} lote={mockLote} />)

      expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    })
  })

  describe('Validation errors', () => {
    /**
     * Validates: Requirements 2.3
     * Verifies inline error messages when nombre is empty
     */
    it('shows error message when submitting with empty nombre', async () => {
      const user = userEvent.setup()
      render(<LoteForm {...defaultProps} />)

      // Set areaHa to a valid value but leave nombre empty
      const areaInput = screen.getByLabelText('Área (ha)')
      await user.type(areaInput, '2.5')

      const submitButton = screen.getByRole('button', { name: 'Crear lote' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
      })

      // Should NOT call fetch since validation failed
      expect(mockFetch).not.toHaveBeenCalled()
    })

    /**
     * Validates: Requirements 2.3
     * Verifies that areaHa with value 0 prevents form submission via native + Zod validation
     */
    it('prevents submission when areaHa is 0', async () => {
      const user = userEvent.setup()
      render(<LoteForm {...defaultProps} />)

      const nombreInput = screen.getByLabelText('Nombre del lote')
      const areaInput = screen.getByLabelText('Área (ha)') as HTMLInputElement

      await user.type(nombreInput, 'Lote Test')
      fireEvent.change(areaInput, { target: { value: '0' } })

      const submitButton = screen.getByRole('button', { name: 'Crear lote' })
      await user.click(submitButton)

      // Native constraint validation prevents submission (min="0.01")
      // The form's handleSubmit never runs, so no fetch is called
      expect(mockFetch).not.toHaveBeenCalled()
      // Verify the input is natively invalid
      expect(areaInput.validity.rangeUnderflow).toBe(true)
    })

    it('prevents submission when areaHa is negative', async () => {
      const user = userEvent.setup()
      render(<LoteForm {...defaultProps} />)

      const nombreInput = screen.getByLabelText('Nombre del lote')
      const areaInput = screen.getByLabelText('Área (ha)') as HTMLInputElement

      await user.type(nombreInput, 'Lote Test')
      fireEvent.change(areaInput, { target: { value: '-5' } })

      const submitButton = screen.getByRole('button', { name: 'Crear lote' })
      await user.click(submitButton)

      // Native constraint validation prevents submission (min="0.01")
      expect(mockFetch).not.toHaveBeenCalled()
      expect(areaInput.validity.rangeUnderflow).toBe(true)
    })
  })
})

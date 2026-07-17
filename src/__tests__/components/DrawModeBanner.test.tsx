import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DrawModeBanner } from '@/components/mapa/DrawModeBanner'

describe('DrawModeBanner', () => {
  /**
   * Validates: Requirements 3.2
   * Banner visible only with visible=true, default message shown
   */
  it('renders the default banner text when visible is true', () => {
    render(<DrawModeBanner visible={true} />)

    expect(
      screen.getByText('Dibuja el perímetro del nuevo lote en el mapa')
    ).toBeInTheDocument()
  })

  /**
   * Validates: Requirements 3.2
   * Banner not rendered when visible is false
   */
  it('renders nothing when visible is false', () => {
    const { container } = render(<DrawModeBanner visible={false} />)

    expect(container.firstChild).toBeNull()
  })

  /**
   * Validates: Requirements 3.2
   * Default variant 'info' uses green-left border style
   */
  it('renders with info variant styling by default', () => {
    render(<DrawModeBanner visible={true} />)

    const banner = screen.getByText('Dibuja el perímetro del nuevo lote en el mapa').closest('div')
    expect(banner).toHaveClass('bg-agro-50')
    expect(banner).toHaveClass('border-agro-400')
    expect(banner).toHaveClass('border-l-4')
  })

  /**
   * Validates: Requirements 4.1
   * Custom message prop is displayed correctly
   */
  it('renders a custom message when provided', () => {
    render(<DrawModeBanner visible={true} message="Dibuja el área del lote Norte" />)

    expect(
      screen.getByText('Dibuja el área del lote Norte')
    ).toBeInTheDocument()
  })

  /**
   * Validates: Requirements 5.3
   * Variant 'edit' uses blue-left border style
   */
  it('renders with edit variant styling (blue border)', () => {
    render(
      <DrawModeBanner
        visible={true}
        message="Editando área de Lote Norte - Arrastra los vértices para ajustar"
        variant="edit"
      />
    )

    const banner = screen.getByText(/Editando área de Lote Norte/).closest('div')
    expect(banner).toHaveClass('bg-blue-50')
    expect(banner).toHaveClass('border-blue-400')
    expect(banner).toHaveClass('border-l-4')
  })

  /**
   * Validates: Requirements 10.4
   * Variant 'error' uses red-left border style
   */
  it('renders with error variant styling (red border)', () => {
    render(
      <DrawModeBanner
        visible={true}
        message="Lote no encontrado"
        variant="error"
      />
    )

    const banner = screen.getByText('Lote no encontrado').closest('div')
    expect(banner).toHaveClass('bg-red-50')
    expect(banner).toHaveClass('border-red-400')
    expect(banner).toHaveClass('border-l-4')
  })

  it('renders nothing when visible is false regardless of variant or message', () => {
    const { container } = render(
      <DrawModeBanner visible={false} message="Some message" variant="error" />
    )

    expect(container.firstChild).toBeNull()
  })
})

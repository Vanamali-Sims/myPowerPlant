/**
 * @vitest-environment jsdom
 *
 * Fields are checked as people leave them: a filled-in field shows its
 * message on blur, empty fields stay quiet until Continue, and a postcode
 * from another state says it is not Victorian. The header postcode pill does
 * the same on its own.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocationControl } from '../../ui/LocationControl'
import { emptyProfile } from '../../../types/profile'
import { SetupForm } from '../SetupForm'

const NOT_VIC = '2000 isn’t a Victorian postcode. MyPowerPlant is for Victorian homes, so enter a postcode starting with 3.'

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
})

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Setup() {
  const [profile, setProfile] = useState(emptyProfile())
  return <SetupForm profile={profile} onChange={setProfile} onComplete={vi.fn()} onLogoClick={vi.fn()} />
}

async function openForm() {
  const user = userEvent.setup()
  render(<Setup />)
  const intro = screen.getByRole('dialog', { name: 'Your details stay with you' })
  await user.click(within(intro).getByRole('button', { name: 'Continue' }))
  return user
}

function postcodeField() {
  return screen.getByRole('textbox', { name: 'What is your postcode?' }) as HTMLInputElement
}

describe('checking fields as people leave them', () => {
  it('says a postcode from another state is not Victorian as soon as focus leaves it', async () => {
    const user = await openForm()
    await user.type(postcodeField(), '2000')
    expect(screen.queryByText(NOT_VIC)).toBeNull()
    await user.tab()
    expect(screen.getAllByText(NOT_VIC).length).toBeGreaterThan(0)
    expect(postcodeField().getAttribute('aria-invalid')).toBe('true')
  })

  it('clears the message once a Victorian postcode is entered and left', async () => {
    const user = await openForm()
    await user.type(postcodeField(), '2000')
    await user.tab()
    await user.clear(postcodeField())
    await user.type(postcodeField(), '3168')
    await user.tab()
    expect(screen.queryByText(NOT_VIC)).toBeNull()
  })

  it('checks a filled-in number on leave, and leaves untouched fields quiet', async () => {
    const user = await openForm()
    const people = screen.getByRole('textbox', { name: 'How many people live in your house?' })
    await user.type(people, '99')
    await user.tab()
    expect(screen.getByText(/Enter a number between 1 and/)).toBeTruthy()
    expect(screen.queryByText('Please enter how many rooms you have.')).toBeNull()
    expect(screen.queryByText('Please enter your postcode.')).toBeNull()
  })

  it('still shows every missing answer on Continue', async () => {
    const user = await openForm()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Please enter your postcode.')).toBeTruthy()
    expect(screen.getByText('Please enter how many rooms you have.')).toBeTruthy()
  })
})

describe('header postcode pill and the form field', () => {
  function headerPostcode() {
    return screen.getByRole('textbox', { name: 'Postcode' }) as HTMLInputElement
  }

  it('keeps showing the last Victorian postcode while the field holds one that is not', async () => {
    const user = await openForm()
    await user.type(postcodeField(), '3168')
    expect(headerPostcode().value).toBe('3168')
    await user.clear(postcodeField())
    await user.type(postcodeField(), '1234')
    await user.tab()
    expect(screen.getAllByText(/1234 isn’t a Victorian postcode/).length).toBeGreaterThan(0)
    expect(headerPostcode().value).toBe('3168')
    expect(screen.getByText('Clayton, VIC')).toBeTruthy()
  })

  it('shows nothing at the top when no Victorian postcode has been entered yet', async () => {
    const user = await openForm()
    await user.type(postcodeField(), '1234')
    expect(headerPostcode().value).toBe('')
  })

  it('does not hand a non-Victorian postcode typed at the top to the form', async () => {
    const user = await openForm()
    await user.type(headerPostcode(), '1234')
    await user.tab()
    expect(headerPostcode().value).toBe('1234')
    expect(postcodeField().value).toBe('')
    await user.clear(headerPostcode())
    await user.type(headerPostcode(), '3204')
    expect((postcodeField() as HTMLInputElement).value).toBe('3204')
  })
})

describe('header postcode pill and the form field', () => {
  function headerPostcode() {
    return screen.getByRole('textbox', { name: 'Postcode' }) as HTMLInputElement
  }

  it('keeps showing the last Victorian postcode while the field holds one that is not', async () => {
    const user = await openForm()
    await user.type(postcodeField(), '3168')
    expect(headerPostcode().value).toBe('3168')
    await user.clear(postcodeField())
    await user.type(postcodeField(), '1234')
    await user.tab()
    expect(screen.getAllByText(/1234 isn’t a Victorian postcode/).length).toBeGreaterThan(0)
    expect(headerPostcode().value).toBe('3168')
    expect(screen.getByText('Clayton, VIC')).toBeTruthy()
  })

  it('shows nothing at the top when no Victorian postcode has been entered yet', async () => {
    const user = await openForm()
    await user.type(postcodeField(), '1234')
    expect(headerPostcode().value).toBe('')
  })

  it('does not hand a non-Victorian postcode typed at the top to the form', async () => {
    const user = await openForm()
    await user.type(headerPostcode(), '1234')
    await user.tab()
    expect(headerPostcode().value).toBe('1234')
    expect(postcodeField().value).toBe('')
    await user.clear(headerPostcode())
    await user.type(headerPostcode(), '3204')
    expect(postcodeField().value).toBe('3204')
  })
})

describe('header postcode pill', () => {
  function Pill() {
    const [postcode, setPostcode] = useState('')
    return <LocationControl postcode={postcode} onPostcodeChange={setPostcode} />
  }

  it('says a non-Victorian postcode is not Victorian when focus leaves it, and names Victorian ones', async () => {
    const user = userEvent.setup()
    render(<Pill />)
    const input = screen.getByRole('textbox', { name: 'Postcode' })
    await user.type(input, '2000')
    await user.tab()
    expect(screen.getByRole('alert').textContent).toBe(NOT_VIC)
    await user.clear(input)
    await user.type(input, '3169')
    expect(screen.queryByRole('alert')).toBeNull()
    await user.tab()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Clarinda, VIC')).toBeTruthy()
  })
})

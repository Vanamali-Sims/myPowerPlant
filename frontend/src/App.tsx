import { useState, type FormEvent } from 'react'
import { submitForm } from './api'
import './App.css'

type Status = 'idle' | 'submitting' | 'success' | 'error'

function App() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [feedback, setFeedback] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setFeedback('')

    const result = await submitForm({ name, email, message })

    if (result.ok) {
      setStatus('success')
      setFeedback(`Saved as submission #${result.data.id}.`)
      setName('')
      setEmail('')
      setMessage('')
      return
    }

    setStatus('error')
    setFeedback(result.error)
  }

  return (
    <main className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Submit</h1>
        <p className="lede">
          Sends a POST to the backend and writes a row to Postgres.
        </p>

        <label>
          Name
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={1}
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label>
          Message
          <textarea
            name="message"
            required
            minLength={1}
            maxLength={2000}
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>

        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Send'}
        </button>

        {status === 'success' && (
          <p className="banner success" role="status">
            {feedback}
          </p>
        )}
        {status === 'error' && (
          <p className="banner error" role="alert">
            {feedback}
          </p>
        )}
      </form>
    </main>
  )
}

export default App

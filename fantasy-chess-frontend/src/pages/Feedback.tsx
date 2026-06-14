import * as React from 'react'
import { useEffect, useState } from 'react'
import { AlertCircle, Bug, CheckCircle, MessageCircle, Send } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type ReportType = 'feedback' | 'bug'
type BugSeverity = 'low' | 'medium' | 'high' | 'critical'

const Feedback: React.FC = () => {
  const { user } = useAuth()
  const [reportType, setReportType] = useState<ReportType>('feedback')
  const [contactEmail, setContactEmail] = useState(user?.email ?? '')
  const [liked, setLiked] = useState('')
  const [confused, setConfused] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState('')
  const [featureRequest, setFeatureRequest] = useState('')
  const [message, setMessage] = useState('')
  const [bugTitle, setBugTitle] = useState('')
  const [bugSeverity, setBugSeverity] = useState<BugSeverity>('medium')
  const [pageUrl, setPageUrl] = useState(
    typeof window === 'undefined' ? '' : window.location.href
  )
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [actualBehavior, setActualBehavior] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.email && !contactEmail) {
      setContactEmail(user.email)
    }
  }, [contactEmail, user?.email])

  const resetForm = () => {
    setLiked('')
    setConfused('')
    setWouldRecommend('')
    setFeatureRequest('')
    setMessage('')
    setBugTitle('')
    setBugSeverity('medium')
    setPageUrl(typeof window === 'undefined' ? '' : window.location.href)
    setStepsToReproduce('')
    setExpectedBehavior('')
    setActualBehavior('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const trimmedEmail = contactEmail.trim()
    if (!user && !trimmedEmail) {
      setError('Please include an email so we can follow up if needed.')
      return
    }

    if (reportType === 'feedback' && !message.trim() && !liked.trim() && !featureRequest.trim() && !wouldRecommend) {
      setError('Please share at least one piece of feedback before submitting.')
      return
    }

    if (reportType === 'bug' && (!bugTitle.trim() || !actualBehavior.trim())) {
      setError('Please include a bug title and what went wrong.')
      return
    }

    setLoading(true)

    const { error: submitError } = await supabase.from('feedback_reports').insert({
      report_type: reportType,
      user_id: user?.id ?? null,
      contact_email: trimmedEmail || user?.email || null,
      liked: reportType === 'feedback' ? liked.trim() || null : null,
      confused: reportType === 'feedback' ? confused.trim() || null : null,
      would_recommend: reportType === 'feedback' && wouldRecommend ? wouldRecommend === 'yes' : null,
      feature_request: reportType === 'feedback' ? featureRequest.trim() || null : null,
      message: message.trim() || null,
      bug_title: reportType === 'bug' ? bugTitle.trim() : null,
      bug_severity: reportType === 'bug' ? bugSeverity : null,
      page_url: reportType === 'bug' ? pageUrl.trim() || null : null,
      steps_to_reproduce: reportType === 'bug' ? stepsToReproduce.trim() || null : null,
      expected_behavior: reportType === 'bug' ? expectedBehavior.trim() || null : null,
      actual_behavior: reportType === 'bug' ? actualBehavior.trim() : null,
      user_agent: typeof window === 'undefined' ? null : window.navigator.userAgent,
    })

    setLoading(false)

    if (submitError) {
      console.error('Error submitting feedback report:', submitError)
      setError('We could not submit your report. Please try again or contact support.')
      return
    }

    setSuccess(reportType === 'bug' ? 'Bug report submitted. Thank you for helping us improve.' : 'Feedback submitted. Thank you for sharing your thoughts.')
    resetForm()
  }

  return (
    <div className="min-h-screen bg-white py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 border-2 border-royalBlue mb-4">
            {reportType === 'bug' ? <Bug className="w-8 h-8 text-royalBlue" /> : <MessageCircle className="w-8 h-8 text-royalBlue" />}
          </div>
          <h1 className="text-3xl font-extrabold text-neutral-900 mb-3 font-serif drop-shadow">Feedback & Bug Reports</h1>
          <p className="text-lg text-neutral-700 max-w-2xl mx-auto">
            Tell us what is working, what is confusing, or report a bug you found while playing Fantasy League Chess.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-2 border-royalBlue p-6 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <button
              type="button"
              onClick={() => setReportType('feedback')}
              className={`rounded-lg border-2 px-4 py-3 font-semibold transition-colors ${
                reportType === 'feedback'
                  ? 'border-royalBlue bg-royalBlue text-white'
                  : 'border-neutral-200 text-neutral-700 hover:border-royalBlue'
              }`}
            >
              Product Feedback
            </button>
            <button
              type="button"
              onClick={() => setReportType('bug')}
              className={`rounded-lg border-2 px-4 py-3 font-semibold transition-colors ${
                reportType === 'bug'
                  ? 'border-royalBlue bg-royalBlue text-white'
                  : 'border-neutral-200 text-neutral-700 hover:border-royalBlue'
              }`}
            >
              Report a Bug
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-neutral-700 mb-1">
                Email {!user && '*'}
              </label>
              <input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
              />
              <p className="text-xs text-neutral-500 mt-1">We will only use this to follow up about your submission.</p>
            </div>

            {reportType === 'feedback' ? (
              <>
                <div>
                  <label htmlFor="liked" className="block text-sm font-medium text-neutral-700 mb-1">
                    What did you like about the product?
                  </label>
                  <textarea
                    id="liked"
                    value={liked}
                    onChange={(event) => setLiked(event.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                    placeholder="What felt useful, fun, or clear?"
                  />
                </div>

                <div>
                  <label htmlFor="confused" className="block text-sm font-medium text-neutral-700 mb-1">
                    What confused you?
                  </label>
                  <textarea
                    id="confused"
                    value={confused}
                    onChange={(event) => setConfused(event.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                    placeholder="Anything hard to understand or find?"
                  />
                </div>

                <div>
                  <label htmlFor="wouldRecommend" className="block text-sm font-medium text-neutral-700 mb-1">
                    Would you use this product and recommend it to others?
                  </label>
                  <select
                    id="wouldRecommend"
                    value={wouldRecommend}
                    onChange={(event) => setWouldRecommend(event.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 bg-white"
                  >
                    <option value="">Choose an option</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="featureRequest" className="block text-sm font-medium text-neutral-700 mb-1">
                    Is there a feature you would like to see?
                  </label>
                  <textarea
                    id="featureRequest"
                    value={featureRequest}
                    onChange={(event) => setFeatureRequest(event.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                    placeholder="Share feature ideas or improvements."
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-neutral-700 mb-1">
                    Anything else?
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                    placeholder="Add any extra context."
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="bugTitle" className="block text-sm font-medium text-neutral-700 mb-1">
                    Bug title *
                  </label>
                  <input
                    id="bugTitle"
                    type="text"
                    value={bugTitle}
                    onChange={(event) => setBugTitle(event.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                    placeholder="Short description of the bug"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="bugSeverity" className="block text-sm font-medium text-neutral-700 mb-1">
                      Severity
                    </label>
                    <select
                      id="bugSeverity"
                      value={bugSeverity}
                      onChange={(event) => setBugSeverity(event.target.value as BugSeverity)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 bg-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pageUrl" className="block text-sm font-medium text-neutral-700 mb-1">
                      Page URL
                    </label>
                    <input
                      id="pageUrl"
                      type="url"
                      value={pageUrl}
                      onChange={(event) => setPageUrl(event.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                      placeholder="Where did it happen?"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="actualBehavior" className="block text-sm font-medium text-neutral-700 mb-1">
                    What went wrong? *
                  </label>
                  <textarea
                    id="actualBehavior"
                    value={actualBehavior}
                    onChange={(event) => setActualBehavior(event.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                    placeholder="Describe the error or unexpected behavior."
                  />
                </div>

                <div>
                  <label htmlFor="stepsToReproduce" className="block text-sm font-medium text-neutral-700 mb-1">
                    Steps to reproduce
                  </label>
                  <textarea
                    id="stepsToReproduce"
                    value={stepsToReproduce}
                    onChange={(event) => setStepsToReproduce(event.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                    placeholder="1. Go to... 2. Click... 3. See..."
                  />
                </div>

                <div>
                  <label htmlFor="expectedBehavior" className="block text-sm font-medium text-neutral-700 mb-1">
                    What did you expect to happen?
                  </label>
                  <textarea
                    id="expectedBehavior"
                    value={expectedBehavior}
                    onChange={(event) => setExpectedBehavior(event.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                    placeholder="What should the app have done?"
                  />
                </div>

                <div>
                  <label htmlFor="bugMessage" className="block text-sm font-medium text-neutral-700 mb-1">
                    Anything else?
                  </label>
                  <textarea
                    id="bugMessage"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
                    placeholder="Browser, device, screenshots you can send later, or other notes."
                  />
                </div>
              </>
            )}

            {error && (
              <div className="flex items-start gap-2 text-red-700 text-sm bg-red-50 p-3 rounded border border-red-200">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 text-green-700 text-sm bg-green-50 p-3 rounded border border-green-200">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center bg-[#1e293b] hover:bg-royalBlue disabled:bg-neutral-400 text-white py-3 px-6 rounded-lg font-semibold shadow-lg transition-colors"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Feedback

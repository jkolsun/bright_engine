'use client'

import { useState, useCallback } from 'react'
import Step1BusinessInfo from './steps/Step1BusinessInfo'
import Step2Services from './steps/Step2Services'
import Step3ServiceArea from './steps/Step3ServiceArea'
import Step4AboutStory from './steps/Step4AboutStory'
import Step5Differentiator from './steps/Step5Differentiator'
import Step6Experience from './steps/Step6Experience'
import Step7Testimonial from './steps/Step7Testimonial'
import Step8Logo from './steps/Step8Logo'
import Step9Photos from './steps/Step9Photos'
import Step10Review from './steps/Step10Review'

const STEP_TITLES = [
  'Business Info',
  'Services',
  'Service Area',
  'Your Story',
  'What Sets You Apart',
  'Experience & Hours',
  'Testimonials',
  'Logo & Colors',
  'Photos',
  'Review & Submit',
]

interface OnboardingFormProps {
  leadId: string
  initialData: Record<string, any>
  initialStep: number
}

/** Validate required fields for each step. Returns error message or null. */
function validateStep(step: number, data: Record<string, any>): string | null {
  switch (step) {
    case 0:
      if (!data.companyName?.trim()) return 'Company name is required.'
      if (!data.phone?.trim()) return 'Phone number is required.'
      return null
    case 1:
      if (!Array.isArray(data.services) || data.services.length < 2)
        return 'Please add at least 2 services.'
      return null
    case 3:
      if (!data.aboutStory?.trim() || data.aboutStory.trim().length < 10)
        return 'Please tell us your company story (at least a few sentences).'
      return null
    case 7:
      if (!data.logoUrl) return 'Please upload your company logo.'
      return null
    case 8:
      if (!Array.isArray(data.photos) || data.photos.length < 1)
        return 'Please upload at least 1 project photo.'
      return null
    default:
      return null
  }
}

export default function OnboardingForm({ leadId, initialData, initialStep }: OnboardingFormProps) {
  const [currentStep, setCurrentStep] = useState(Math.min(initialStep, 9))
  const [data, setData] = useState<Record<string, any>>(initialData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = useCallback((updates: Record<string, any>) => {
    setData(prev => ({ ...prev, ...updates }))
  }, [])

  const saveStep = async (step: number) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/onboard/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }))
        throw new Error(err.error || 'Save failed')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    // Validate required fields before advancing
    const validationError = validateStep(currentStep, data)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    // Save current step
    await saveStep(currentStep + 1)
    if (currentStep < 9) {
      setCurrentStep(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleUpload = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/onboard/${leadId}/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const result = await res.json()
      return result.url
    } catch (err) {
      console.error('Upload error:', err)
      return null
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      // Save final step first
      await saveStep(10)

      const res = await fetch(`/api/onboard/${leadId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Submission failed' }))
        throw new Error(err.error || 'Submission failed')
      }
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-600">
          We&apos;ve got everything we need. We&apos;re building your website now and
          you&apos;ll get a text when it&apos;s ready for review.
        </p>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <Step1BusinessInfo data={data} onChange={handleChange} />
      case 1: return <Step2Services data={data} onChange={handleChange} />
      case 2: return <Step3ServiceArea data={data} onChange={handleChange} />
      case 3: return <Step4AboutStory data={data} onChange={handleChange} />
      case 4: return <Step5Differentiator data={data} onChange={handleChange} />
      case 5: return <Step6Experience data={data} onChange={handleChange} />
      case 6: return <Step7Testimonial data={data} onChange={handleChange} />
      case 7: return <Step8Logo data={data} onChange={handleChange} onUpload={handleUpload} />
      case 8: return <Step9Photos data={data} onChange={handleChange} onUpload={handleUpload} />
      case 9: return <Step10Review data={data} onChange={handleChange} onSubmit={handleSubmit} submitting={submitting} />
      default: return null
    }
  }

  return (
    <div>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Step {currentStep + 1} of 10</span>
          <span>{STEP_TITLES[currentStep]}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / 10) * 100}%` }}
          />
        </div>
        {/* Step dots */}
        <div className="flex justify-between mt-2">
          {STEP_TITLES.map((_, i) => (
            <button
              key={i}
              onClick={() => i <= (data._maxStep || currentStep) && setCurrentStep(i)}
              className={`w-3 h-3 rounded-full transition-all ${
                i === currentStep
                  ? 'bg-blue-600 scale-125'
                  : i < currentStep
                  ? 'bg-blue-400'
                  : 'bg-gray-300'
              }`}
              title={STEP_TITLES[i]}
              disabled={i > (data._maxStep || currentStep)}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        {renderStep()}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Navigation */}
        {currentStep < 9 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentStep === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={saving}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Next'}
            </button>
          </div>
        )}
      </div>

      {/* Auto-save indicator */}
      {saving && (
        <div className="text-center mt-3 text-xs text-gray-400">
          Saving your progress...
        </div>
      )}
    </div>
  )
}

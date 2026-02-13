'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import {
  Upload, Download, Check, X, AlertCircle, Loader2,
  CheckCircle, Pause, XCircle, DollarSign, Clock
} from 'lucide-react'

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'processing' | 'complete'>('upload')
  const [pipelineState, setPipelineState] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  // Poll for pipeline status every 2 seconds while processing
  useEffect(() => {
    if (step !== 'processing') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/clawdbot-monitor')
        const data = await res.json()
        
        // Extract pipeline state from activity log
        const activities = data.activities || []
        const importActivities = activities.filter((a: any) => 
          ['IMPORT', 'ENRICHMENT', 'PREVIEW_GENERATED', 'PERSONALIZATION', 'SCORE_UPDATE', 'TEXT_SENT'].includes(a.actionType)
        )

        setPipelineState({
          totalActivities: activities.length,
          importActivities: importActivities.length,
          lastActivity: activities[0]?.description || 'Starting...',
          timestamp: new Date().toLocaleTimeString()
        })

        // Check if import complete (all major stages done)
        const hasPreview = activities.some((a: any) => a.actionType === 'PREVIEW_GENERATED')
        const hasPersonalization = activities.some((a: any) => a.actionType === 'PERSONALIZATION')
        
        if (hasPreview && hasPersonalization) {
          setStep('complete')
        }
      } catch (error) {
        console.error('Failed to poll pipeline:', error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [step])

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        setImportResult(data)
        setStep('processing')
      } else {
        alert(`Import failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Lead Import & Enrichment Pipeline</h1>
        <p className="text-gray-500 mt-1">Upload Apollo CSV → Enrich → Generate Previews → Personalize → Download Campaigns</p>
      </div>

      {step === 'upload' && (
        <div className="max-w-4xl mx-auto">
          {/* Last Import Info */}
          <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Last Import</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">2,418 leads</p>
                <p className="text-sm text-gray-600 mt-1">February 10, 2026 at 3:42 PM</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">API Cost</p>
                <p className="text-xl font-bold text-gray-900">$18.42</p>
              </div>
            </div>
          </Card>

          {/* Upload Zone */}
          <Card className="p-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload size={48} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Drop Apollo CSV Here</h3>
              <p className="text-gray-600 mb-8">
                or click to browse
              </p>

              <label className="inline-block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                  disabled={uploading}
                  className="hidden"
                />
                <span className="cursor-pointer inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold disabled:opacity-50">
                  {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                  {uploading ? 'Uploading...' : 'Choose CSV File'}
                </span>
              </label>

              <div className="mt-12 pt-8 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Expected Apollo Headers</h4>
                <div className="text-left bg-gray-50 p-6 rounded-lg">
                  <code className="text-sm text-gray-700 block space-y-1">
                    <div>First Name, Last Name, Title, Company Name, Email</div>
                    <div>Industry, Keywords, Website, City, State, Company Phone</div>
                  </code>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  If headers don't match, you'll see a column mapping screen next.
                </p>
              </div>
            </div>
          </Card>

          {/* Pipeline Info */}
          <Card className="p-6 mt-6">
            <h4 className="font-semibold text-gray-900 mb-4">What Happens Next</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Validate & Deduplicate</p>
                  <p className="text-gray-600">Check emails, remove duplicates, verify required fields</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Auto-Split by Campaign</p>
                  <p className="text-gray-600">A: Bad website | B: No website | C: Reps (has phone)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Enrich (SerpAPI)</p>
                  <p className="text-gray-600">Google Maps data: phone, rating, reviews, competitors</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">4</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Generate Previews</p>
                  <p className="text-gray-600">Industry templates with real data, unique URLs, analytics ready</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">5</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Personalize (Serper + AI)</p>
                  <p className="text-gray-600">AI first lines using enrichment + competitors + preview URL</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">6</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Assemble & Output</p>
                  <p className="text-gray-600">3 CSV files ready for Campaign A, B, and C</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {step === 'processing' && (
        <div className="max-w-5xl mx-auto">
          <Card className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Processing Pipeline</h3>
            
            {/* Progress Steps */}
            <div className="space-y-6">
              {/* Step 1 */}
              <PipelineStep
                number={1}
                title="Validated"
                status={pipelineState.step1.status}
                details={
                  <div className="text-sm space-y-1">
                    <p className="text-green-600 font-medium">{pipelineState.step1.valid} clean</p>
                    <p className="text-red-600">{pipelineState.step1.removed} removed ({pipelineState.step1.duplicates} duplicate, {pipelineState.step1.invalid} invalid)</p>
                  </div>
                }
              />

              {/* Step 2 */}
              <PipelineStep
                number={2}
                title="Split"
                status={pipelineState.step2.status}
                details={
                  <div className="text-sm space-y-1">
                    <p>Campaign A: {pipelineState.step2.campaignA}</p>
                    <p>Campaign B: {pipelineState.step2.campaignB}</p>
                    <p>Campaign C (Reps): {pipelineState.step2.campaignC}</p>
                  </div>
                }
              />

              {/* Step 3 */}
              <PipelineStep
                number={3}
                title="Enriching"
                status={pipelineState.step3.status}
                details={
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="font-medium mb-2">{pipelineState.step3.processed} / {pipelineState.step3.total} ({Math.round(pipelineState.step3.processed / pipelineState.step3.total * 100)}%)</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.round(pipelineState.step3.processed / pipelineState.step3.total * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>├── Matched: {pipelineState.step3.matched}</p>
                      <p>├── Partial: {pipelineState.step3.partial}</p>
                      <p>└── No match: {pipelineState.step3.noMatch}</p>
                    </div>
                  </div>
                }
              />

              {/* Step 4 */}
              <PipelineStep
                number={4}
                title="Preview generation"
                status={pipelineState.step4.status}
                details={<p className="text-sm text-gray-500">Waiting for enrichment...</p>}
              />

              {/* Step 5 */}
              <PipelineStep
                number={5}
                title="Personalization"
                status={pipelineState.step5.status}
                details={<p className="text-sm text-gray-500">Waiting for previews...</p>}
              />

              {/* Step 6 */}
              <PipelineStep
                number={6}
                title="Assembly"
                status={pipelineState.step6.status}
                details={<p className="text-sm text-gray-500">Waiting for personalization...</p>}
              />
            </div>

            {/* Footer Stats */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-gray-600" />
                  <span className="text-sm text-gray-700">
                    Estimated time remaining: <strong>{pipelineState.estimatedTime}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={18} className="text-gray-600" />
                  <span className="text-sm text-gray-700">
                    API costs this batch: <strong>${pipelineState.apiCost}</strong>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm">
                  <Pause size={14} className="mr-2" />
                  Pause
                </Button>
                <Button variant="destructive" size="sm">
                  <XCircle size={14} className="mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </Card>

          {/* Instructions */}
          <Card className="p-6 mt-6 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold text-gray-900 mb-1">Pipeline Order is Critical</p>
                <p className="text-sm text-gray-700">
                  Each lead must complete steps 3→4→5 in order. Enrichment data feeds previews, previews feed personalization. 
                  Leads process in parallel, but each one follows the strict sequence.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {step === 'complete' && (
        <div className="max-w-4xl mx-auto">
          <Card className="p-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={48} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pipeline Complete!</h3>
              <p className="text-gray-600 mb-8">
                Successfully processed 2,418 leads through full enrichment pipeline
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-4xl font-bold text-blue-600">2,390</p>
                  <p className="text-sm text-gray-700 mt-2">Campaign A<br/>(Bad Website)</p>
                </div>
                <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-4xl font-bold text-purple-600">28</p>
                  <p className="text-sm text-gray-700 mt-2">Campaign B<br/>(No Website)</p>
                </div>
                <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-4xl font-bold text-green-600">2,281</p>
                  <p className="text-sm text-gray-700 mt-2">Campaign C<br/>(Reps)</p>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="space-y-3 mb-8">
                <Button className="w-full justify-between" size="lg">
                  <span>Campaign A CSV (Bad Website)</span>
                  <Download size={20} />
                </Button>
                <Button className="w-full justify-between" size="lg" variant="outline">
                  <span>Campaign B CSV (No Website)</span>
                  <Download size={20} />
                </Button>
                <Button className="w-full justify-between" size="lg" variant="outline">
                  <span>Campaign C CSV (Reps w/ Phone)</span>
                  <Download size={20} />
                </Button>
              </div>

              {/* Cost Breakdown */}
              <Card className="p-6 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-4">API Cost Breakdown</h4>
                <div className="space-y-2 text-sm text-left">
                  <div className="flex justify-between">
                    <span className="text-gray-700">SerpAPI (enrichment)</span>
                    <span className="font-semibold text-gray-900">$12.09</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Serper (research)</span>
                    <span className="font-semibold text-gray-900">$4.84</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">AI (personalization)</span>
                    <span className="font-semibold text-gray-900">$1.49</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-gray-900">$18.42</span>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Import More Leads
                </Button>
                <Button onClick={() => window.location.href = '/outbound'}>
                  View in Outbound Tracker
                </Button>
              </div>
            </div>
          </Card>

          {/* Partial Matches Review */}
          <Card className="p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Partial Matches (112)</h4>
              <Button variant="outline" size="sm">Review All</Button>
            </div>
            <p className="text-sm text-gray-600">
              These leads were enriched using Apollo data only. SerpAPI couldn't find a Google Maps match. 
              They'll still get previews and personalization, but competitor data won't be as strong.
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}

function PipelineStep({ number, title, status, details }: any) {
  const getIcon = () => {
    if (status === 'complete') return <CheckCircle size={24} className="text-green-600" />
    if (status === 'running') return <Loader2 size={24} className="text-blue-600 animate-spin" />
    return <Clock size={24} className="text-gray-400" />
  }

  const getBg = () => {
    if (status === 'complete') return 'bg-green-50 border-green-200'
    if (status === 'running') return 'bg-blue-50 border-blue-200'
    return 'bg-gray-50 border-gray-200'
  }

  return (
    <div className={`p-6 rounded-lg border ${getBg()}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-bold text-gray-600">STEP {number}</span>
            <h4 className="font-semibold text-gray-900">{title}</h4>
            {status === 'complete' && (
              <Badge variant="success" className="text-xs">Complete</Badge>
            )}
            {status === 'running' && (
              <Badge className="text-xs">Processing...</Badge>
            )}
            {status === 'waiting' && (
              <Badge variant="outline" className="text-xs">Waiting</Badge>
            )}
          </div>
          {details}
        </div>
      </div>
    </div>
  )
}

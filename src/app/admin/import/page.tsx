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
  const [importMode, setImportMode] = useState<'async' | 'sync'>('sync') // Default to sync (working solution)

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

      // Use sync or async endpoint based on selected mode
      const endpoint = importMode === 'sync' ? '/api/leads/import-sync' : '/api/leads/import'
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        setImportResult(data)
        // Sync mode goes directly to complete, async mode goes to processing
        setStep(importMode === 'sync' ? 'complete' : 'processing')
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
                <p className="text-2xl font-bold text-gray-900 mt-1">{importResult?.createdCount || '—'} leads</p>
                <p className="text-sm text-gray-600 mt-1">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">API Cost</p>
                <p className="text-xl font-bold text-gray-900">{importResult?.summary ? `$${((importResult.summary.createdCount || 0) * 0.004).toFixed(2)}` : '—'}</p>
              </div>
            </div>
          </Card>

          {/* Import Mode Selection */}
          <Card className="p-6 mb-6">
            <h4 className="font-semibold text-gray-900 mb-4">Import Mode</h4>
            <div className="flex gap-4">
              <button
                onClick={() => setImportMode('sync')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  importMode === 'sync' 
                    ? 'border-green-500 bg-green-50 text-green-900' 
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <Zap size={24} className={importMode === 'sync' ? 'text-green-600' : 'text-gray-400'} />
                </div>
                <h5 className="font-semibold mb-1">Synchronous (Recommended)</h5>
                <p className="text-sm opacity-75">Immediate enrichment, see results instantly. Uses SerpAPI directly.</p>
                {importMode === 'sync' && (
                  <Badge className="mt-2 bg-green-100 text-green-800">✅ Working Now</Badge>
                )}
              </button>
              
              <button
                onClick={() => setImportMode('async')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  importMode === 'async' 
                    ? 'border-blue-500 bg-blue-50 text-blue-900' 
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <Clock size={24} className={importMode === 'async' ? 'text-blue-600' : 'text-gray-400'} />
                </div>
                <h5 className="font-semibold mb-1">Queue-Based</h5>
                <p className="text-sm opacity-75">Background processing with full pipeline monitoring.</p>
                {importMode === 'async' && (
                  <Badge variant="outline" className="mt-2">⚠️ Debug Mode</Badge>
                )}
              </button>
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
                <span className={`cursor-pointer inline-flex items-center gap-2 px-8 py-4 text-white rounded-lg transition-colors text-lg font-semibold disabled:opacity-50 ${
                  importMode === 'sync' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}>
                  {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                  {uploading ? 'Processing...' : `${importMode === 'sync' ? 'Import & Enrich Now' : 'Queue for Processing'}`}
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
            <h4 className="font-semibold text-gray-900 mb-4">
              What Happens Next ({importMode === 'sync' ? 'Synchronous Mode' : 'Queue-Based Mode'})
            </h4>
            <div className="space-y-3 text-sm">
              {importMode === 'sync' ? (
                // Synchronous mode steps
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-green-600">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Parse & Validate CSV</p>
                      <p className="text-gray-600">Immediate validation, create leads in database</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-green-600">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Immediate Enrichment</p>
                      <p className="text-gray-600">Direct SerpAPI calls for each lead - see results instantly</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-green-600">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Complete Report</p>
                      <p className="text-gray-600">Detailed success/failure results with enrichment data</p>
                    </div>
                  </div>
                </>
              ) : (
                // Async mode steps
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Validate & Queue</p>
                      <p className="text-gray-600">Check emails, create leads, queue background jobs</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-600">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Background Processing</p>
                      <p className="text-gray-600">Workers process enrichment, preview generation, personalization</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-600">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Pipeline Monitoring</p>
                      <p className="text-gray-600">Real-time status updates as jobs complete</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {importMode === 'sync' && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>✅ Recommended:</strong> Synchronous mode processes leads immediately and uses your API credits efficiently. Perfect for testing and production use.
                </p>
              </div>
            )}
            
            {importMode === 'async' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Debug Mode:</strong> Queue-based processing is currently in debug mode. Jobs may not process automatically.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {step === 'processing' && (
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Processing Pipeline</h3>
            <div className="flex items-center gap-4 mb-6">
              <Loader2 size={32} className="text-blue-600 animate-spin" />
              <div>
                <p className="font-semibold text-gray-900">
                  {importResult?.createdCount || importResult?.summary?.createdCount || 0} leads queued for processing
                </p>
                <p className="text-sm text-gray-600">
                  Running: Enrichment → Preview → Personalization → Scripts → Distribution
                </p>
              </div>
            </div>
            {pipelineState && (
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Latest activity:</p>
                  <p className="text-sm text-gray-600 mt-1">{pipelineState.lastActivity}</p>
                  <p className="text-xs text-gray-400 mt-2">Total pipeline actions: {pipelineState.totalActivities}</p>
                </div>
                <p className="text-xs text-gray-500">Last checked: {pipelineState.timestamp}</p>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                ← Back to Upload
              </Button>
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
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {importResult?.mode === 'SYNCHRONOUS' ? 'Synchronous Import Complete!' : 'Pipeline Complete!'}
              </h3>
              <p className="text-gray-600 mb-8">
                {importResult?.mode === 'SYNCHRONOUS' 
                  ? `Immediately processed ${importResult?.summary?.created || '—'} leads with ${importResult?.summary?.enriched || '—'} successful enrichments`
                  : `Successfully processed ${importResult?.createdCount || '—'} leads through full enrichment pipeline`
                }
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-4xl font-bold text-blue-600">
                    {importResult?.summary?.created || importResult?.summary?.createdCount || importResult?.createdCount || '—'}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">Leads Created</p>
                </div>
                
                {importResult?.mode === 'SYNCHRONOUS' && (
                  <>
                    <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-4xl font-bold text-green-600">
                        {importResult?.summary?.enriched || '—'}
                      </p>
                      <p className="text-sm text-gray-700 mt-2">Successfully Enriched</p>
                    </div>
                    
                    <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-4xl font-bold text-yellow-600">
                        {importResult?.summary?.successRate || '—'}
                      </p>
                      <p className="text-sm text-gray-700 mt-2">Success Rate</p>
                    </div>
                  </>
                )}
              </div>
              
              {importResult?.mode === 'SYNCHRONOUS' && importResult?.errors && importResult.errors.length > 0 && (
                <Card className="p-4 mb-6 bg-red-50 border-red-200">
                  <h4 className="font-semibold text-red-900 mb-2">Processing Errors ({importResult.errors.length})</h4>
                  <div className="text-sm text-red-800 space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.slice(0, 5).map((error: string, i: number) => (
                      <p key={i}>• {error}</p>
                    ))}
                    {importResult.errors.length > 5 && (
                      <p className="italic">... and {importResult.errors.length - 5} more</p>
                    )}
                  </div>
                </Card>
              )}

              {/* Download Buttons */}
              <div className="space-y-3 mb-8">
                <Button
                  className="w-full justify-between"
                  size="lg"
                  onClick={() => window.open('/api/leads/export?campaign=A', '_blank')}
                >
                  <span>Campaign A CSV (Bad Website)</span>
                  <Download size={20} />
                </Button>
                <Button
                  className="w-full justify-between"
                  size="lg"
                  variant="outline"
                  onClick={() => window.open('/api/leads/export?campaign=B', '_blank')}
                >
                  <span>Campaign B CSV (No Website)</span>
                  <Download size={20} />
                </Button>
                <Button
                  className="w-full justify-between"
                  size="lg"
                  variant="outline"
                  onClick={() => window.open('/api/leads/export?campaign=C', '_blank')}
                >
                  <span>Campaign C CSV (Reps w/ Phone)</span>
                  <Download size={20} />
                </Button>
                <Button
                  className="w-full justify-between"
                  size="lg"
                  variant="outline"
                  onClick={() => window.open('/api/leads/export', '_blank')}
                >
                  <span>All Leads CSV</span>
                  <Download size={20} />
                </Button>
              </div>

              {/* Cost Breakdown */}
              <Card className="p-6 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-4">API Cost Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">Estimated API costs calculated at ~$0.004 per lead</p>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total estimated cost</span>
                    <span className="font-bold text-gray-900">
                      ${((importResult?.summary?.createdCount || importResult?.createdCount || 0) * 0.004).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Import More Leads
                </Button>
                <Button onClick={() => window.location.href = '/admin/outbound'}>
                  View in Outbound Tracker
                </Button>
              </div>
            </div>
          </Card>

          {/* Import Summary */}
          <Card className="p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Import Summary</h4>
            </div>
            <p className="text-sm text-gray-600">
              Leads were enriched using SerpAPI where possible. Those without Google Maps matches still get
              previews and personalization from Apollo data.
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

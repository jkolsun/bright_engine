'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import {
  Upload, Download, Check, X, AlertCircle, FileText,
  Users, Loader2, CheckCircle
} from 'lucide-react'

// Mock CSV preview data
const MOCK_PREVIEW_DATA = [
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@abcroofing.com',
    phone: '5551234567',
    companyName: 'ABC Roofing',
    city: 'Dallas',
    state: 'TX',
    valid: true,
    issues: []
  },
  {
    firstName: 'Mike',
    lastName: '',
    email: 'mike@plumbing',
    phone: '555987',
    companyName: 'Elite Plumbing',
    city: 'Austin',
    state: 'TX',
    valid: false,
    issues: ['Missing last name', 'Invalid email', 'Invalid phone']
  },
  {
    firstName: 'Sarah',
    lastName: 'Davis',
    email: 'sarah@propainting.com',
    phone: '5554567890',
    companyName: 'Pro Painting',
    city: 'Houston',
    state: 'TX',
    valid: true,
    issues: []
  },
  {
    firstName: 'Tom',
    lastName: 'Wilson',
    email: null,
    phone: '5552223333',
    companyName: 'Quick HVAC',
    city: 'San Antonio',
    state: 'TX',
    valid: false,
    issues: ['Missing email']
  }
]

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping' | 'importing' | 'complete'>('upload')
  const [csvData, setCsvData] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)

  const validCount = MOCK_PREVIEW_DATA.filter(r => r.valid).length
  const invalidCount = MOCK_PREVIEW_DATA.filter(r => !r.valid).length

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // In real app: parse CSV
      setCsvData(MOCK_PREVIEW_DATA)
      setStep('preview')
    }
  }

  const startImport = () => {
    setStep('importing')
    setImporting(true)
    
    // Simulate import progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setImportProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setImporting(false)
        setStep('complete')
      }
    }, 300)
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import Leads</h1>
        <p className="text-gray-500 mt-1">Upload a CSV file to bulk import leads</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        <StepIndicator number={1} label="Upload" active={step === 'upload'} complete={step !== 'upload'} />
        <div className="w-12 h-px bg-gray-300" />
        <StepIndicator number={2} label="Preview" active={step === 'preview' || step === 'mapping'} complete={step === 'importing' || step === 'complete'} />
        <div className="w-12 h-px bg-gray-300" />
        <StepIndicator number={3} label="Import" active={step === 'importing'} complete={step === 'complete'} />
      </div>

      {/* Content */}
      {step === 'upload' && (
        <div className="max-w-3xl mx-auto">
          <Card className="p-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload size={48} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload CSV File</h3>
              <p className="text-gray-600 mb-8">
                Drag and drop your CSV file here, or click to browse
              </p>

              <label className="inline-block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <FileText size={20} />
                  Choose File
                </span>
              </label>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Required CSV Format</h4>
                <div className="text-left bg-gray-50 p-4 rounded-lg">
                  <code className="text-sm text-gray-700">
                    firstName, lastName, email, phone, companyName, city, state
                  </code>
                </div>
                <Button variant="outline" size="sm" className="mt-4">
                  <Download size={16} className="mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{csvData.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valid</p>
                  <p className="text-2xl font-bold text-green-600">{validCount}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="text-red-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invalid</p>
                  <p className="text-2xl font-bold text-red-600">{invalidCount}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Preview Table */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Preview Data</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                  Cancel
                </Button>
                <Button size="sm" onClick={startImport} disabled={validCount === 0}>
                  Import {validCount} Valid Leads
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {csvData.map((row, idx) => (
                    <tr key={idx} className={row.valid ? '' : 'bg-red-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {row.valid ? (
                          <Check size={20} className="text-green-600" />
                        ) : (
                          <X size={20} className="text-red-600" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.firstName} {row.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.email || <span className="text-red-600">Missing</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.companyName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.city}, {row.state}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {row.issues.length > 0 ? (
                          <div className="space-y-1">
                            {row.issues.map((issue: string, i: number) => (
                              <Badge key={i} variant="destructive" className="text-xs">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Badge variant="success" className="text-xs">Valid</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {invalidCount > 0 && (
            <Card className="p-6 bg-yellow-50 border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-gray-900">
                    {invalidCount} leads have validation errors
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Invalid leads will be skipped. Fix the errors and re-import, or continue with valid leads only.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {step === 'importing' && (
        <div className="max-w-2xl mx-auto">
          <Card className="p-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 size={48} className="text-blue-600 animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Importing Leads...</h3>
              <p className="text-gray-600 mb-8">
                Processing {validCount} leads. This may take a moment.
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{importProgress}% complete</p>

              <div className="mt-8 space-y-2 text-left">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle size={16} className="text-green-600" />
                  Validating data...
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle size={16} className="text-green-600" />
                  Creating lead records...
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 size={16} className="text-blue-600 animate-spin" />
                  Enriching with location data...
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {step === 'complete' && (
        <div className="max-w-2xl mx-auto">
          <Card className="p-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={48} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h3>
              <p className="text-gray-600 mb-8">
                Successfully imported {validCount} leads
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-3xl font-bold text-green-600">{validCount}</p>
                  <p className="text-sm text-gray-600 mt-1">Imported</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-3xl font-bold text-gray-600">{invalidCount}</p>
                  <p className="text-sm text-gray-600 mt-1">Skipped</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => {
                  setStep('upload')
                  setCsvData([])
                  setImportProgress(0)
                }}>
                  Import More
                </Button>
                <Button onClick={() => window.location.href = '/leads'}>
                  View Leads
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function StepIndicator({ number, label, active, complete }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
        complete ? 'bg-green-600 text-white' :
        active ? 'bg-blue-600 text-white' :
        'bg-gray-200 text-gray-600'
      }`}>
        {complete ? <Check size={20} /> : number}
      </div>
      <span className={`font-medium ${active ? 'text-gray-900' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  )
}

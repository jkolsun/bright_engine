'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import {
  Building, Target, Zap, Users, Key, Clock, DollarSign,
  CheckCircle, Save, Edit2, Plus, Trash2, Eye, EyeOff
} from 'lucide-react'

const MOCK_SETTINGS = {
  company: {
    name: 'Bright Automations',
    email: 'hello@brightautomations.com',
    phone: '5551234567',
    website: 'brightautomations.com',
    timezone: 'America/New_York'
  },
  targets: {
    monthlyCloses: 75,
    monthlyRevenue: 22425,
    conversionRate: 25,
    avgDealSize: 299
  },
  sequences: [
    {
      id: 1,
      name: 'Post-Launch Day 3',
      type: 'POST_LAUNCH',
      trigger: 'PREVIEW_SENT',
      delay: 3,
      unit: 'days',
      enabled: true,
      message: 'Hi {firstName}! Just checking in - have you had a chance to look at your preview? {previewUrl}'
    },
    {
      id: 2,
      name: 'Hot Lead Follow-up',
      type: 'HOT_LEAD',
      trigger: 'HOT_DETECTED',
      delay: 5,
      unit: 'minutes',
      enabled: true,
      message: 'Hi {firstName}! I saw you checked out the preview multiple times. Want to hop on a quick call to discuss next steps?'
    },
    {
      id: 3,
      name: 'Win-Back Day 7',
      type: 'WIN_BACK',
      trigger: 'NO_RESPONSE',
      delay: 7,
      unit: 'days',
      enabled: true,
      message: 'Hi {firstName}, wanted to follow up one last time. Still interested in getting your website live?'
    }
  ],
  personalization: {
    enabled: true,
    aiFirstLines: true,
    includeCompanyInfo: true,
    includeCityInfo: true,
    tone: 'friendly'
  },
  team: [
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah@bright.com',
      role: 'ADMIN',
      status: 'active'
    },
    {
      id: 2,
      name: 'Andrew Tesauro',
      email: 'andrew@bright.com',
      role: 'REP',
      status: 'active'
    },
    {
      id: 3,
      name: 'Jared Kolsun',
      email: 'jared@bright.com',
      role: 'ADMIN',
      status: 'active'
    }
  ],
  apiKeys: [
    { name: 'TWILIO_ACCOUNT_SID', value: 'AC••••••••••••••••••••••••••••••', visible: false },
    { name: 'TWILIO_AUTH_TOKEN', value: '••••••••••••••••••••••••••••••••', visible: false },
    { name: 'STRIPE_SECRET_KEY', value: 'sk_live_••••••••••••••••••••••••', visible: false },
    { name: 'SERPAPI_KEY', value: '••••••••••••••••••••••••••••••••', visible: false },
  ]
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'sequences' | 'personalization' | 'targets' | 'team' | 'api'>('company')
  const [settings, setSettings] = useState(MOCK_SETTINGS)
  const [editingSequence, setEditingSequence] = useState<number | null>(null)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your system configuration</p>
        </div>
        <Button>
          <Save size={16} className="mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Tabs */}
      <Card className="p-1">
        <div className="flex gap-1 flex-wrap">
          <TabButton
            active={activeTab === 'company'}
            onClick={() => setActiveTab('company')}
            icon={<Building size={16} />}
          >
            Company
          </TabButton>
          <TabButton
            active={activeTab === 'sequences'}
            onClick={() => setActiveTab('sequences')}
            icon={<Zap size={16} />}
          >
            Sequences
          </TabButton>
          <TabButton
            active={activeTab === 'personalization'}
            onClick={() => setActiveTab('personalization')}
            icon={<Target size={16} />}
          >
            Personalization
          </TabButton>
          <TabButton
            active={activeTab === 'targets'}
            onClick={() => setActiveTab('targets')}
            icon={<DollarSign size={16} />}
          >
            Targets
          </TabButton>
          <TabButton
            active={activeTab === 'team'}
            onClick={() => setActiveTab('team')}
            icon={<Users size={16} />}
          >
            Team
          </TabButton>
          <TabButton
            active={activeTab === 'api'}
            onClick={() => setActiveTab('api')}
            icon={<Key size={16} />}
          >
            API Keys
          </TabButton>
        </div>
      </Card>

      {/* Tab Content */}
      {activeTab === 'company' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <Input value={settings.company.name} onChange={() => {}} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input type="email" value={settings.company.email} onChange={() => {}} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <Input value={settings.company.phone} onChange={() => {}} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
              <Input value={settings.company.website} onChange={() => {}} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'sequences' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Automated SMS sequences that trigger based on lead behavior
            </p>
            <Button size="sm">
              <Plus size={14} className="mr-2" />
              Add Sequence
            </Button>
          </div>
          
          {settings.sequences.map(seq => (
            <Card key={seq.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">{seq.name}</h4>
                    <Badge variant={seq.enabled ? 'success' : 'outline'}>
                      {seq.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {seq.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Trigger: {seq.trigger.replace('_', ' ')} • Delay: {seq.delay} {seq.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSequence(editingSequence === seq.id ? null : seq.id)}
                  >
                    <Edit2 size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 size={14} className="text-red-600" />
                  </Button>
                </div>
              </div>
              
              {editingSequence === seq.id ? (
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message Template</label>
                    <textarea
                      value={seq.message}
                      onChange={() => {}}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available variables: {'{firstName}'}, {'{company}'}, {'{previewUrl}'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delay</label>
                      <Input type="number" value={seq.delay} onChange={() => {}} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingSequence(null)}>
                      Cancel
                    </Button>
                    <Button size="sm">
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700">{seq.message}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'personalization' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Personalization</h3>
          <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">AI First Lines</p>
                <p className="text-sm text-gray-600">Generate personalized opening lines using AI</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.personalization.aiFirstLines} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Include Company Info</p>
                <p className="text-sm text-gray-600">Mention their business in outreach</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.personalization.includeCompanyInfo} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Include City Info</p>
                <p className="text-sm text-gray-600">Reference their local area</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.personalization.includeCityInfo} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message Tone</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="friendly">Friendly & Casual</option>
                <option value="professional">Professional</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="direct">Direct & Brief</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'targets' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Targets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Closes Target</label>
              <Input type="number" value={settings.targets.monthlyCloses} onChange={() => {}} />
              <p className="text-xs text-gray-500 mt-1">Number of deals to close per month</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Revenue Target</label>
              <Input type="number" value={settings.targets.monthlyRevenue} onChange={() => {}} />
              <p className="text-xs text-gray-500 mt-1">Total revenue goal per month</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Conversion Rate (%)</label>
              <Input type="number" value={settings.targets.conversionRate} onChange={() => {}} />
              <p className="text-xs text-gray-500 mt-1">Percentage of leads to convert</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Average Deal Size</label>
              <Input type="number" value={settings.targets.avgDealSize} onChange={() => {}} />
              <p className="text-xs text-gray-500 mt-1">Expected revenue per close</p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Manage team members and their roles
            </p>
            <Button size="sm">
              <Plus size={14} className="mr-2" />
              Add Team Member
            </Button>
          </div>

          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settings.team.map(member => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{member.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{member.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={member.role === 'ADMIN' ? 'default' : 'outline'}>
                        {member.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="success">Active</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button variant="outline" size="sm">
                        <Edit2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {activeTab === 'api' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h3>
          <div className="space-y-3 max-w-2xl">
            {settings.apiKeys.map((key, idx) => (
              <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{key.name}</p>
                  <p className="text-sm text-gray-600 font-mono">{key.value}</p>
                </div>
                <Button variant="outline" size="sm">
                  <Eye size={14} />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Security Warning:</strong> Never share your API keys. They provide full access to your account.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

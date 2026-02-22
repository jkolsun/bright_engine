'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Loader2, Save, Plus, Trash2, Phone, Sparkles,
  ChevronDown, Pencil, Shield, AlertCircle, XCircle,
} from 'lucide-react'
import { useSettingsContext } from '../_lib/context'
import { SaveButton, SectionHeader, FieldLabel, FieldInfo, PriceInput } from '../_lib/components'
import { DEFAULT_COMPANY } from '../_lib/defaults'

export default function CompanyTab() {
  const { rawSettings, settingsLoaded, saveSetting, savingKey, savedKey } = useSettingsContext()

  // ── Company Info state ──
  const [companyInfo, setCompanyInfo] = useState(DEFAULT_COMPANY)

  // ── Unified Products (core + upsells in one table) ──
  const [products, setProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editingProductData, setEditingProductData] = useState<any>(null)
  const [customPitch, setCustomPitch] = useState(false)
  const [customScript, setCustomScript] = useState(false)
  const [customBanner, setCustomBanner] = useState(false)
  const [showUpsellTargeting, setShowUpsellTargeting] = useState(false)
  const [verifyResults, setVerifyResults] = useState<Record<string, { valid: boolean; reason: string }>>({})
  const [verifyingAll, setVerifyingAll] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [envLinks, setEnvLinks] = useState<Record<string, { set: boolean; preview: string }>>({})

  const [newProduct, setNewProduct] = useState({
    name: '', price: '', recurring: true, isCore: false,
    stripeLink: '', month1Price: '', recurringPrice: '', annualPrice: '',
    stripeLinkAnnual: '', pitchOneLiner: '', previewBannerText: '', repCloseScript: '',
    description: '', aiPitchInstructions: '', aiProductSummary: '',
    eligibleIndustries: '', minClientAgeDays: '', maxPitchesPerClient: '3',
    pitchChannel: 'sms', sortOrder: '0',
  })

  // ── Initialize state from rawSettings ──
  useEffect(() => {
    if (!settingsLoaded) return
    const s = rawSettings
    if (s.company_info && typeof s.company_info === 'object') {
      setCompanyInfo({ ...DEFAULT_COMPANY, ...s.company_info })
    }
  }, [settingsLoaded, rawSettings])

  // ── Fetch products + env links on mount ──
  useEffect(() => {
    fetchProducts()
    fetchEnvLinks()
  }, [])

  // ── Unified Products (core + upsells) ────────────────────────
  const fetchProducts = async () => {
    setProductsLoading(true)
    try {
      const res = await fetch(`/api/upsell-products?_t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        const loadedProducts = data.products || []
        setProducts(loadedProducts)

        // Auto-seed if empty
        if (loadedProducts.length === 0) {
          await seedDefaultProducts()
          return
        }

        // One-time fix: if core product pitch still says $149, update to use actual prices
        const core = loadedProducts.find((p: any) => p.isCore)
        if (core?.pitchOneLiner?.includes('$149')) {
          const m1 = core.month1Price || 188
          const rec = core.recurringPrice || 39
          await fetch(`/api/upsell-products/${core.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pitchOneLiner: `$${m1} to go live, $${rec}/mo after that`,
              repCloseScript: `It's $${m1} for the first month \u2014 that covers the full site build plus your first month of hosting. After that it's just $${rec}/month to keep everything running.`,
              previewBannerText: `$${m1} to get started`,
            }),
          })
          await fetch('/api/settings/pricing', { method: 'POST' })
          // Re-fetch to get updated data
          const res2 = await fetch(`/api/upsell-products?_t=${Date.now()}`)
          if (res2.ok) {
            const data2 = await res2.json()
            setProducts(data2.products || [])
          }
        }
      }
    } catch { /* ignore */ }
    finally { setProductsLoading(false) }
  }

  const fetchEnvLinks = async () => {
    try {
      const res = await fetch('/api/settings/payment-links')
      if (res.ok) {
        const data = await res.json()
        setEnvLinks(data.envLinks || {})
      }
    } catch { /* ignore */ }
  }

  const seedDefaultProducts = async () => {
    // Seed core product — NO annual fields (annual is a separate upsell)
    await fetch('/api/upsell-products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Website + Hosting', price: 188, recurring: true, isCore: true,
        month1Price: 188, recurringPrice: 39,
        stripeLink: 'https://buy.stripe.com/28E28k7uG0Wsaxu7IM7wA06',
        pitchOneLiner: '$188 to go live, $39/mo after that',
        previewBannerText: '$188 to get started',
        repCloseScript: "It's $188 for the first month \u2014 that covers the full site build plus your first month of hosting. After that it's just $39/month to keep everything running.",
        aiProductSummary: 'Professional website + monthly hosting for service businesses',
        sortOrder: 0,
      })
    })
    // Seed upsells
    const upsells = [
      { name: 'Annual Hosting Plan', price: 399, recurring: false, stripeLink: 'https://buy.stripe.com/3cI5kw3eqfRm7lid367wA08', aiProductSummary: 'Annual hosting \u2014 $399/yr (save $69 vs monthly)', aiPitchInstructions: 'Pitch after 3 months of active monthly hosting. Mention they save $69/yr. Only pitch to clients who are happy and engaged.', minClientAgeDays: 90, maxPitchesPerClient: 2, sortOrder: 1 },
      { name: 'GBP Optimization', price: 49, recurring: false, stripeLink: 'https://buy.stripe.com/fZu3coeX8ax2fROfbe7wA09', aiProductSummary: 'Google Business Profile setup \u2014 $49 one-time', sortOrder: 2 },
      { name: 'Review Widget', price: 29, recurring: true, stripeLink: 'https://buy.stripe.com/fZu00c02e34AgVS3sw7wA0a', aiProductSummary: 'Review widget \u2014 $29/mo, shows Google reviews on your site', sortOrder: 3 },
      { name: 'SEO Updates', price: 59, recurring: true, stripeLink: 'https://buy.stripe.com/14A9AM5my7kQ20Yd367wA0b', aiProductSummary: 'Monthly SEO optimization \u2014 $59/mo', sortOrder: 4 },
      { name: 'Social Page', price: 99, recurring: false, stripeLink: 'https://buy.stripe.com/fZeV6aGS20w8pm4wA7wA0c', aiProductSummary: 'Social media page setup \u2014 $99 one-time', sortOrder: 5 },
    ]
    for (const u of upsells) {
      await fetch('/api/upsell-products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...u, isCore: false }),
      })
    }
    await fetchProducts()
  }

  const handleAddProduct = async () => {
    const priceVal = parseFloat(newProduct.price) || 0
    // Auto-generate AI summary if blank
    let aiSummary = newProduct.aiProductSummary
    if (!aiSummary?.trim()) {
      const priceStr = newProduct.recurring ? `$${priceVal}/mo` : `$${priceVal} one-time`
      aiSummary = `${newProduct.name} \u2014 ${priceStr}`
    }
    const payload = {
      name: newProduct.name,
      price: priceVal,
      recurring: newProduct.recurring,
      isCore: newProduct.isCore,
      stripeLink: newProduct.stripeLink || null,
      month1Price: newProduct.isCore ? (parseFloat(newProduct.month1Price) || null) : null,
      recurringPrice: newProduct.isCore ? (parseFloat(newProduct.recurringPrice) || null) : null,
      pitchOneLiner: newProduct.pitchOneLiner || null,
      previewBannerText: newProduct.isCore ? (newProduct.previewBannerText || null) : null,
      repCloseScript: newProduct.isCore ? (newProduct.repCloseScript || null) : null,
      description: newProduct.description || null,
      aiPitchInstructions: newProduct.aiPitchInstructions || null,
      aiProductSummary: aiSummary || null,
      eligibleIndustries: newProduct.eligibleIndustries ? newProduct.eligibleIndustries.split(',').map(s => s.trim()).filter(Boolean) : [],
      minClientAgeDays: newProduct.minClientAgeDays ? parseInt(newProduct.minClientAgeDays) : null,
      maxPitchesPerClient: parseInt(newProduct.maxPitchesPerClient) || 3,
      pitchChannel: newProduct.pitchChannel,
      sortOrder: parseInt(newProduct.sortOrder) || 0,
    }
    const res = await fetch('/api/upsell-products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    if (res.ok) {
      setAddProductOpen(false)
      setNewProduct({ name: '', price: '', recurring: true, isCore: false, stripeLink: '', month1Price: '', recurringPrice: '', annualPrice: '', stripeLinkAnnual: '', pitchOneLiner: '', previewBannerText: '', repCloseScript: '', description: '', aiPitchInstructions: '', aiProductSummary: '', eligibleIndustries: '', minClientAgeDays: '', maxPitchesPerClient: '3', pitchChannel: 'sms', sortOrder: '0' })
      if (payload.isCore) await fetch('/api/settings/pricing', { method: 'POST' })
      await fetchProducts()
    }
  }

  const handleUpdateProduct = async (id: string, data: any) => {
    // Strip relational/readonly fields before sending
    const { pitches, createdAt, updatedAt, id: _id, ...payload } = data
    try {
      const res = await fetch(`/api/upsell-products/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[Settings] Product update failed:', err)
        alert(`Save failed: ${err.error || 'Unknown error'}`)
        return
      }
      if (payload.isCore) await fetch('/api/settings/pricing', { method: 'POST' })
      setEditingProductId(null)
      setEditingProductData(null)
      await fetchProducts()
    } catch (err) {
      console.error('[Settings] Product update error:', err)
      alert('Save failed — check console for details')
    }
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" permanently? This removes it from the system. Historical pitch data is preserved.`)) return
    await fetch(`/api/upsell-products/${id}`, { method: 'DELETE' })
    await fetchProducts()
  }

  const handleDeactivateProduct = async (id: string, active: boolean) => {
    await fetch(`/api/upsell-products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    await fetchProducts()
  }

  const handleVerifyLink = async (productId: string, url: string) => {
    if (!url) return
    const res = await fetch('/api/settings/payment-links/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
    })
    if (res.ok) {
      const data = await res.json()
      setVerifyResults(prev => ({ ...prev, [productId]: data }))
    }
  }

  const handleVerifyAll = async () => {
    setVerifyingAll(true)
    setVerifyResults({})
    for (const product of products) {
      if (!product.active) {
        setVerifyResults(prev => ({ ...prev, [product.id]: { valid: false, reason: 'Inactive' } }))
      } else if (!product.stripeLink) {
        setVerifyResults(prev => ({ ...prev, [product.id]: { valid: false, reason: 'No URL configured' } }))
      } else {
        await handleVerifyLink(product.id, product.stripeLink)
      }
    }
    setVerifyingAll(false)
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Company Info */}
      <Card className="p-6">
        <SectionHeader title="Company Info" description="Basic company details and contact information" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Company Name</FieldLabel>
            <Input
              value={companyInfo.companyName}
              onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Admin Notification Phone</FieldLabel>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-gray-400" />
              <Input
                value={companyInfo.adminPhone}
                onChange={(e) => setCompanyInfo({ ...companyInfo, adminPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Receives hot lead alerts, digest reports, and system alerts</p>
          </div>
        </div>
        <div className="mt-4">
          <FieldLabel>Preview Expiration (Days)</FieldLabel>
          <Input
            type="number"
            min={1}
            max={90}
            className="w-32"
            value={companyInfo.previewExpirationDays}
            onChange={(e) => setCompanyInfo({ ...companyInfo, previewExpirationDays: parseInt(e.target.value) || 14 })}
          />
          <p className="text-xs text-gray-400 mt-1">How many days before a preview link expires</p>
        </div>
        <div className="mt-4">
          <FieldLabel>Post-Payment Explainer (shown to reps) <FieldInfo text="This is what reps see in their Product Info tab when a client asks 'what happens after I pay?' Keep it conversational." /></FieldLabel>
          <textarea
            value={companyInfo.postPaymentExplainer || ''}
            onChange={(e) => setCompanyInfo({ ...companyInfo, postPaymentExplainer: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Once payment is confirmed, our team finalizes your site within 48 hours..."
          />
        </div>
        <div className="mt-4">
          <FieldLabel>Competitive Advantages (shown to reps) <FieldInfo text="Talking points for reps when positioning against competitors. One per line works well." /></FieldLabel>
          <textarea
            value={companyInfo.competitiveAdvantages || ''}
            onChange={(e) => setCompanyInfo({ ...companyInfo, competitiveAdvantages: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Sites are mobile-first, load in under 2 seconds.&#10;SEO-optimized out of the box for local search."
          />
        </div>
        <div className="mt-6 flex justify-end">
          <SaveButton
            onClick={() => saveSetting('company_info', companyInfo)}
            saving={savingKey === 'company_info'}
            saved={savedKey === 'company_info'}
          />
        </div>
      </Card>

      {/* ── Unified Products Section ───────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Products" description="All products and payment links — core plan and upsells. The AI reads from this list." />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleVerifyAll} disabled={verifyingAll}>
              {verifyingAll ? <><Loader2 size={14} className="mr-1 animate-spin" /> Verifying...</> : <><Shield size={14} className="mr-1" /> Verify All</>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddProductOpen(!addProductOpen)}>
              <Plus size={14} className="mr-1" /> Add Product
            </Button>
          </div>
        </div>

        {/* Verify All Results Summary */}
        {Object.keys(verifyResults).length > 0 && !verifyingAll && (
          <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Verification Results</span>
              <button onClick={() => setVerifyResults({})} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-green-600 font-medium">{Object.values(verifyResults).filter(v => v?.valid).length} live</span>
              <span className="text-red-600 font-medium">{Object.values(verifyResults).filter(v => v && !v.valid).length} failed</span>
            </div>
            {Object.values(verifyResults).some(v => v && !v.valid) && (
              <div className="mt-2 space-y-1">
                {products.filter(p => verifyResults[p.id] && !verifyResults[p.id]?.valid).map(p => (
                  <div key={p.id} className="text-xs text-red-600 flex items-center gap-1">
                    <XCircle size={12} /> <span className="font-medium">{p.name}:</span> {verifyResults[p.id]?.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Product Form */}
        {addProductOpen && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <FieldLabel>Product Name</FieldLabel>
                <Input placeholder="e.g., SEO Package" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
              </div>
              <div>
                <FieldLabel>Price ($)</FieldLabel>
                <Input type="number" min={0} placeholder="0" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
              </div>
              <div>
                <FieldLabel>Type</FieldLabel>
                <select value={newProduct.recurring ? 'recurring' : 'one_time'} onChange={(e) => setNewProduct({ ...newProduct, recurring: e.target.value === 'recurring' })} className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm">
                  <option value="one_time">One-time</option>
                  <option value="recurring">Recurring (monthly)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isCore" checked={newProduct.isCore} onChange={(e) => setNewProduct({ ...newProduct, isCore: e.target.checked })} className="rounded" />
              <label htmlFor="isCore" className="text-sm font-medium text-blue-700">Core Product (main plan — pricing propagates system-wide)</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Stripe Payment Link</FieldLabel>
                <Input placeholder="https://buy.stripe.com/..." value={newProduct.stripeLink} onChange={(e) => setNewProduct({ ...newProduct, stripeLink: e.target.value })} className="font-mono text-sm" />
              </div>
              <div>
                <FieldLabel>AI Product Summary</FieldLabel>
                <Input placeholder="One-liner the AI uses in conversation" value={newProduct.aiProductSummary} onChange={(e) => setNewProduct({ ...newProduct, aiProductSummary: e.target.value })} />
              </div>
            </div>
            {newProduct.isCore && (
              <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg space-y-3">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Core Pricing Fields</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>First Month Price ($)</FieldLabel>
                    <Input type="number" min={0} value={newProduct.month1Price} onChange={(e) => setNewProduct({ ...newProduct, month1Price: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Recurring Price ($/mo)</FieldLabel>
                    <Input type="number" min={0} value={newProduct.recurringPrice} onChange={(e) => setNewProduct({ ...newProduct, recurringPrice: e.target.value })} />
                  </div>
                </div>
                <div>
                  <FieldLabel>Preview Banner Text</FieldLabel>
                  <Input placeholder='e.g., $188 to get started' value={newProduct.previewBannerText} onChange={(e) => setNewProduct({ ...newProduct, previewBannerText: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Pitch One-Liner (used everywhere)</FieldLabel>
                  <Input placeholder='e.g., $188 to go live, $39/mo after that' value={newProduct.pitchOneLiner} onChange={(e) => setNewProduct({ ...newProduct, pitchOneLiner: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Rep Close Script</FieldLabel>
                  <textarea placeholder="Full script reps use to close" value={newProduct.repCloseScript} onChange={(e) => setNewProduct({ ...newProduct, repCloseScript: e.target.value })} className="w-full h-20 px-3 py-2 text-sm border border-blue-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
              </div>
            )}
            <div>
              <FieldLabel>AI Pitch Instructions</FieldLabel>
              <textarea placeholder="How/when AI should pitch this product" value={newProduct.aiPitchInstructions} onChange={(e) => setNewProduct({ ...newProduct, aiPitchInstructions: e.target.value })} className="w-full h-16 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <FieldLabel>Description (admin-facing)</FieldLabel>
              <Input placeholder="Brief description" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
            </div>
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <ChevronDown size={12} className={showAdvanced ? 'rotate-180 transition-transform' : 'transition-transform'} /> Advanced Targeting
            </button>
            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                <div>
                  <FieldLabel>Eligible Industries</FieldLabel>
                  <Input placeholder="blank = all" value={newProduct.eligibleIndustries} onChange={(e) => setNewProduct({ ...newProduct, eligibleIndustries: e.target.value })} className="text-sm" />
                </div>
                <div>
                  <FieldLabel>Min Client Age (days)</FieldLabel>
                  <Input type="number" min={0} value={newProduct.minClientAgeDays} onChange={(e) => setNewProduct({ ...newProduct, minClientAgeDays: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Max Pitches</FieldLabel>
                  <Input type="number" min={1} value={newProduct.maxPitchesPerClient} onChange={(e) => setNewProduct({ ...newProduct, maxPitchesPerClient: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Pitch Channel</FieldLabel>
                  <select value={newProduct.pitchChannel} onChange={(e) => setNewProduct({ ...newProduct, pitchChannel: e.target.value })} className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm">
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAddProductOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddProduct} disabled={!newProduct.name.trim() || !newProduct.price}>Add Product</Button>
            </div>
          </div>
        )}

        {/* Products List */}
        {productsLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
            <Loader2 size={16} className="animate-spin" /> <span className="text-sm">Loading products...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No products yet. Seeding defaults...</div>
        ) : (
          <div className="space-y-2">
            {/* ── Core Products ── */}
            {products.filter(p => p.isCore).map((product: any) => {
              const verify = verifyResults[product.id]
              const isEditing = editingProductId === product.id

              const handleCorePriceChange = (field: string, value: string) => {
                const numVal = parseFloat(value) || 0
                const updated = { ...editingProductData, [field]: numVal || null }
                if (field === 'month1Price') updated.price = numVal

                const m1 = field === 'month1Price' ? numVal : (editingProductData?.month1Price || 0)
                const rec = field === 'recurringPrice' ? numVal : (editingProductData?.recurringPrice || 0)

                if (!customPitch) {
                  updated.pitchOneLiner = `$${m1} to go live, $${rec}/mo after that`
                }
                if (!customScript) {
                  updated.repCloseScript = `It's $${m1} for the first month \u2014 that covers the full site build plus your first month of hosting. After that it's just $${rec}/month to keep everything running.`
                }
                if (!customBanner) {
                  updated.previewBannerText = `$${m1} to get started`
                }
                setEditingProductData(updated)
              }

              return (
                <div key={product.id} className={`p-4 rounded-lg border-2 ${product.active ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                  {isEditing ? (
                    <div className="space-y-3">
                      {/* Row 1: Name, First Month, Recurring */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Name <FieldInfo text="Product name shown in Settings. Not visible to customers." /></label>
                          <Input className="h-8 text-sm" value={editingProductData?.name || ''} onChange={(e) => setEditingProductData({ ...editingProductData, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">First Month <FieldInfo text="What the customer pays month 1. Shows on: preview banners, rep scripts, email sequences, AI conversations, terms page, and Stripe webhook logic." /></label>
                          <PriceInput value={editingProductData?.month1Price || ''} onChange={(v) => handleCorePriceChange('month1Price', v)} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Recurring (/mo) <FieldInfo text="What the customer pays month 2+. Shows on: rep scripts, email sequences, AI conversations, terms page." /></label>
                          <PriceInput value={editingProductData?.recurringPrice || ''} onChange={(v) => handleCorePriceChange('recurringPrice', v)} />
                        </div>
                      </div>
                      {/* Row 2: Stripe Link + Banner Text */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Stripe Link <FieldInfo text="The Stripe payment link customers click to pay. AI sends this in conversations. Reps copy this during calls." /></label>
                          <Input className="h-8 text-sm font-mono" value={editingProductData?.stripeLink || ''} onChange={(e) => setEditingProductData({ ...editingProductData, stripeLink: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Banner Text <FieldInfo text="Text shown on the sticky banner at the top of preview pages. Customers see this." /></label>
                          <Input className="h-8 text-sm" value={editingProductData?.previewBannerText || ''} onChange={(e) => { setCustomBanner(true); setEditingProductData({ ...editingProductData, previewBannerText: e.target.value }) }} />
                          <p className="text-[10px] mt-0.5 italic text-gray-400">{customBanner ? 'Custom override \u2014 won\u2019t auto-update when prices change.' : 'Auto-generated from prices. Edit to override.'} {customBanner && <button type="button" className="text-blue-500 hover:underline ml-1" onClick={() => { setCustomBanner(false); const m1 = editingProductData?.month1Price || 0; setEditingProductData({ ...editingProductData, previewBannerText: `$${m1} to get started` }) }}>Reset to auto</button>}</p>
                        </div>
                      </div>
                      {/* Row 3: Pitch One-Liner */}
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Pitch One-Liner <FieldInfo text="Short pricing pitch used by AI in conversations and shown in product cards. Auto-generates from prices \u2014 edit to override." /></label>
                        <Input className="h-8 text-sm" value={editingProductData?.pitchOneLiner || ''} onChange={(e) => { setCustomPitch(true); setEditingProductData({ ...editingProductData, pitchOneLiner: e.target.value }) }} />
                        <p className="text-[10px] mt-0.5 italic text-gray-400">{customPitch ? 'Custom override \u2014 won\u2019t auto-update when prices change.' : 'Auto-generated from prices. Edit to override.'} {customPitch && <button type="button" className="text-blue-500 hover:underline ml-1" onClick={() => { setCustomPitch(false); const m1 = editingProductData?.month1Price || 0; const rec = editingProductData?.recurringPrice || 0; setEditingProductData({ ...editingProductData, pitchOneLiner: `$${m1} to go live, $${rec}/mo after that` }) }}>Reset to auto</button>}</p>
                      </div>
                      {/* Row 4: Rep Close Script */}
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Rep Close Script <FieldInfo text="What reps read verbatim when closing a deal on the phone. Auto-generates from prices \u2014 edit to override." /></label>
                        <textarea className="w-full h-16 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none" value={editingProductData?.repCloseScript || ''} onChange={(e) => { setCustomScript(true); setEditingProductData({ ...editingProductData, repCloseScript: e.target.value }) }} />
                        <p className="text-[10px] mt-0.5 italic text-gray-400">{customScript ? 'Custom override \u2014 won\u2019t auto-update when prices change.' : 'Auto-generated from prices. Edit to override.'} {customScript && <button type="button" className="text-blue-500 hover:underline ml-1" onClick={() => { setCustomScript(false); const m1 = editingProductData?.month1Price || 0; const rec = editingProductData?.recurringPrice || 0; setEditingProductData({ ...editingProductData, repCloseScript: `It's $${m1} for the first month \u2014 that covers the full site build plus your first month of hosting. After that it's just $${rec}/month to keep everything running.` }) }}>Reset to auto</button>}</p>
                      </div>
                      {/* Buttons */}
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => { setEditingProductId(null); setEditingProductData(null) }}>Cancel</Button>
                        <Button size="sm" onClick={() => handleUpdateProduct(product.id, editingProductData)}><Save size={14} className="mr-1" /> Save</Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold uppercase">Core</span>
                          <span className="text-sm font-semibold text-gray-900">{product.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            ${product.month1Price || product.price} first month / ${product.recurringPrice || '?'}/mo after
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {verify && <span className={`text-xs px-2 py-0.5 rounded-full ${verify.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{verify.valid ? 'Live' : 'Failed'}</span>}
                          {product.stripeLink && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleVerifyLink(product.id, product.stripeLink)}><Shield size={12} className="mr-1" /> Verify</Button>}
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                            setEditingProductId(product.id)
                            setEditingProductData({ ...product })
                            setCustomPitch(false)
                            setCustomScript(false)
                            setCustomBanner(false)
                          }}><Pencil size={12} className="mr-1" /> Edit</Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs opacity-40 cursor-not-allowed" disabled title="Cannot delete core product"><Trash2 size={12} /></Button>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                        {product.previewBannerText && <div>Banner: &quot;{product.previewBannerText}&quot;</div>}
                        {product.pitchOneLiner && <div>Pitch: &quot;{product.pitchOneLiner}&quot;</div>}
                        {product.stripeLink && <a href={product.stripeLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-mono truncate block max-w-[400px]">{product.stripeLink}</a>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* ── Upsell Products ── */}
            {products.filter(p => !p.isCore).map((product: any) => {
              const verify = verifyResults[product.id]
              const isEditing = editingProductId === product.id
              const pitchCount = product.pitches?.length || 0
              const paidCount = product.pitches?.filter((p: any) => p.status === 'paid').length || 0

              const generateAiSummary = () => {
                const priceStr = editingProductData?.recurring ? `$${editingProductData?.price || 0}/mo` : `$${editingProductData?.price || 0} one-time`
                return `${editingProductData?.name || 'Product'} \u2014 ${priceStr}`
              }

              return (
                <div key={product.id} className={`p-3 rounded-lg border ${product.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'} group`}>
                  {isEditing ? (
                    <div className="space-y-3">
                      {/* Row 1: Name, Price, Type */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Name <FieldInfo text="Product name the AI uses in conversations." /></label>
                          <Input className="h-8 text-sm" value={editingProductData?.name || ''} onChange={(e) => setEditingProductData({ ...editingProductData, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Price <FieldInfo text="Product price. The AI includes this when pitching." /></label>
                          <PriceInput value={editingProductData?.price || 0} onChange={(v) => setEditingProductData({ ...editingProductData, price: parseFloat(v) || 0 })} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Type</label>
                          <select className="w-full h-8 px-3 rounded-md border border-gray-200 bg-white text-sm" value={editingProductData?.recurring ? 'recurring' : 'one_time'} onChange={(e) => setEditingProductData({ ...editingProductData, recurring: e.target.value === 'recurring' })}>
                            <option value="one_time">One-time</option>
                            <option value="recurring">Recurring (monthly)</option>
                          </select>
                        </div>
                      </div>
                      {/* Row 2: Stripe Link + Verify */}
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Stripe Link <FieldInfo text="Payment link the AI sends when a client is ready to buy." /></label>
                        <div className="flex gap-2">
                          <Input className="h-8 text-sm font-mono flex-1" value={editingProductData?.stripeLink || ''} onChange={(e) => setEditingProductData({ ...editingProductData, stripeLink: e.target.value })} />
                          {editingProductData?.stripeLink && <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleVerifyLink(product.id, editingProductData.stripeLink)}><Shield size={12} className="mr-1" /> Verify</Button>}
                        </div>
                      </div>
                      {/* Row 3: AI Summary + AI Pitch Instructions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">AI Summary <FieldInfo text="One-line description the AI sees. Auto-generates if blank \u2014 edit to override." /></label>
                          <div className="flex gap-2">
                            <Input className="h-8 text-sm flex-1" value={editingProductData?.aiProductSummary || ''} onChange={(e) => setEditingProductData({ ...editingProductData, aiProductSummary: e.target.value })} />
                            <Button variant="outline" size="sm" className="h-8 text-xs whitespace-nowrap" onClick={() => setEditingProductData({ ...editingProductData, aiProductSummary: generateAiSummary() })}><Sparkles size={12} className="mr-1" /> Generate</Button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">AI Pitch Instructions <FieldInfo text="Tells the AI HOW to sell this. Write in plain English: when to pitch, what to say, what to avoid." /></label>
                          <Input className="h-8 text-sm" value={editingProductData?.aiPitchInstructions || ''} onChange={(e) => setEditingProductData({ ...editingProductData, aiPitchInstructions: e.target.value })} />
                        </div>
                      </div>
                      {/* Row 4: Description */}
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Description (admin-facing notes)</label>
                        <textarea className="w-full h-12 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none" value={editingProductData?.description || ''} onChange={(e) => setEditingProductData({ ...editingProductData, description: e.target.value })} />
                      </div>
                      {/* Targeting (collapsible) */}
                      <button type="button" onClick={() => setShowUpsellTargeting(!showUpsellTargeting)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <ChevronDown size={12} className={showUpsellTargeting ? 'rotate-180 transition-transform' : 'transition-transform'} /> Targeting
                      </button>
                      {showUpsellTargeting && (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Industries <FieldInfo text="Comma-separated. Leave blank to pitch to all industries." /></label>
                            <Input className="h-8 text-sm" placeholder="blank = all" value={(editingProductData?.eligibleIndustries || []).join(', ')} onChange={(e) => setEditingProductData({ ...editingProductData, eligibleIndustries: e.target.value ? e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) : [] })} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Min Age (days) <FieldInfo text="Don't pitch this product until the client has been active for this many days." /></label>
                            <Input type="number" min={0} className="h-8 text-sm" value={editingProductData?.minClientAgeDays || ''} onChange={(e) => setEditingProductData({ ...editingProductData, minClientAgeDays: parseInt(e.target.value) || null })} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Max Pitches <FieldInfo text="Stop pitching after this many tries per client." /></label>
                            <Input type="number" min={1} className="h-8 text-sm" value={editingProductData?.maxPitchesPerClient || 3} onChange={(e) => setEditingProductData({ ...editingProductData, maxPitchesPerClient: parseInt(e.target.value) || 3 })} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Channel <FieldInfo text="How the AI delivers the pitch: SMS, Email, or Both." /></label>
                            <select className="w-full h-8 px-2 rounded-md border border-gray-200 bg-white text-sm" value={editingProductData?.pitchChannel || 'sms'} onChange={(e) => setEditingProductData({ ...editingProductData, pitchChannel: e.target.value })}>
                              <option value="sms">SMS</option>
                              <option value="email">Email</option>
                              <option value="both">Both</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Sort Order</label>
                            <Input type="number" min={0} className="h-8 text-sm" value={editingProductData?.sortOrder || 0} onChange={(e) => setEditingProductData({ ...editingProductData, sortOrder: parseInt(e.target.value) || 0 })} />
                          </div>
                        </div>
                      )}
                      {/* Buttons */}
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => { setEditingProductId(null); setEditingProductData(null); setShowUpsellTargeting(false) }}>Cancel</Button>
                        <Button size="sm" onClick={() => {
                          // Auto-fill AI summary if blank
                          const finalData = { ...editingProductData }
                          if (!finalData.aiProductSummary?.trim()) {
                            const priceStr = finalData.recurring ? `$${finalData.price || 0}/mo` : `$${finalData.price || 0} one-time`
                            finalData.aiProductSummary = `${finalData.name || 'Product'} \u2014 ${priceStr}`
                          }
                          handleUpdateProduct(product.id, finalData)
                        }}><Save size={14} className="mr-1" /> Save</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${product.stripeLink ? (product.active ? 'bg-green-500' : 'bg-gray-400') : 'bg-amber-500'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{product.name}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">${product.price}{product.recurring ? '/mo' : ''}</span>
                            {!product.stripeLink && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">No URL</span>}
                            {!product.active && <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600">Inactive</span>}
                          </div>
                          {product.aiProductSummary && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[500px]">{product.aiProductSummary}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {verify && <span className={`text-xs px-2 py-0.5 rounded-full ${verify.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{verify.valid ? 'Live' : 'Failed'}</span>}
                        {pitchCount > 0 && <span className="text-xs text-gray-500">{paidCount}/{pitchCount} converted</span>}
                        {product.stripeLink && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleVerifyLink(product.id, product.stripeLink)}><Shield size={12} className="mr-1" /> Verify</Button>}
                        <Button variant="outline" size="sm" className={`h-7 text-xs ${product.active ? '' : 'border-green-300 text-green-600 hover:bg-green-50'}`} onClick={() => handleDeactivateProduct(product.id, product.active)}>
                          {product.active ? 'Deactivate' : 'Reactivate'}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setEditingProductId(product.id); setEditingProductData({ ...product }); setShowUpsellTargeting(false) }}><Pencil size={12} className="mr-1" /> Edit</Button>
                        <button onClick={() => handleDeleteProduct(product.id, product.name)} className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete permanently"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Env Var Cross-Check */}
        {Object.keys(envLinks).length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Railway Env Var Cross-Check</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {Object.entries(envLinks).map(([key, status]) => (
                <div key={key} className="flex items-center gap-2 text-xs py-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${status.set ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="font-mono text-gray-600">{key}</span>
                  <span className={status.set ? 'text-green-600' : 'text-gray-400'}>{status.set ? 'Set' : 'Not set'}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Env vars are legacy fallbacks. Products table is the source of truth.</p>
          </div>
        )}
      </Card>
    </div>
  )
}

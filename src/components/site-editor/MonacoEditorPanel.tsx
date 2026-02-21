'use client'

import Editor from '@monaco-editor/react'

interface MonacoEditorPanelProps {
  value: string
  onChange: (value: string) => void
}

export default function MonacoEditorPanel({ value, onChange }: MonacoEditorPanelProps) {
  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="html"
        theme="vs-dark"
        value={value}
        onChange={(val) => onChange(val || '')}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          automaticLayout: true,
          formatOnPaste: true,
          suggestOnTriggerCharacters: true,
          tabSize: 2,
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          linkedEditing: true,
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-gray-400">
            Loading editor...
          </div>
        }
      />
    </div>
  )
}

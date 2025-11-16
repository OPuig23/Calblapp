//file: src/components/calendar/SharePointFilePicker.tsx
'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Folder, FileText, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = { id: string; name: string; webUrl: string; folder?: any; file?: { mimeType: string } }

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  basePath?: string // default /Esdeveniments
  onSelected: (item: { id: string; name: string; url: string }) => void
}

export default function SharePointPicker({ open, onOpenChange, basePath = '/Esdeveniments', onSelected }: Props) {
  const [path, setPath] = useState(basePath)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    void load(path)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, path])

  async function load(p: string) {
    try {
      setLoading(true); setError(null)
      const url = `/api/sharepoint/browse?path=${encodeURIComponent(p)}`
      const res = await fetch(url)
      const data = await res.json()
      setItems(data.items || [])
      // bres
      const parts = p.split('/').filter(Boolean)
      const idx = parts.findIndex(seg => seg.toLowerCase() === 'esdeveniments')
      setBreadcrumbs(parts.slice(idx)) // mostrar des d'Esdeveniments
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function goUp() {
    const parts = path.split('/').filter(Boolean)
    if (parts.length <= 1) return
    setPath('/' + parts.slice(0, -1).join('/'))
  }

  async function selectFile(item: Item) {
    // demanem un link anònim view
    const res = await fetch('/api/sharepoint/browse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id })
    })
    const data = await res.json()
    if (!data?.url) return
onSelected({
  id: item.id,
  name: item.name,
  url: data.url,   // ✔️ DIRECTE, és el que retorna l’API
})


    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-lg">Selecciona un fitxer (SharePoint)</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <Button variant="ghost" size="sm" onClick={goUp} className="h-8 px-2" aria-label="Amunt">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 truncate">
              <span className="text-muted-foreground">/</span>
              {breadcrumbs.map((b, i) => (
                <span key={i} className="text-muted-foreground">
                  {b}{i < breadcrumbs.length - 1 ? ' / ' : ''}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-lg border">
            {loading && <div className="p-4 text-sm">Carregant…</div>}
            {error && <div className="p-4 text-sm text-red-600">Error: {error}</div>}
            {!loading && !error && (
              <ul className="max-h-[50vh] overflow-auto divide-y">
                {items.map(it => {
                  const isFolder = !!it.folder
                  return (
                    <li key={it.id} className="flex items-center justify-between p-3">
                      <button
                        className={cn("flex items-center gap-3 text-left w-full", !isFolder && "hover:opacity-80")}
                        onClick={() => isFolder ? setPath(path.replace(/\/$/, '') + '/' + it.name) : selectFile(it)}
                      >
                        {isFolder ? <Folder className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{it.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{isFolder ? 'Carpeta' : (it.file?.mimeType || '')}</div>
                        </div>
                        {!isFolder && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 pt-0">
          <Input readOnly value={path} className="text-xs" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

'use client'
import { useEffect, useRef, useState } from 'react'
import Layout from '@/components/layout'
import { MessageSquare, Plus, Send, Hash, Users, Upload, Smile, Search, X } from 'lucide-react'

interface Message {
  _id: string
  senderId: string
  senderName: string
  content: string
  type: string
  fileUrl?: string
  fileName?: string
  createdAt: string
}

interface Room {
  _id: string
  name: string
  type: string
  description?: string
  lastMessageAt?: string
}

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [searchRooms, setSearchRooms] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sseRef = useRef<EventSource | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadUser()
    loadRooms()
    return () => { sseRef.current?.close() }
  }, [])

  useEffect(() => {
    if (activeRoom) {
      loadMessages(activeRoom._id)
      subscribeToRoom(activeRoom._id)
    }
    return () => { sseRef.current?.close() }
  }, [activeRoom])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadUser() {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    const d = await res.json()
    if (d.success) setUser(d.user)
  }

  async function loadRooms() {
    const res = await fetch('/api/chat/rooms', { credentials: 'include' })
    const d = await res.json()
    if (d.success) {
      const roomList = d.rooms || []
      setRooms(roomList)
      // Create default rooms if none exist
      if (roomList.length === 0) {
        await createDefaultRooms()
        loadRooms()
      } else if (!activeRoom) {
        setActiveRoom(roomList[0])
      }
    }
  }

  async function createDefaultRooms() {
    const defaults = [
      { name: 'general', type: 'CHANNEL', description: 'Company-wide announcements and discussions' },
      { name: 'operations', type: 'CHANNEL', description: 'Operations team channel' },
      { name: 'finance', type: 'CHANNEL', description: 'Finance and accounts' },
    ]
    for (const room of defaults) {
      await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(room),
      })
    }
  }

  async function loadMessages(roomId: string) {
    const res = await fetch(`/api/chat/messages?roomId=${roomId}`, { credentials: 'include' })
    const d = await res.json()
    if (d.success) setMessages(d.messages || [])
  }

  function subscribeToRoom(roomId: string) {
    sseRef.current?.close()
    const since = new Date().toISOString()
    const sse = new EventSource(`/api/chat/stream?roomId=${roomId}&since=${since}`)
    sse.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'messages') {
        setMessages(prev => {
          const ids = new Set(prev.map(m => m._id))
          const newMsgs = data.messages.filter((m: Message) => !ids.has(m._id))
          return [...prev, ...newMsgs]
        })
      }
    }
    sseRef.current = sse
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !activeRoom || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roomId: activeRoom._id, content: input }),
      })
      const d = await res.json()
      if (d.success) {
        setMessages(prev => [...prev, d.message])
        setInput('')
      }
    } finally { setSending(false) }
  }

  async function createRoom(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/chat/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newRoomName, description: newRoomDesc, type: 'CHANNEL' }),
    })
    const d = await res.json()
    if (d.success) {
      setShowCreateRoom(false)
      setNewRoomName('')
      setNewRoomDesc('')
      setRooms(prev => [...prev, d.room])
      setActiveRoom(d.room)
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeRoom) return
    // For now, store as data URL (in production, upload to Cloudinary/S3)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const content = `[File: ${file.name}]`
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          roomId: activeRoom._id, content,
          type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
          fileUrl: ev.target?.result as string,
          fileName: file.name,
          fileSize: file.size,
        }),
      })
      const d = await res.json()
      if (d.success) setMessages(prev => [...prev, d.message])
    }
    reader.readAsDataURL(file)
  }

  const filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(searchRooms.toLowerCase()))

  function formatTime(ts: string) {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(ts: string) {
    const d = new Date(ts)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Today'
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = []
  messages.forEach(m => {
    const date = formatDate(m.createdAt)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.msgs.push(m)
    else grouped.push({ date, msgs: [m] })
  })

  return (
    <Layout>
      <div className="flex h-[calc(100vh-6rem)] rounded-2xl border border-white/[0.07] overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-white/[0.06] flex flex-col bg-black/30">
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Channels</h3>
              <button onClick={() => setShowCreateRoom(true)} className="text-zinc-500 hover:text-white transition-all">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-1.5">
              <Search size={11} className="text-zinc-600" />
              <input value={searchRooms} onChange={e => setSearchRooms(e.target.value)}
                placeholder="Search channels..."
                className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-600 outline-none" />
            </div>
          </div>

          {showCreateRoom && (
            <form onSubmit={createRoom} className="p-3 border-b border-white/[0.06] bg-white/[0.02]">
              <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} required
                placeholder="Channel name" autoFocus
                className="w-full rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-white outline-none mb-2 border border-white/10" />
              <input value={newRoomDesc} onChange={e => setNewRoomDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-white outline-none mb-2 border border-white/10" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-white text-black text-xs py-1.5 font-medium">Create</button>
                <button type="button" onClick={() => setShowCreateRoom(false)} className="px-2 text-zinc-500 hover:text-white"><X size={12} /></button>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
            {filteredRooms.map(room => (
              <button key={room._id} onClick={() => setActiveRoom(room)}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${
                  activeRoom?._id === room._id ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-white'
                }`}>
                <Hash size={13} className="flex-shrink-0" />
                <span className="text-xs font-medium truncate">{room.name}</span>
              </button>
            ))}
          </div>

          {/* User */}
          <div className="border-t border-white/[0.06] p-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">{user?.name || 'Loading...'}</p>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  <span className="text-[9px] text-zinc-600">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat area */}
        {activeRoom ? (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3">
              <Hash size={15} className="text-zinc-500" />
              <div>
                <h3 className="text-sm font-semibold text-white">{activeRoom.name}</h3>
                {activeRoom.description && <p className="text-xs text-zinc-600">{activeRoom.description}</p>}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {grouped.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Hash size={32} className="text-zinc-700 mb-3" />
                  <p className="text-sm font-semibold text-zinc-500">Welcome to #{activeRoom.name}</p>
                  <p className="text-xs text-zinc-700 mt-1">Be the first to send a message!</p>
                </div>
              ) : (
                grouped.map(({ date, msgs }) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-white/[0.05]" />
                      <span className="text-[10px] text-zinc-600 bg-black px-3 py-1 rounded-full border border-white/[0.06]">{date}</span>
                      <div className="flex-1 h-px bg-white/[0.05]" />
                    </div>
                    <div className="space-y-3">
                      {msgs.map((msg, i) => {
                        const isMe = msg.senderId === user?.id
                        const prevMsg = msgs[i - 1]
                        const sameUser = prevMsg?.senderId === msg.senderId
                        return (
                          <div key={msg._id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                            {!sameUser && (
                              <div className="h-7 w-7 flex-shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-xs font-bold text-white mt-0.5">
                                {msg.senderName?.[0]?.toUpperCase()}
                              </div>
                            )}
                            {sameUser && <div className="w-7 flex-shrink-0" />}
                            <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                              {!sameUser && (
                                <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-xs font-semibold text-white">{isMe ? 'You' : msg.senderName}</span>
                                  <span className="text-[10px] text-zinc-600">{formatTime(msg.createdAt)}</span>
                                </div>
                              )}
                              {msg.type === 'FILE' || msg.type === 'IMAGE' ? (
                                <div className={`rounded-xl border px-4 py-3 ${isMe ? 'bg-white/10 border-white/20' : 'bg-white/[0.04] border-white/[0.08]'}`}>
                                  {msg.type === 'IMAGE' && msg.fileUrl && (
                                    <img src={msg.fileUrl} alt={msg.fileName} className="max-w-[200px] rounded-lg mb-2" />
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Upload size={12} className="text-zinc-400" />
                                    <span className="text-xs text-zinc-300">{msg.fileName}</span>
                                  </div>
                                  {msg.fileUrl && msg.type === 'FILE' && (
                                    <a href={msg.fileUrl} download={msg.fileName}
                                      className="text-[10px] text-blue-400 hover:underline mt-1 block">
                                      Download
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <div className={`rounded-xl px-4 py-2.5 text-sm ${
                                  isMe ? 'bg-white text-black font-medium' : 'bg-white/[0.06] text-zinc-200 border border-white/[0.06]'
                                }`}>
                                  {msg.content}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/[0.06] px-5 py-4">
              <form onSubmit={sendMessage} className="flex items-end gap-3">
                <input type="file" ref={fileInputRef} onChange={uploadFile} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="text-zinc-600 hover:text-zinc-300 transition-all flex-shrink-0 p-1">
                  <Upload size={16} />
                </button>
                <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] flex items-center px-4 gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(e as any))}
                    placeholder={`Message #${activeRoom.name}`}
                    className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-zinc-600 outline-none"
                  />
                </div>
                <button type="submit" disabled={!input.trim() || sending}
                  className="rounded-xl bg-white p-3 disabled:opacity-30 hover:bg-zinc-100 transition-all flex-shrink-0">
                  <Send size={14} className="text-black" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={40} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-sm text-zinc-500">Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Plus, Send, MessageSquare,
  Hash, Users, Circle,
} from 'lucide-react'

interface ChatRoom {
  _id: string
  name: string
  description?: string
  createdAt?: string
}

interface ChatMessage {
  _id: string
  content: string
  senderId?: { name?: string; email?: string } | string
  senderName?: string
  roomId?: string
  createdAt: string
}

interface Employee {
  _id: string
  name: string
  email?: string
  role?: string
  department?: string
  isActive?: boolean
}

function getSenderName(msg: ChatMessage): string {
  if (msg.senderName) return msg.senderName
  if (!msg.senderId) return 'Unknown'
  if (typeof msg.senderId === 'string') return msg.senderId
  return msg.senderId.name ?? msg.senderId.email ?? 'Unknown'
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

export default function ChatPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [showNewRoom, setShowNewRoom] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchRooms()
    loadCurrentUser()
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom._id)
    }
  }, [selectedRoom])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadCurrentUser() {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const d = await res.json()
        if (d.success) setCurrentUserId(d.user?.id ?? null)
      }
    } catch { /* silent */ }
  }

  async function fetchEmployees() {
    try {
      // Try employees endpoint first, fall back to admin users
      const res = await fetch('/api/employees?limit=100')
      if (res.ok) {
        const d = await res.json()
        const list = Array.isArray(d) ? d : (d.employees ?? d.data ?? [])
        setEmployees(list.filter((e: Employee) => e.isActive !== false))
        return
      }
    } catch { /* try fallback */ }
    try {
      const res = await fetch('/api/admin/users?limit=100')
      if (res.ok) {
        const d = await res.json()
        const list = Array.isArray(d) ? d : (d.users ?? d.data ?? [])
        setEmployees(list.filter((e: Employee) => e.isActive !== false))
      }
    } catch { /* silent */ }
  }

  async function fetchRooms() {
    setLoadingRooms(true)
    try {
      const res = await fetch('/api/chat/rooms')
      if (res.ok) {
        const d = await res.json()
        const roomList = Array.isArray(d) ? d : (d.rooms ?? [])
        setRooms(roomList)
        if (roomList.length > 0 && !selectedRoom) {
          setSelectedRoom(roomList[0])
        }
      } else {
        setError('Could not load chat rooms')
      }
    } catch {
      setError('Failed to connect to chat')
    } finally {
      setLoadingRooms(false)
    }
  }

  async function fetchMessages(roomId: string) {
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/chat/messages?roomId=${roomId}`)
      if (res.ok) {
        const d = await res.json()
        setMessages(Array.isArray(d) ? d : (d.messages ?? []))
      } else {
        setMessages([])
      }
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !selectedRoom) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, roomId: selectedRoom._id }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages((prev) => [...prev, msg.message ?? msg])
      }
    } catch {
      // silently fail
    } finally {
      setSending(false)
    }
  }

  async function createRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!newRoomName.trim()) return
    setCreatingRoom(true)
    try {
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName.trim() }),
      })
      if (res.ok) {
        const d = await res.json()
        const room = d.room ?? d
        setRooms((prev) => [...prev, room])
        setSelectedRoom(room)
        setNewRoomName('')
        setShowNewRoom(false)
      }
    } catch {
      // silently fail
    } finally {
      setCreatingRoom(false)
    }
  }

  return (
    <div className="h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => router.push('/admin')}
          className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-semibold">Team Chat</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Rooms + Team Members */}
        <div className="w-64 border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
          {/* Channels section */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Channels</span>
            <button
              onClick={() => setShowNewRoom((p) => !p)}
              className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition"
            >
              <Plus className="w-3 h-3 text-gray-500" />
            </button>
          </div>

          {showNewRoom && (
            <form onSubmit={createRoom} className="px-3 py-2 border-b border-gray-100">
              <input
                autoFocus
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Channel name..."
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-400 mb-1.5"
              />
              <button
                type="submit"
                disabled={creatingRoom || !newRoomName.trim()}
                className="w-full py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium disabled:opacity-50 hover:bg-gray-800 transition"
              >
                {creatingRoom ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Create Channel'}
              </button>
            </form>
          )}

          <div className="py-1">
            {loadingRooms ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No channels yet.</p>
                <p className="text-xs text-gray-400">Create one to get started.</p>
              </div>
            ) : (
              rooms.map((room) => (
                <button
                  key={room._id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full text-left px-4 py-2 flex items-center gap-2.5 transition ${
                    selectedRoom?._id === room._id
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                  <span className="text-sm truncate">{room.name}</span>
                </button>
              ))
            )}
          </div>

          {/* Team Members section */}
          <div className="border-t border-gray-100 mt-2">
            <div className="flex items-center gap-2 px-4 py-3">
              <Users className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">Team Members</span>
              <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">{employees.length}</span>
            </div>
            <div className="pb-3 space-y-0.5">
              {employees.length === 0 ? (
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">No team members found.</p>
                </div>
              ) : employees.map(emp => (
                <div key={emp._id} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-gray-50 transition">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                    emp._id === currentUserId ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {initials(emp.name || emp.email || '?')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-700 truncate font-medium">
                      {emp.name || emp.email}
                      {emp._id === currentUserId && <span className="text-gray-400 font-normal"> (you)</span>}
                    </p>
                    {emp.department && <p className="text-[10px] text-gray-400 truncate">{emp.department}</p>}
                  </div>
                  <Circle className="w-1.5 h-1.5 text-emerald-500 fill-emerald-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedRoom ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400">Select a room to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Room header */}
              <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">{selectedRoom.name}</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {loadingMessages ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="w-10 h-10 text-gray-400 mb-3" />
                    <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg._id} className="flex flex-col gap-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-900">{getSenderName(msg)}</span>
                        <span className="text-xs text-gray-400">{fmtTime(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{msg.content}</p>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <form
                onSubmit={sendMessage}
                className="px-6 py-4 border-t border-gray-200 flex items-center gap-3"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message #${selectedRoom.name}`}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 transition disabled:opacity-40"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="fixed bottom-6 right-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 z-50">
          {error}
        </div>
      )}
    </div>
  )
}

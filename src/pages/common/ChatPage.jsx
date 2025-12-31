import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { setChatLock } from '../../store/chatSlice'
import service from '../../appwrite/db'

export default function ChatPage() {
  const { classIdParam } = useParams()
  const { userData, userRole, classId: userClass } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const classId = classIdParam || userClass

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [pageSize] = useState(100)
  const [chatLocked, setChatLockedState] = useState(false)
  const [chatSettingDocId, setChatSettingDocId] = useState(null)
  const [chatClass, setChatClass] = useState(classId || '6')
  // earliest message timestamp (ISO) loaded in current buffer (oldest)
  const earliestRef = useRef(null)
  const scrollRef = useRef(null)
  const pollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!classId) return
    let mounted = true

    const fetchMessages = async (opts = {}) => {
      // opts = {limit, before} - before -> ISO timestamp to fetch older messages (strictly less than)
      try {
        const res = await service.getMessages(classId, opts.limit || pageSize, opts.before || null)
        if (!mounted) return
        // service returns messages in DESC order (newest first). For display we want oldest first -> newest last
        const docs = (res.documents || []).slice()
        docs.reverse()

        if (opts.before) {
          // older page - prepend
          setMessages(prev => {
            // Avoid duplications
            const existingIds = new Set(prev.map(m => m.$id))
            const toAdd = docs.filter(d => !existingIds.has(d.$id))
            return [...toAdd, ...prev]
          })
        } else {
          // initial load or refresh - replace
          setMessages(docs)
        }

        // Update earliestRef and hasMore
        if (docs.length > 0) {
          earliestRef.current = docs[0].$createdAt || docs[0].$createdAt || docs[0].$createdAt
        }

        // If returned less than requested limit, no more older messages
        if (res.documents.length < (opts.limit || pageSize)) setHasMore(false)
        else setHasMore(true)

      } catch (e) {
        console.warn('Failed to fetch messages', e)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    }

    const loadChatSettings = async () => {
      try {
        const res = await service.getChatSetting(classId)
        if (!mounted) return
        if (res.documents && res.documents.length > 0) {
          const doc = res.documents[0]
          setChatLockedState(Boolean(doc.islocked))
          setChatSettingDocId(doc.$id)
          dispatch(setChatLock(Boolean(doc.islocked)))
        } else {
          setChatLockedState(false)
          setChatSettingDocId(null)
          dispatch(setChatLock(false))
        }
      } catch (e) {
        console.warn('Failed to load chat settings', e)
      }
    }

    // initial load
    fetchMessages()
    loadChatSettings()

    // Poll for new messages and settings every 3s (refresh newest messages)
    pollRef.current = setInterval(() => {
      fetchMessages()
      loadChatSettings()
    }, 3000)

    return () => {
      mounted = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [classId])

  useEffect(() => {
    // Scroll to bottom when initial messages load (not when prepending older pages)
    if (scrollRef.current && !loadingMore) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loadingMore])

  // Handle scroll-up to load older messages
  const onScroll = async (e) => {
    const el = e.target
    if (el.scrollTop <= 10 && hasMore && !loadingMore) {
      // load older messages
      setLoadingMore(true)
      const oldScrollHeight = el.scrollHeight
      // use earliest loaded message createdAt as 'before'
      const before = earliestRef.current
      await fetchMessages({ before, limit: pageSize })
      // adjust scroll position so content doesn't jump
      const newScrollHeight = el.scrollHeight
      el.scrollTop = newScrollHeight - oldScrollHeight + 10
    }
  }

  useEffect(() => {
    // Try to keep input visible and focused on mount
    if (inputRef.current) inputRef.current.focus()
  }, [])

  const handleSend = async () => {
    if (chatLocked && userRole !== 'teacher') return alert('Chat is locked by the teacher. You cannot send messages right now.')
    if (!text.trim()) return
    if (!userData) return alert('Please login to send messages')
    const tmpId = 'tmp-' + Date.now()
    const optimistic = {
      $id: tmpId,
      classid: classId,
      senderid: userData.$id,
      sendername: userData.name || userData.email,
      role: userRole,
      message: text,
      fileid: null,
      filetype: null,
      $createdAt: new Date().toISOString(),
      pending: true
    }

    setMessages(prev => [...prev, optimistic])
    const sendText = text
    setText('')
    setSending(true)

    try {
      const created = await service.sendMessage({ classId, senderId: userData.$id, senderName: userData.name || userData.email, role: userRole, message: sendText })
      // Replace optimistic message with created message
      setMessages(prev => prev.map(m => (m.$id === tmpId ? created : m)))
    } catch (e) {
      console.error('Send failed', e)
      // Remove optimistic message and show error
      setMessages(prev => prev.filter(m => m.$id !== tmpId))
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
      // After send, ensure scroll
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f7f3] pb-24 safe-area-top flex flex-col">

      {/* Sticky Top Bar like WhatsApp */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{classId?.toString().substring(0, 2).toUpperCase()}</div>
          <div>
            <div className="text-sm font-bold">Class {classId}</div>
            <div className="text-[11px] text-gray-400">Class room chat</div>
          </div>
        </div>
        {/* <div className="text-xs text-gray-500">Online</div> */}



        <div className="flex gap-2 items-center">
          {userRole === 'teacher' ? (
            <>
              <select value={chatClass} onChange={(e) => {
                // immediately change room by navigating to route (no button)
                const v = e.target.value
                setChatClass(v)
                navigate(`/chat/${v}`)
              }} className="text-sm p-2 rounded-lg border bg-white">
                <option value="5">Class 5</option>
                <option value="6">Class 6</option>
                <option value="7">Class 7</option>
                <option value="8">Class 8</option>
                <option value="9">Class 9</option>
                <option value="10">Class 10</option>
                <option value="11">Class 11</option>
                <option value="12">Class 12</option>
              </select>

              {/* <button onClick={() => navigate(`/chat/${chatClass}`)} className="px-3 py-2 bg-white rounded-lg border">Open Class Chat</button>

              <button onClick={() => navigate('/teacher/classes')} className="px-3 py-2 bg-white rounded-lg border">Back to Classes</button> */}

              {/* Teacher-only Chat Lock Toggle */}
              <button
                onClick={async () => {
                  // Toggle lock state
                  const newLock = !chatLocked
                  try {
                    const targetClass = chatClass || classId
                    const res = await service.setChatSetting({ docId: chatSettingDocId, classId: targetClass, teacherId: userData?.$id, isLocked: newLock })
                    if (res && res.$id) setChatSettingDocId(res.$id)
                    setChatLockedState(newLock)
                    dispatch(setChatLock(newLock))
                    alert(newLock ? 'Chat locked for students ✅' : 'Chat unlocked ✅')
                  } catch (e) {
                    console.error('Failed to update chat lock', e)
                    alert('Failed to update chat settings: ' + (e?.message || String(e)))
                  }
                }}
                className={`px-3 py-2 rounded-lg font-semibold ${chatLocked ? 'bg-red-100 text-red-700 border' : 'bg-green-100 text-green-700 border'}`}>
                {chatLocked ? 'close' : 'open'}
              </button>
            </>
          ) : (
            <div className="text-sm text-gray-600">{chatLocked ? 'Chat locked by teacher' : ''}</div>
          )}
        </div>


      </div>

      {/* Messages area */}
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-gray-200 w-3/4 rounded"></div>
            <div className="h-6 bg-gray-200 w-1/2 rounded"></div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.$id} className={`flex ${msg.senderid === userData?.$id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-xl ${msg.senderid === userData?.$id ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-900 shadow-sm rounded-bl-none'}`}>
                <div className="text-xs font-semibold mb-1">{msg.sendername} <span className="text-[10px] text-gray-300 ml-2">{msg.role}</span></div>
                <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                <div className="text-[10px] text-gray-400 mt-1 text-right">{new Date(msg.$createdAt || Date.now()).toLocaleTimeString()}</div>
                {msg.pending && <div className="text-[10px] text-yellow-400 mt-1">Sending…</div>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area (sticky to bottom) */}
      <div className="px-3 pb-6 pt-2 bg-white border-t sticky bottom-0 left-0 w-full safe-area-bottom z-30">
        <div className="flex flex-col gap-1 mb-2">
          {chatLocked && userRole !== 'teacher' && (
            <div className="text-xs text-red-600 font-semibold">Chat is locked by the teacher — you cannot send messages.</div>
          )}
        </div>
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message..."
            rows={1}
            className="flex-1 resize-none rounded-3xl p-3 border border-gray-100 focus:ring-2 focus:ring-blue-200 outline-none max-h-32"
          />
          <button onClick={handleSend} disabled={sending || !text.trim() || (chatLocked && userRole !== 'teacher')} className="ml-1 bg-blue-600 text-white p-3 rounded-full font-bold h-12 w-12 flex items-center justify-center disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10l9-7 9 7-9 7-9-7z" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
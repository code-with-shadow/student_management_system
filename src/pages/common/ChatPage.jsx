import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { setChatLock } from '../../store/chatSlice'
import service from '../../appwrite/db'

export default function ChatPage() {
  const { classIdParam } = useParams()
  console.log("this i s riya",classIdParam)
  const { userData, userRole, classId: userClass } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const classId = classIdParam || userClass

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [pageSize] = useState(100)
  
  // Lock States
  const [chatLocked, setChatLockedState] = useState(false)
  const [chatSettingDocId, setChatSettingDocId] = useState(null)
  const [chatClass, setChatClass] = useState(classId || '6')
  
  const earliestRef = useRef(null)
  const scrollRef = useRef(null)
  const pollRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  // 1. DATA FETCHING
  useEffect(() => {
    if (!classId) return
    let mounted = true

    const fetchMessages = async (opts = {}) => {
      try {
        const res = await service.getMessages(classId, opts.limit || pageSize, opts.before || null)
        if (!mounted) return
        
        const docs = (res.documents || []).slice()
        docs.reverse()

        if (opts.before) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.$id))
            const toAdd = docs.filter(d => !existingIds.has(d.$id))
            return [...toAdd, ...prev]
          })
        } else {
          setMessages(prev => {
             const prevIds = prev.map(m => m.$id).join(',');
             const newIds = docs.map(m => m.$id).join(',');
             if (prevIds === newIds && prev.length === docs.length) return prev;
             return docs; 
          })
        }

        if (docs.length > 0) earliestRef.current = docs[0].$createdAt
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
          // Update state with existing settings
          setChatLockedState(Boolean(doc.islocked))
          setChatSettingDocId(doc.$id) 
          dispatch(setChatLock(Boolean(doc.islocked)))
        } else {
          // No settings found, default to unlocked
          setChatLockedState(false)
          setChatSettingDocId(null)
          dispatch(setChatLock(false))
        }
      } catch (e) {}
    }

    fetchMessages()
    loadChatSettings()

    pollRef.current = setInterval(() => { 
        fetchMessages()
        loadChatSettings() // Also poll settings to auto-lock for students
    }, 4000)

    return () => {
      mounted = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [classId])

  // 2. SCROLL LOGIC
  useEffect(() => {
    if (scrollRef.current && !loadingMore && !loading) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        if (isNearBottom || messages.length <= pageSize) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }
  }, [messages, loadingMore, loading])

  const onScroll = async (e) => {
    const el = e.target
    if (el.scrollTop <= 10 && hasMore && !loadingMore) {
      setLoadingMore(true)
      const before = earliestRef.current
      await fetchMessages({ before, limit: pageSize }) 
    }
  }

  // 3. SEND LOGIC
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  }

  const handleSend = async () => {
    // Strict Lock Check for Students
    if (chatLocked && userRole !== 'teacher') return alert('Chat is locked by the teacher.')
    
    if (!text.trim() && !selectedFile) return 
    
    const tmpId = 'tmp-' + Date.now()
    const optimistic = {
      $id: tmpId,
      classid: classId,
      senderid: userData.$id,
      sendername: userData.name || userData.email,
      role: userRole,
      message: text,
      fileid: selectedFile ? 'pending' : null,
      filetype: selectedFile ? (selectedFile.type.startsWith('image') ? 'image' : 'file') : null,
      $createdAt: new Date().toISOString(),
      pending: true
    }

    setMessages(prev => [...prev, optimistic])
    const sendText = text
    const sendFile = selectedFile
    setText('')
    setSelectedFile(null)
    if(fileInputRef.current) fileInputRef.current.value = "";
    setSending(true)

    try {
      const created = await service.sendMessage({ 
          classId, senderId: userData.$id, senderName: userData.name || userData.email, role: userRole, message: sendText, file: sendFile 
      })
      setMessages(prev => prev.map(m => (m.$id === tmpId ? created : m)))
    } catch (e) {
      setMessages(prev => prev.filter(m => m.$id !== tmpId))
      alert('Failed to send message.')
    } finally {
      setSending(false)
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const handleBack = () => {
    if (userRole === 'teacher') navigate('/teacher/classes')
    else navigate('/student/dashboard')
  }

  // --- RENDER ---
  return (
    <div className="flex flex-col h-[100dvh] bg-[#f8f7f3]">
      
      {/* Header */}
      <header className="shrink-0 h-16 bg-[#008069] text-white flex items-center px-4 justify-between shadow-md z-20">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
            {classId?.toString().substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="font-bold text-base leading-tight">Class {classId}</h1>
            <p className="text-xs text-white/80 leading-tight">{userRole === 'teacher' ? 'Teacher Mode' : 'Student Group'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {userRole === 'teacher' ? (
            <>
              <select value={chatClass} onChange={(e) => { const v = e.target.value; setChatClass(v); navigate(`/chat/${v}`) }} className="text-xs p-1 rounded bg-white/10 text-white border border-white/20 outline-none focus:bg-white/20">
                 {[5,6,7,8,9,10,11,12].map(c => <option key={c} value={c} className="text-black">Class {c}</option>)}
              </select>
              
              <button 
                onClick={async () => { 
                    const newLock = !chatLocked; 
                    try { 
                        // Fix 2: Ensure we pass the DocID so it UPDATES instead of creating new ones
                        const res = await service.setChatSetting({ 
                            docId: chatSettingDocId, 
                            classId: chatClass, 
                            teacherId: userData?.$id, 
                            isLocked: newLock 
                        }); 
                        
                        // Update state immediately
                        if(res && res.$id) setChatSettingDocId(res.$id);
                        setChatLockedState(newLock); 
                        dispatch(setChatLock(newLock)); 
                    } catch (e) { alert('Error: ' + e.message) } 
                }} 
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title={chatLocked ? "Unlock Chat" : "Lock Chat"}
              >
                {chatLocked ? 
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-300" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg> 
                    : 
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-300" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>
                }
              </button>
            </>
          ) : (
             chatLocked && <span className="text-xs bg-red-500/80 px-2 py-1 rounded text-white font-bold">LOCKED</span>
          )}
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center mt-10"><div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          messages.map((msg, index) => {
             const isMe = msg.senderid === userData?.$id;
             // Fix 1: Removed 'isSequence' check for name display.
             // Now checking !isMe ensures name shows for all received messages.

             let attachmentContent = null;
             if (msg.fileid) {
                 const fileUrl = msg.filetype === 'image' ? (msg.pending ? null : service.getFilePreview(msg.fileid)) : (msg.pending ? "#" : service.getFileDownload(msg.fileid));
                 
                 if (msg.filetype === 'image') {
                     attachmentContent = (
                         <div className="mb-2 mt-1">
                             {msg.pending ? (
                                 <div className="w-48 h-32 bg-gray-200 flex items-center justify-center rounded text-xs text-gray-500 animate-pulse">Uploading...</div>
                             ) : (
                                 <img 
                                    src={fileUrl} 
                                    alt="attachment" 
                                    className="rounded-lg w-full max-h-60 object-cover border border-gray-100 cursor-pointer"
                                    onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerHTML = '<div class="text-red-500 text-xs p-2 bg-red-50 rounded border border-red-200">Failed to load image</div>'; }}
                                    onClick={() => window.open(fileUrl, '_blank')}
                                 />
                             )}
                         </div>
                     );
                 } else {
                     attachmentContent = (
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-gray-100 p-2 rounded mb-2 mt-1 hover:bg-gray-200 transition border border-gray-200">
                            <span className="text-xs underline text-blue-600 truncate max-w-[200px]">View Document</span>
                        </a>
                     );
                 }
             }

             return (
              <div key={msg.$id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                  relative px-3 py-2 max-w-[75%] w-fit min-w-[120px] shadow-sm text-sm break-words whitespace-pre-wrap
                  ${isMe ? 'bg-[#d9fdd3] rounded-l-lg rounded-tr-lg rounded-br-none' : 'bg-white rounded-r-lg rounded-tl-lg rounded-bl-none'}
                  mt-2
                `}>
                  {/* ✅ FIX 1: Show Sender Name for ALL messages except my own */}
                  {!isMe && (
                    <div className="text-[11px] font-bold text-orange-600 mb-1 leading-none">
                        {msg.sendername}
                        {msg.role === 'teacher' && <span className="ml-1 text-[9px] text-green-600 bg-green-100 px-1 rounded border border-green-200">TEACHER</span>}
                    </div>
                  )}
                  
                  {attachmentContent}
                  {msg.message && <div className="leading-relaxed pr-2 pb-2">{msg.message}</div>}
                  <div className="flex items-center justify-end gap-1 absolute bottom-1 right-2">
                     <span className="text-[10px] text-gray-500">{new Date(msg.$createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div className="h-2"></div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-[#f0f2f5] px-3 py-2 flex items-end gap-2 safe-area-bottom z-20">
        
        {/* ✅ FIX 2: If Locked AND User is Student => Show Gray Box */}
        {chatLocked && userRole !== 'teacher' ? (
           <div className="w-full bg-gray-200 text-gray-500 text-center py-3 text-sm rounded-lg font-medium border border-gray-300">
              🔒 Teacher blocked chat
           </div>
        ) : (
          /* Normal Input for Everyone else (and Teachers even if locked) */
          <>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
            <button onClick={() => fileInputRef.current.click()} className="mb-3 p-2 text-gray-500 hover:text-gray-700 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>
            <div className="flex-1 bg-white rounded-2xl flex flex-col shadow-sm border border-gray-100 overflow-hidden">
              {selectedFile && (
                  <div className="px-4 py-2 border-b bg-gray-50 flex justify-between items-center animate-fadeIn">
                      <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-lg">📎</span>
                          <span className="text-xs text-blue-600 truncate font-semibold">{selectedFile.name}</span>
                      </div>
                      <button onClick={() => { setSelectedFile(null); fileInputRef.current.value=""; }} className="text-gray-400 hover:text-red-500 p-1">X</button>
                  </div>
              )}
              <textarea ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} placeholder={chatLocked ? "Message (Locked for students)..." : "Message"} rows={1} className="w-full px-4 py-3 max-h-32 focus:outline-none text-sm resize-none bg-transparent" style={{ minHeight: '44px' }} />
            </div>
            <button onClick={handleSend} disabled={sending || (!text.trim() && !selectedFile)} className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${(text.trim() || selectedFile) ? 'bg-[#008069] text-white' : 'bg-gray-300 text-gray-500'}`}>
              {sending ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24"><path fill="currentColor" d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"></path></svg>}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
import React, { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import authService from './appwrite/auth'
import service from './appwrite/db'
import { login, logout } from './store/authSlice'

import Header from './components/Header'
import Footer from './components/Footer'

function App() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)

  const authStatus = useSelector(state => state.auth.status)
  const userRole = useSelector(state => state.auth.userRole)

  const isChatPage = location.pathname.includes('/chat/')

  // 🔄 RESTORE SESSION
  useEffect(() => {
    const init = async () => {
      try {
        const userData = await authService.getCurrentUser()

        if (!userData) {
          dispatch(logout())
          setLoading(false)
          return
        }

        const roleDoc = await service.getUserRole(userData.$id)

        let role = 'student'
        let classId = null

        if (roleDoc) {
          role = roleDoc.role === 'techer' ? 'teacher' : roleDoc.role

          if (role === 'student') {
            const profile = await service.getStudentProfile(userData.$id)
            classId = profile?.documents?.[0]?.class || null
          }
        }

        dispatch(login({ userData, userRole: role, classId }))
      } catch {
        dispatch(logout())
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [dispatch])

  // 🚀 AUTO REDIRECT FROM "/"
  useEffect(() => {
    if (authStatus && location.pathname === '/') {
      navigate(userRole === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')
    }
  }, [authStatus, userRole, location.pathname])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-t-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {authStatus && !isChatPage && <Header />}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {authStatus && !isChatPage && <Footer />}
    </div>
  )
}

export default App

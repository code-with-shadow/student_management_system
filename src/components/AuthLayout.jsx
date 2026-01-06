import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

function AuthLayout({ children, authentication = true, role }) {
  const authStatus = useSelector(state => state.auth.status)
  const userRole = useSelector(state => state.auth.userRole)

  // 🔐 Protected routes
  if (authentication && !authStatus) {
    return <Navigate to="/" replace />
  }

  // 🎭 Role protection
  if (authentication && role && userRole !== role) {
    return <Navigate to="/" replace />
  }

  // 🚫 Prevent logged-in user from seeing login again
  if (!authentication && authStatus) {
    return (
      <Navigate
        to={userRole === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'}
        replace
      />
    )
  }

  return children
}

export default AuthLayout

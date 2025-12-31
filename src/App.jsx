import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom'
import authService from './appwrite/auth'
import service from './appwrite/db'
import { login, logout } from './store/authSlice'

// Components
import Header from './components/Header'
import Footer from './components/Footer' 

function App() {
  const [loading, setLoading] = useState(true)
  const dispatch = useDispatch()
  
  // Get Login Status to show/hide Header & Footer
  const userStatus = useSelector((state) => state.auth.status)

  useEffect(() => {
    // 1. Check if user is logged in
    authService.getCurrentUser()
      .then((userData) => {
        if (userData) {
          // Helper to set fallback login
          const fallbackLogin = () => dispatch(login({ userData, userRole: 'student', classId: null }))

          // 2. Fetch Role from Database (try once, retry quickly on transient auth failures)
          service.getUserRole(userData.$id)
            .then((roleDoc) => {
                 // If we got a document, use it
                 if (roleDoc && roleDoc.$id) {
                     // Normalize DB role typos to application roles
                     const dbRole = roleDoc.role;
                     const userRoleNormalized = (dbRole === 'techer' || dbRole === 'pending_techer') ? 'teacher' : dbRole;

                     dispatch(login({ 
                       userData: userData,
                       userRole: userRoleNormalized,
                       classId: roleDoc.class || null 
                     }))
                 } else {
                     // ⚠️ FALLBACK: Document missing in DB
                     console.warn("User role missing in DB. Logging in as Student default.");
                     fallbackLogin();
                 }
            })
            .catch((err) => {
                // If auth was transiently missing (401), try again after a short delay
                console.warn("Database Role Fetch Failed (trying once more):", err?.message || err);
                setTimeout(() => {
                  service.getUserRole(userData.$id)
                     .then((roleDoc) => {
                         if (roleDoc && roleDoc.$id) {
                             dispatch(login({ userData, userRole: roleDoc.role, classId: roleDoc.class || null }));
                         } else fallbackLogin();
                     })
                     .catch((e) => {
                         console.error("Database Role Fetch Failed twice:", e);
                         fallbackLogin();
                     });
                }, 400);
            });
        } else {
          dispatch(logout())
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        {/* Loading Spinner */}
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      
      {/* 1. Header (Sticky Top) */}
      {userStatus && <Header />}

      {/* 2. Main Content */}
      {/* pb-24 adds enough padding at bottom so Footer doesn't cover content */}
      <main className={`flex-1 w-full ${userStatus ? 'pb-24' : ''}`}>
        <Outlet />
      </main>

      {/* 3. Footer (Fixed Bottom Navigation) */}
      {userStatus && <Footer />}
      
    </div>
  )
}

export default App
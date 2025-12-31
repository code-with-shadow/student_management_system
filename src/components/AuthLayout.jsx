import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

export default function AuthLayout({ children, authentication = true, allowedRole = null }) {
    const navigate = useNavigate()
    const [loader, setLoader] = useState(true)
    
    // Get status and role from Redux Store
    const authStatus = useSelector(state => state.auth.status)
    const userRole = useSelector(state => state.auth.userRole)

    useEffect(() => {
        // 1. If page requires Login, but user is NOT logged in
        if (authentication && authStatus !== true) {
            // Redirect to the student login (shared login component)
            navigate("/student/login")
        } 
        // 2. If page is Public (like Login/Signup), but user IS logged in
        else if (!authentication && authStatus === true) {
            // Redirect based on their role
            if (userRole === 'teacher') navigate("/teacher/dashboard")
            else navigate("/student/dashboard")
        }
        // 3. (Optional) Role Check: If user is logged in but has wrong role
        else if (authentication && allowedRole && userRole !== allowedRole) {
            // If a Student tries to open Teacher pages
            navigate("/") 
        }
        
        setLoader(false)
    }, [authStatus, navigate, authentication, userRole, allowedRole])

    return loader ? <h1>Loading...</h1> : <>{children}</>
}
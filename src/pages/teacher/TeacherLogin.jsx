import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import authService from '../../appwrite/auth'
import service from '../../appwrite/db'
import { login as authLogin } from '../../store/authSlice'

function Login() {
    const navigate = useNavigate()
    const location = useLocation()
    const dispatch = useDispatch()
    
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({ email: "", password: "" })

    // 1. Detect Context: Are we on the "Teacher" login page?
    const isTeacherLogin = location.pathname.includes("teacher")

    // 2. Set Dynamic Styles based on context
    const themeColor = isTeacherLogin ? "purple" : "blue"
    const title = isTeacherLogin ? "👨‍🏫 Teacher Login" : "🎒 Student Login"
    const signupLink = isTeacherLogin ? "/teacher/signup" : "/student/signup"

    const handleLogin = async (e) => {
        e.preventDefault()
        setError("")
        setLoading(true)
        try {
            // A. Appwrite Login (Email/Password check)
            const session = await authService.login(formData)
            
            if (session) {
                // B. Get User Identity
                const userData = await authService.getCurrentUser()
                
                if (userData) {
                    // C. Get Role from Database (handle multiple response shapes)
                    const userDocs = await service.getUserRole(userData.$id)
                    let role = 'student'

                    if (!userDocs) {
                        console.warn('User role missing in DB. Defaulting to student.')
                        role = 'student'
                    } else if (userDocs.documents) {
                        role = userDocs.documents[0]?.role || 'student'
                    } else if (userDocs.role) {
                        role = userDocs.role
                    }

                    // Normalize DB enum typos to app roles
                    if (role === 'techer' || role === 'pending_techer') role = 'teacher'

                    // D. Security Check: Prevent Students from using Teacher Login
                    if (isTeacherLogin && role !== 'teacher') {
                        setError("⚠️ Access Denied: You are a Student. Please use Student Login.")
                        await authService.logout() // Log them out immediately
                        setLoading(false)
                        return
                    }

                    // E. Save to Redux
                    dispatch(authLogin({
                        userData: userData,
                        userRole: role,
                        classId: null // We will fetch this in the dashboard
                    }))

                    // F. Redirect to the Correct Dashboard
                    if (role === 'teacher') navigate("/teacher/dashboard")
                    else navigate("/student/dashboard")
                }
            }
        } catch (error) {
            setError("Invalid Email or Password. Please try again.")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`flex items-center justify-center min-h-screen bg-${themeColor}-50 p-4`}>
            <div className={`w-full max-w-md bg-white p-8 rounded-xl shadow-xl border-t-4 border-${themeColor}-600`}>
                
                {/* Title Section */}
                <h2 className={`text-center text-3xl font-bold mb-2 text-${themeColor}-700`}>
                    {title}
                </h2>
                <p className="text-center text-gray-500 mb-8 text-sm">
                    Enter your credentials to access the portal
                </p>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm font-bold text-center border border-red-200">
                        {error}
                    </div>
                )}
                
                {/* Login Form */}
                <form onSubmit={handleLogin} className='space-y-5'>
                    <div>
                        <label className="text-sm font-semibold text-gray-600">Email Address</label>
                        <input 
                            type="email" 
                            className={`w-full mt-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-${themeColor}-500 outline-none transition`}
                            placeholder="name@school.com"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="text-sm font-semibold text-gray-600">Password</label>
                        <input 
                            type="password" 
                            className={`w-full mt-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-${themeColor}-500 outline-none transition`}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full bg-${themeColor}-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-${themeColor}-700 transition transform hover:scale-[1.02] shadow-md disabled:bg-gray-400 disabled:scale-100`}
                    >
                        {loading ? "Verifying..." : "Secure Login ➤"}
                    </button>
                </form>
                
                {/* Footer Link */}
                <div className="mt-6 text-center pt-4 border-t">
                    <p className="text-sm text-gray-600">
                        Don't have an account? 
                        <Link to={signupLink} className={`ml-2 text-${themeColor}-600 font-bold hover:underline`}>
                            Create New Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login
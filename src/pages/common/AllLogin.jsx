import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'

import authService from '../../appwrite/auth'
import service from '../../appwrite/db'
import { login as authLogin } from '../../store/authSlice'

const theme = {
  student: {
    bg: 'bg-blue-50',
    border: 'border-blue-600',
    text: 'text-blue-700',
    ring: 'focus:ring-blue-500',
    btn: 'bg-blue-600 hover:bg-blue-700',
    link: 'text-blue-600',
  },
  teacher: {
    bg: 'bg-purple-50',
    border: 'border-purple-600',
    text: 'text-purple-700',
    ring: 'focus:ring-purple-500',
    btn: 'bg-purple-600 hover:bg-purple-700',
    link: 'text-purple-600',
  },
}

function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { register, handleSubmit } = useForm()

  const authStatus = useSelector(state => state.auth.status)
  const userRole = useSelector(state => state.auth.userRole)

  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const t = theme[role]

  // 🔄 AUTO REDIRECT IF SESSION EXISTS
  useEffect(() => {
    if (authStatus) {
      navigate(userRole === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')
    }
  }, [authStatus, userRole])

  const onSubmit = async (data) => {
    setLoading(true)
    setError('')

    try {
      await authService.login(data)

      const userData = await authService.getCurrentUser()
      const roleDoc = await service.getUserRole(userData.$id)

      let dbRole = roleDoc?.role || 'student'
      if (dbRole === 'techer') dbRole = 'teacher'

      if (dbRole !== role) {
        setError('Access denied for this role')
        await authService.logout()
        return
      }

      let classId = null

      // 🎒 STUDENT → GET CLASS
      if (dbRole === 'student') {
        const classRes = await service.getStudentClass(userData.$id)
        console.log("Fetched classId during login:", classRes);
        classId = classRes?.documents?.[0]?.class || null
      }


      dispatch(authLogin({
        userData,
        userRole: dbRole,
        classId
      }))

      navigate(dbRole === 'teacher'
        ? '/teacher/dashboard'
        : '/student/dashboard'
      )

    } catch (e) {
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${t.bg}`}>
      <div className={`w-full max-w-md bg-white p-8 rounded-xl shadow-xl border-t-4 ${t.border}`}>

        {/* ROLE SWITCH */}
        <div className="flex justify-center gap-6 mb-6">
          <button
            onClick={() => setRole('student')}
            className={`font-bold ${role === 'student' ? t.text : 'text-gray-400'}`}
          >
            Student
          </button>
          <button
            onClick={() => setRole('teacher')}
            className={`font-bold ${role === 'teacher' ? t.text : 'text-gray-400'}`}
          >
            Teacher
          </button>
        </div>

        <h2 className={`text-3xl font-bold text-center ${t.text}`}>
          {role === 'teacher' ? '👨‍🏫 Teacher Login' : '🎒 Student Login'}
        </h2>

        {error && <p className="text-red-600 text-center mt-4">{error}</p>}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <input
            {...register('email')}
            placeholder="Email"
            className={`w-full p-3 border rounded ${t.ring}`}
          />
          <input
            {...register('password')}
            type="password"
            placeholder="Password"
            className={`w-full p-3 border rounded ${t.ring}`}
          />

          <button
            disabled={loading}
            className={`w-full ${t.btn} text-white py-3 rounded font-bold`}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>

        {/* ➕ CREATE ACCOUNT */}
        <p className="text-center mt-6 text-sm text-gray-600">
          Don’t have an account?{' '}
          <span
            onClick={() => navigate('/student/signup', { state: { role } })}
            className={`font-bold cursor-pointer ${t.link}`}
          >
            Create account
          </span>
        </p>

      </div>
    </div>
  )
}

export default Login

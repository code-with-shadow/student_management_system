import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom'

import store from './store/store'
import App from './App'
import AuthLayout from './components/AuthLayout'

// Pages
import Login from './pages/common/AllLogin'
import TeacherSignup from './pages/teacher/TeacherSignup'

// Student
import StudentDashboard from './pages/student/StudentDashboard'
import StudentAttendance from './pages/student/StudentAttendance'
import StudentMarks from './pages/student/StudentMarks'

// Teacher
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import ClassesPage from './pages/teacher/ClassesPage'
import StudentList from './pages/teacher/StudentList'
import StudentOverview from './pages/teacher/StudentOverview'
import StudentSignup from './pages/student/StudentSignup'

// Common
import ChatPage from './pages/common/ChatPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [

      // 🔐 LOGIN (DEFAULT ENTRY)
      {
        index: true,
        element: (
          <AuthLayout authentication={false}>
            <Login />
          </AuthLayout>
        ),
      },

      // 🔁 OLD LOGIN URL REDIRECTS
      {
        path: 'student/login',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'teacher/login',
        element: <Navigate to="/" replace />,
      },

      // 📝 TEACHER SIGNUP
      {
        path: 'teacher/signup',
        element: (
          <AuthLayout authentication={false}>
            <TeacherSignup />
          </AuthLayout>
        ),
      },
      {
        path: 'student/signup',
        element: (
          <AuthLayout authentication={false}>
            <StudentSignup />
          </AuthLayout>
        ),
      },

      // 🎒 STUDENT ROUTES
      {
        path: 'student',
        element: (
          <AuthLayout authentication={true} role="student">
            <Outlet />
          </AuthLayout>
        ),
        children: [
          { path: 'dashboard', element: <StudentDashboard /> },
          { path: 'attendance', element: <StudentAttendance /> },
          { path: 'marks', element: <StudentMarks /> },
        ],
      },

      // 👨‍🏫 TEACHER ROUTES
      {
        path: 'teacher',
        element: (
          <AuthLayout authentication={true} role="teacher">
            <Outlet />
          </AuthLayout>
        ),
        children: [
          { path: 'dashboard', element: <TeacherDashboard /> },
          { path: 'classes', element: <ClassesPage /> },
          { path: 'class/:classId', element: <StudentList /> },
          { path: 'student/:studentId', element: <StudentOverview /> },
        ],
      },

      // 💬 CHAT ROUTES (Fixed for both Student & Teacher)
      {
        path: 'chat',
        element: (
          <AuthLayout authentication={true}>
            <Outlet />
          </AuthLayout>
        ),
        children: [
          // 1. Specific Chat (Teacher selects a class)
          {
            path: ':classIdParam',
            element: <ChatPage />,
          },
          // // 2. Default Chat (Student uses their own class automatically)
          // {
          //   index: true,
          //   element: <ChatPage />,
          // }
        ]
      },

      // ❌ FALLBACK
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
)
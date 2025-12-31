import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Provider } from 'react-redux'
import store from './store/store.js'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// --- COMPONENTS ---
import AuthLayout from './components/AuthLayout.jsx'

// --- PAGES: PUBLIC ---
import Home from './pages/Home.jsx' // The Landing Page
import Login from './pages/student/StudentLogin.jsx' // Unified Login that handles both student/teacher
import StudentSignup from './pages/student/StudentSignup.jsx'
import TeacherSignup from './pages/teacher/TeacherSignup.jsx'

// --- PAGES: STUDENT ---
import StudentDashboard from './pages/student/StudentDashboard.jsx'
import StudentAttendance from './pages/student/StudentAttendance.jsx'
import StudentMarks from './pages/student/StudentMarks.jsx'

// --- PAGES: TEACHER ---
import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx'
import ClassesPage from './pages/teacher/ClassesPage.jsx'
import ClassManager from './pages/teacher/ClassManager.jsx'
import StudentList from './pages/teacher/StudentList.jsx'
// import Notices from './pages/teacher/Notices.jsx' // Uncomment if you created this

// --- PAGES: COMMON ---
import ChatPage from './pages/common/ChatPage.jsx'

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // ==========================
      // 🌍 PUBLIC ROUTES (Anyone)
      // ==========================
      {
        path: "/",
        element: <Home />,
      },
      
      // STUDENT AUTH
      {
        path: "/student/login",
        element: (
          <AuthLayout authentication={false}>
            <Login />
          </AuthLayout>
        ),
      },
      {
        path: "/student/signup",
        element: (
          <AuthLayout authentication={false}>
            <StudentSignup />
          </AuthLayout>
        ),
      },

      // TEACHER AUTH
      {
        path: "/teacher/login",
        element: (
          <AuthLayout authentication={false}>
            <Login />
          </AuthLayout>
        ),
      },
      {
        path: "/teacher/signup",
        element: (
          <AuthLayout authentication={false}>
            <TeacherSignup />
          </AuthLayout>
        ),
      },

      // ==========================
      // 🎒 STUDENT ROUTES (Protected)
      // ==========================
      {
        path: "/student/dashboard",
        element: (
          <AuthLayout authentication={true}>
            <StudentDashboard />
          </AuthLayout>
        ),
      },
      {
        path: "/student/attendance",
        element: (
          <AuthLayout authentication={true}>
            <StudentAttendance />
          </AuthLayout>
        ),
      },
      {
        path: "/student/marks",
        element: (
          <AuthLayout authentication={true}>
            <StudentMarks />
          </AuthLayout>
        ),
      },

      // ==========================
      // 👨‍🏫 TEACHER ROUTES (Protected)
      // ==========================
      {
        path: "/teacher/dashboard",
        element: (
          <AuthLayout authentication={true}>
            <TeacherDashboard />
          </AuthLayout>
        ),
      },
      // Keep Classes page available separately if needed
      {
        path: "/teacher/classes",
        element: (
          <AuthLayout authentication={true}>
            <ClassesPage />
          </AuthLayout>
        ),
      },
      {
        path: "/teacher/attendance",
        element: (
          <AuthLayout authentication={true}>
            <ClassManager />
          </AuthLayout>
        ),
      },
      {
        path: "/teacher/marks",
        element: (
          <AuthLayout authentication={true}>
            <ClassManager />
          </AuthLayout>
        ),
      },
      {
        path: "/teacher/class/:classId",
        element: (
          <AuthLayout authentication={true}>
            <StudentList />
          </AuthLayout>
        ),
      },

      // ==========================
      // 💬 COMMON ROUTES (Chat)
      // ==========================
      {
        // Dynamic Route: classIdParam will be read inside ChatPage
        path: "/chat/:classIdParam",
        element: (
          <AuthLayout authentication={true}>
            <ChatPage />
          </AuthLayout>
        ),
      }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>,
)
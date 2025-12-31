import React from 'react'
import { Link } from 'react-router-dom'

export default function Sidebar(){
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r p-4">
      <h2 className="font-bold text-lg mb-6">School App</h2>
      <nav className="space-y-2 text-sm">
        <Link className="block py-2 px-3 rounded hover:bg-gray-100" to="/">Home</Link>
        <Link className="block py-2 px-3 rounded hover:bg-gray-100" to="/student/dashboard">Student Dashboard</Link>
        <Link className="block py-2 px-3 rounded hover:bg-gray-100" to="/teacher/dashboard">Teacher Dashboard</Link>
        <Link className="block py-2 px-3 rounded hover:bg-gray-100" to="/chat/6">Chat</Link>
      </nav>
    </aside>
  )
}
import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-700 flex flex-col items-center justify-center text-white p-4">
      <h1 className="text-5xl font-bold mb-4">🎓 School App</h1>
      <p className="text-lg mb-12 opacity-90">Welcome to the Digital Campus</p>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-2xl">
        {/* Student Box */}
        <div className="flex-1 bg-white text-gray-800 p-8 rounded-2xl shadow-2xl hover:scale-105 transition transform flex flex-col items-center">
          <span className="text-6xl mb-4">🎒</span>
          <h2 className="text-2xl font-bold mb-4">I am a Student</h2>
          <div className="space-y-3 w-full">
            <Link to="/student/login" className="block w-full py-3 bg-blue-600 text-white font-bold rounded-lg text-center hover:bg-blue-700">
              Student Login
            </Link>
            <Link to="/student/signup" className="block w-full py-3 border-2 border-blue-600 text-blue-600 font-bold rounded-lg text-center hover:bg-blue-50">
              New Student Signup
            </Link>
          </div>
        </div>

        {/* Teacher Box */}
        <div className="flex-1 bg-white text-gray-800 p-8 rounded-2xl shadow-2xl hover:scale-105 transition transform flex flex-col items-center">
          <span className="text-6xl mb-4">👨‍🏫</span>
          <h2 className="text-2xl font-bold mb-4">I am a Teacher</h2>
          <div className="space-y-3 w-full">
            <Link to="/teacher/login" className="block w-full py-3 bg-purple-600 text-white font-bold rounded-lg text-center hover:bg-purple-700">
              Teacher Login
            </Link>
            <Link to="/teacher/signup" className="block w-full py-3 border-2 border-purple-600 text-purple-600 font-bold rounded-lg text-center hover:bg-purple-50">
              New Teacher Signup
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
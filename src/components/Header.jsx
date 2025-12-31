import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import authService from '../appwrite/auth';
import { logout as authLogout } from '../store/authSlice';

function Header() {
    const { userData, userRole } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [loggingOut, setLoggingOut] = useState(false);

    // Helper: Get Initials
    const getInitials = (name) => {
        if (!name) return "U";
        return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await authService.logout();
        } catch (err) {
            // expected in some cases if session already missing
            if (process.env.NODE_ENV === 'development') console.debug('Logout error:', err?.message || err);
        }
        dispatch(authLogout());
        navigate('/student/login');
        setLoggingOut(false);
    };

    return (
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-40 shadow-sm">
            
            {/* 1. App Name */}
            <h1 className="text-xl font-bold text-blue-600 tracking-tight">
                School App
            </h1>

            {/* 2. User Profile Image (Avatar) + Logout */}
            <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-800 leading-tight">{userData?.name || "User"}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{userRole || "Guest"}</p>
                </div>
                
                {/* Circular Profile Image */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md border-2 border-white">
                    {getInitials(userData?.name)}
                </div>

                {/* Logout Button (visible when user is logged in) */}
                {userData && (
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="ml-2 bg-red-50 text-red-600 text-sm font-semibold px-3 py-1 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60"
                    >
                        {loggingOut ? 'Logging out…' : 'Logout'}
                    </button>
                )}
            </div>
        </header>
    );
}

export default Header;
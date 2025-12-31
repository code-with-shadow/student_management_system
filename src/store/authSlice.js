import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    status: false,       // Is user logged in?
    userData: null,      // Appwrite Account Data (ID, Name, Email)
    userRole: null,      // 'student' or 'teacher' (Important for sidebar)
    classId: null,       // If student, store their 'class' (e.g., "6")
    profileId: null      // The ID of their profile document in 'students' or 'teachers' collection
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        login: (state, action) => {
            state.status = true;
            state.userData = action.payload.userData;
            state.userRole = action.payload.userRole;
            state.classId = action.payload.classId || null;
            state.profileId = action.payload.profileId || null;
        },
        logout: (state) => {
            state.status = false;
            state.userData = null;
            state.userRole = null;
            state.classId = null;
            state.profileId = null;
        },
        // Optional: Update profile picture or name without logout
        updateProfile: (state, action) => {
            state.userData = { ...state.userData, ...action.payload };
        }
    }
});

export const { login, logout, updateProfile } = authSlice.actions;
export default authSlice.reducer;
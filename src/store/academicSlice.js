import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    marks: [],           // Flat list of mark documents for the class
    attendance: {},      // Map of studentId -> attendance document (for fast lookup)
    subjects: [],        // List of subjects for the class
    lastFetched: null    // Timestamp to know when we last updated
};


const academicSlice = createSlice({
    name: "academic",
    initialState,
    reducers: {
        setMarks: (state, action) => {
            state.marks = action.payload;
        },
        setAttendance: (state, action) => {
            state.attendance = action.payload;
        },
        setSubjects: (state, action) => {
            state.subjects = action.payload;
        },
        // Use this when user logs out
        clearAcademics: (state) => {
            state.marks = [];
            state.attendance = null;
            state.subjects = [];
        }
    }
});

export const { setMarks, setAttendance, setSubjects, clearAcademics } = academicSlice.actions;
export default academicSlice.reducer;
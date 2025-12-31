import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    messages: [],        // Stores the array of message objects
    isLocked: false,     // Is the chat currently locked?
    activeClassId: null  // Which class chat is currently open
};

const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        setMessages: (state, action) => {
            state.messages = action.payload; // Load initial messages
        },
        addMessage: (state, action) => {
            // Check if message already exists (prevent duplicates from realtime)
            const exists = state.messages.some(msg => msg.$id === action.payload.$id);
            if (!exists) {
                state.messages.push(action.payload);
            }
        },
        setChatLock: (state, action) => {
            state.isLocked = action.payload;
        },
        setActiveClass: (state, action) => {
            state.activeClassId = action.payload;
            // Clear messages when switching rooms so old chats don't show
            state.messages = []; 
        },
        clearChat: (state) => {
            state.messages = [];
            state.activeClassId = null;
        }
    }
});

export const { setMessages, addMessage, setChatLock, setActiveClass, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import chatReducer from './chatSlice';
import academicReducer from './academicSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        chat: chatReducer,
        academic: academicReducer
    }
});

export default store;
import conf from './conf.js';
import { Client, Account, ID } from "appwrite";

export class AuthService {
    client = new Client();
    account;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteUrl) // Your API Endpoint
            .setProject(conf.projectId);   // Your Project ID
        this.account = new Account(this.client);
    }

    // 1. Sign Up (Create Account)
    async createAccount({ email, password, name }) {
        try {
            // First, create the user account
            const userAccount = await this.account.create(ID.unique(), email, password, name);
            
            if (userAccount) {
                // If account creation is successful, log them in automatically
                await this.login({ email, password });
                // Return the created user object so callers can access its $id
                return userAccount;
            } else {
                return userAccount;
            }
        } catch (error) {
            console.log("Appwrite service :: createAccount :: error", error);
            throw error;
        }
    }

    // 2. Login
    async login({ email, password }) {
        try {
            return await this.account.createEmailPasswordSession(email, password);
        } catch (error) {
            console.log("Appwrite service :: login :: error", error);
            throw error;
        }
    }

    // 3. Get Current User (Check if logged in)
    async getCurrentUser() {
        try {
            return await this.account.get();
        } catch (error) {
            // Expected when user is not authenticated (401). Don't spam console in normal flows.
            if (process.env.NODE_ENV === 'development') {
                console.debug("Appwrite service :: getCurrentUser :: error", error?.message || error);
            }
        }
        return null;
    }

    // 4. Logout
    async logout() {
        try {
            await this.account.deleteSessions();
        } catch (error) {
            // Silent in production; debug only during development
            if (process.env.NODE_ENV === 'development') {
                console.debug("Appwrite service :: logout :: error", error?.message || error);
            }
        }
    }
}

const authService = new AuthService();

export default authService;
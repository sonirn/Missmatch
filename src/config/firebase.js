// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { getPerformance } from "firebase/performance";

// Firebase configuration with fallbacks to hardcoded values if environment variables are not set
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAZKtnnm3hc6ViJLSLhV7PK8calqELiL_4",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "magic-image-ai-15a0d.firebaseapp.com",
      databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://magic-image-ai-15a0d-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "magic-image-ai-15a0d",
          storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "magic-image-ai-15a0d.firebasestorage.app",
            messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "864109068756",
              appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:864109068756:web:2d680b0c0d5b791f32d641",
                measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-M6EM5CCVQ2"
                };

                // Initialize Firebase
                const app = initializeApp(firebaseConfig);

                // Initialize Firebase services
                const analytics = getAnalytics(app);
                const auth = getAuth(app);
                const googleProvider = new GoogleAuthProvider();
                const db = getFirestore(app);
                const functions = getFunctions(app);
                const storage = getStorage(app);
                const performance = getPerformance(app);

                // Configure Google Auth Provider
                googleProvider.setCustomParameters({
                  prompt: 'select_account'
                  });

                  // Enable local emulator if in development mode
                  if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATOR === 'true') {
                    const { connectFirestoreEmulator } = require("firebase/firestore");
                      const { connectFunctionsEmulator } = require("firebase/functions");
                        const { connectAuthEmulator } = require("firebase/auth");
                          const { connectStorageEmulator } = require("firebase/storage");
                            
                              connectFirestoreEmulator(db, "localhost", 8080);
                                connectFunctionsEmulator(functions, "localhost", 5001);
                                  connectAuthEmulator(auth, "http://localhost:9099");
                                    connectStorageEmulator(storage, "localhost", 9199);
                                      
                                        console.log("Using Firebase local emulators");
                                        }

                                        // Export initialized services
                                        export { 
                                          app, 
                                            analytics, 
                                              auth,
                                                googleProvider, 
                                                  db, 
                                                    functions, 
                                                      storage, 
                                                        performance 
                                                        };
                                                        
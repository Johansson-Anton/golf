import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, where, addDoc, getDocs, updateDoc } from 'firebase/firestore';

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-golf-app-id';

// --- IMPORTANT: Firebase Configuration for Deployment ---
// When deploying to GitHub Pages (outside the Canvas environment),
// the __firebase_config global variable is not available.
// You need to replace the placeholder below with your actual Firebase project configuration.
//
// 1. Go to your Firebase project in the Firebase Console (console.firebase.google.com).
// 2. Click on "Project settings" (the gear icon next to "Project overview").
// 3. Under "Your apps", select the web app you've created (or create a new one).
// 4. Copy the "Firebase SDK snippet" (choose the "Config" option).
// 5. Paste the entire configuration object below, replacing the placeholder values.
//    Make sure you replace ALL the "YOUR_..." strings with your actual values.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    // >>>>>>>>>>>>>> PASTE YOUR ACTUAL FIREBASE CONFIG HERE <<<<<<<<<<<<<<
    // Example: This is what it should look like *after* you paste your actual config.
    // Use the values you previously showed:
    apiKey: "AIzaSyAoypftT4llVsGefrXo7PG-yRRO-H5EFD0",
    authDomain: "golf-scorecard-app-af43f.firebaseapp.com",
    projectId: "golf-scorecard-app-af43f",
    storageBucket: "golf-scorecard-app-af43f.firebasestorage.app",
    messagingSenderId: "383449671406",
    appId: "1:383449671406:web:22dda6ebfdd1f1005d35ff",
    // measurementId: "G-XXXXXXXXXX" // Only if you have Google Analytics enabled
    // >>>>>>>>>>>>>> END OF YOUR FIREBASE CONFIG <<<<<<<<<<<<<<
};
// --- END Firebase Configuration ---

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? initialAuthToken : null;

// Context for Firebase and User
const FirebaseContext = createContext(null);

// Utility function to generate a unique ID
const generateUniqueId = () => crypto.randomUUID();

// Main App Component
const App = () => {
    const [currentPage, setCurrentPage] = useState('home');
    const [currentGameId, setCurrentGameId] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Array of golf-themed short texts/jokes for the tab title
    const golfJokes = [
        "Golf: A good walk ruined.",
        "Lost your balls?",
        "Fore!",
        "It's all in the swing!",
        "My putter's hot!",
        "Chasing birdies...",
        "Just tapped it in!",
        "In the rough again.",
        "Hole in fun!",
        "Mastering the green.",
    ];

    // Effect to change the document title periodically
    useEffect(() => {
        let jokeIndex = 0;
        const intervalId = setInterval(() => {
            document.title = golfJokes[jokeIndex];
            jokeIndex = (jokeIndex + 1) % golfJokes.length;
        }, 5000); // Change every 5 seconds

        // Clear the interval when the component unmounts
        return () => clearInterval(intervalId);
    }, []); // Empty dependency array means this runs once on mount and cleans up on unmount


    useEffect(() => {
        // Initialize Firebase only once
        // Check if firebaseConfig is actually populated and not using placeholder API key
        if (!db && Object.keys(firebaseConfig).length > 0 && firebaseConfig.apiKey !== "AIzaSyB4_YOUR_ACTUAL_API_KEY_GOES_HERE") {
            try {
                const app = initializeApp(firebaseConfig);
                const firestoreDb = getFirestore(app);
                const firebaseAuth = getAuth(app);
                setDb(firestoreDb);
                setAuth(firebaseAuth);

                // Sign in anonymously or with custom token
                const signInUser = async () => {
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } else {
                            await signInAnonymously(firebaseAuth);
                        }
                    } catch (error) {
                        console.error("Firebase authentication failed:", error);
                        // Fallback to a random UUID if auth fails completely
                        setUserId(generateUniqueId());
                    } finally {
                        // Ensure isAuthReady is set to true after sign-in attempt
                        setIsAuthReady(true);
                    }
                };
                signInUser();

                // Listen for auth state changes to get the user ID
                const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        // If no user, generate a random ID for anonymous use
                        setUserId(generateUniqueId());
                    }
                    setIsAuthReady(true);
                });

                return () => unsubscribe(); // Cleanup auth listener
            } catch (error) {
                console.error("Failed to initialize Firebase:", error);
                // If Firebase initialization fails, set a random userId and mark auth as ready
                setUserId(generateUniqueId());
                setIsAuthReady(true);
            }
        } else {
            console.warn("Firebase config is missing or incomplete. Running without database persistence. Please add your Firebase config for deployment.");
            setUserId(generateUniqueId()); // Still need a userId for local operations or mock data
            setIsAuthReady(true);
        }
    }, [db, initialAuthToken]); // Only run once on component mount

    // Handle URL parameters for direct game access
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const gameIdFromUrl = params.get('gameId');
        if (gameIdFromUrl) {
            setCurrentGameId(gameIdFromUrl);
            setCurrentPage('scorecard');
        }
    }, []);

    const navigateTo = (page, id = null) => {
        setCurrentPage(page);
        setCurrentGameId(id);
        if (id) {
            // Update URL without reloading
            // Use window.location.origin + base path + query param for shareable link
            const baseUrl = window.location.origin + '/golf/'; // Assuming '/golf/' is your base path
            window.history.pushState({}, '', `${baseUrl}?gameId=${id}`);
        } else {
            window.history.pushState({}, '', '/golf/'); // Navigate back to base path
        }
    };

    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-xl font-semibold text-gray-700">Loading application...</div>
            </div>
        );
    }

    return (
        <FirebaseContext.Provider value={{ db, auth, userId, appId }}>
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 font-inter text-gray-800 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
                    {currentPage === 'home' && <HomePage navigateTo={navigateTo} />}
                    {currentPage === 'newGame' && <NewGamePage navigateTo={navigateTo} />}
                    {currentPage === 'scorecard' && currentGameId && <ScorecardPage gameId={currentGameId} navigateTo={navigateTo} />}
                    {currentPage === 'history' && <HistoryPage navigateTo={navigateTo} />}
                    {currentPage === 'about' && <AboutPage navigateTo={navigateTo} />}
                </div>
            </div>
        </FirebaseContext.Provider>
    );
};

// Home Page Component
const HomePage = ({ navigateTo }) => {
    return (
        <div className="p-6 flex flex-col items-center justify-center h-full min-h-[500px]">
            <div className="mb-10 text-center">
                <svg className="w-24 h-24 mx-auto text-green-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h1 className="text-4xl font-extrabold text-gray-900 drop-shadow-md">Golf Scorecard</h1>
                <p className="text-lg text-gray-600 mt-2">Track your rounds with ease!</p>
            </div>
            <div className="w-full space-y-4">
                <button
                    onClick={() => navigateTo('newGame')}
                    className="w-full py-4 px-6 bg-green-500 hover:bg-green-600 text-white font-bold text-lg rounded-lg shadow-lg transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
                >
                    <i className="fas fa-plus-circle mr-2"></i> New Game
                </button>
                <button
                    onClick={() => navigateTo('history')}
                    className="w-full py-4 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg rounded-lg shadow-lg transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
                >
                    <i className="fas fa-history mr-2"></i> History
                </button>
                <button
                    onClick={() => navigateTo('about')}
                    className="w-full py-4 px-6 bg-gray-400 hover:bg-gray-500 text-white font-bold text-lg rounded-lg shadow-lg transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
                >
                    <i className="fas fa-info-circle mr-2"></i> About
                </button>
            </div>
        </div>
    );
};

// New Game Page Component
const NewGamePage = ({ navigateTo }) => {
    const { db, userId, appId } = useContext(FirebaseContext);
    const [courseName, setCourseName] = useState('');
    const [numPlayers, setNumPlayers] = useState(1);
    const [pin, setPin] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showParInput, setShowParInput] = useState(false);
    const [parValues, setParValues] = useState(Array(18).fill(0)); // Initialize with 18 zeros

    // Effect to check for existing course and load par values
    useEffect(() => {
        const checkCourse = async () => {
            if (!db || !courseName) {
                setShowParInput(false); // Hide par input if no course name
                setParValues(Array(18).fill(0)); // Reset par values
                return;
            }

            setLoading(true);
            setMessage('');
            try {
                const q = query(collection(db, `artifacts/${appId}/public/data/golf_courses`), where('name', '==', courseName));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    // Course exists, load its par values
                    const existingCourse = querySnapshot.docs[0].data();
                    setParValues(existingCourse.parValues || Array(18).fill(0));
                    setShowParInput(false); // No need to show input if loaded
                    setMessage(`Course "${courseName}" found. Using its saved par values.`);
                } else {
                    // New course, prompt for par values
                    setParValues(Array(18).fill(0)); // Reset for new input
                    setShowParInput(true);
                    setMessage(`Course "${courseName}" is new. Please enter par for each hole.`);
                }
            } catch (error) {
                console.error("Error checking course:", error);
                setMessage('Error checking course. Please try again.');
                setParValues(Array(18).fill(0));
                setShowParInput(true); // Assume new if error checking
            } finally {
                setLoading(false);
            }
        };

        const handler = setTimeout(() => {
            checkCourse();
        }, 500); // Debounce course name input

        return () => clearTimeout(handler);
    }, [courseName, db, appId]);

    const handleParChange = (holeIndex, value) => {
        const newPar = parseInt(value) || 0;
        setParValues(prevPars => {
            const updatedPars = [...prevPars];
            updatedPars[holeIndex] = newPar;
            return updatedPars;
        });
    };

    const handleCreateGame = async () => {
        if (!db) {
            setMessage('Database not initialized. Cannot create game.');
            return;
        }
        if (!courseName) {
            setMessage('Please enter a course name.');
            return;
        }
        if (numPlayers < 1) {
            setMessage('Number of players must be at least 1.');
            return;
        }
        // Validate par values if input is shown
        if (showParInput && parValues.some(par => par <= 0)) {
            setMessage('Please enter valid par values (greater than 0) for all 18 holes.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            // 1. Save/Update Course Information
            let currentCourseId;
            const q = query(collection(db, `artifacts/${appId}/public/data/golf_courses`), where('name', '==', courseName));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // New course, add it to golf_courses collection
                const newCourseRef = doc(collection(db, `artifacts/${appId}/public/data/golf_courses`));
                currentCourseId = newCourseRef.id;
                await setDoc(newCourseRef, {
                    id: currentCourseId,
                    name: courseName,
                    parValues: parValues,
                    createdAt: new Date().toISOString(),
                    createdByUserId: userId,
                });
            } else {
                // Existing course, use its ID and potentially update par values if they changed
                const existingCourseDoc = querySnapshot.docs[0];
                currentCourseId = existingCourseDoc.id;
                // Optionally update existing course's par values if user modified them
                if (JSON.stringify(existingCourseDoc.data().parValues) !== JSON.stringify(parValues)) {
                     await updateDoc(existingCourseDoc.ref, { parValues: parValues });
                }
            }

            // 2. Create Game Information
            const newGameId = generateUniqueId();
            const players = Array.from({ length: numPlayers }, (_, i) => ({
                id: generateUniqueId(),
                name: `Player ${i + 1}`,
                scores: Array(18).fill(0), // 18 holes, initialized to 0
            }));

            const gameData = {
                gameId: newGameId,
                courseName: courseName,
                courseId: currentCourseId, // Link to the course document
                parValues: parValues, // Store par values directly in game for historical accuracy
                date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                pin: pin || null, // Store null if no PIN
                players: players,
                createdAt: new Date().toISOString(),
                createdByUserId: userId,
            };

            const gameDocRef = doc(collection(db, `artifacts/${appId}/public/data/golf_games`), newGameId);
            await setDoc(gameDocRef, gameData);

            setMessage('Game created successfully! Redirecting to scorecard...');
            setTimeout(() => navigateTo('scorecard', newGameId), 1500);

        } catch (error) {
            console.error("Error creating game:", error);
            setMessage('Failed to create game. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 flex flex-col h-full min-h-[500px]">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Start a New Game</h2>
            <div className="space-y-4 flex-grow">
                <div>
                    <label htmlFor="courseName" className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                    <input
                        type="text"
                        id="courseName"
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        placeholder="e.g., Augusta National"
                    />
                </div>
                <div>
                    <label htmlFor="numPlayers" className="block text-sm font-medium text-gray-700 mb-1">Number of Players</label>
                    <input
                        type="number"
                        id="numPlayers"
                        value={numPlayers}
                        onChange={(e) => setNumPlayers(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    />
                </div>
                <div>
                    <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">PIN (Optional, for shared editing)</label>
                    <input
                        type="text"
                        id="pin"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        placeholder="e.g., 1234"
                    />
                </div>

                {showParInput && (
                    <div className="border border-dashed border-gray-300 p-4 rounded-lg bg-gray-50">
                        <p className="text-sm font-medium text-gray-700 mb-3">Enter Par for each hole:</p>
                        <div className="grid grid-cols-6 gap-2 text-center">
                            {Array.from({ length: 18 }).map((_, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <label htmlFor={`par-hole-${i + 1}`} className="text-xs text-gray-600">H{i + 1}</label>
                                    <input
                                        type="number"
                                        id={`par-hole-${i + 1}`}
                                        value={parValues[i]}
                                        onChange={(e) => handleParChange(i, e.target.value)}
                                        className="w-10 p-1 border border-gray-300 rounded-md text-center text-sm focus:ring-blue-300 focus:border-blue-300"
                                        min="0"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {message && (
                    <p className={`text-center text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                        {message}
                    </p>
                )}
            </div>
            <div className="mt-6 space-y-3">
                <button
                    onClick={handleCreateGame}
                    disabled={loading}
                    className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-lg shadow-lg transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {loading ? (
                        <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <i className="fas fa-golf-ball mr-2"></i>
                    )}
                    Create Game
                </button>
                <button
                    onClick={() => navigateTo('home')}
                    className="w-full py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold text-lg rounded-lg shadow-md transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-200"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
};

// Scorecard Page Component
const ScorecardPage = ({ gameId, navigateTo }) => {
    const { db, userId, appId } = useContext(FirebaseContext);
    const [gameData, setGameData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showPinModal, setShowPinModal] = useState(false);
    const [enteredPin, setEnteredPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [canEdit, setCanEdit] = useState(false); // Flag to control editing access

    useEffect(() => {
        if (!db || !gameId) {
            setError('Database not ready or Game ID is missing.');
            setLoading(false);
            return;
        }

        const gameDocRef = doc(collection(db, `artifacts/${appId}/public/data/golf_games`), gameId);

        const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setGameData(data);
                setLoading(false);

                // Determine if user can edit:
                // 1. If no PIN is set, or
                // 2. If the current user created the game, or
                // 3. If the user has already successfully entered the PIN (canEdit is true)
                if (!data.pin || data.createdByUserId === userId || canEdit) {
                    setCanEdit(true);
                    setShowPinModal(false); // Hide modal if already editable
                } else {
                    setCanEdit(false); // Ensure editing is off if PIN is required and not met
                    setShowPinModal(true); // Show modal if PIN is required and not creator/already edited
                }
            } else {
                setError('Game not found.');
                setLoading(false);
            }
        }, (err) => {
            console.error("Error fetching game data:", err);
            setError('Failed to load game data.');
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, [db, gameId, userId, canEdit]); // Added canEdit to dependencies to re-evaluate pin modal

    const handleScoreChange = async (playerIndex, holeIndex, value) => {
        if (!canEdit || !gameData || !db) return;

        const newScore = parseInt(value) || 0;
        const updatedPlayers = [...gameData.players];
        updatedPlayers[playerIndex].scores[holeIndex] = newScore;

        try {
            const gameDocRef = doc(collection(db, `artifacts/${appId}/public/data/golf_games`), gameId);
            await updateDoc(gameDocRef, { players: updatedPlayers });
        } catch (err) {
            console.error("Error updating score:", err);
            setError('Failed to update score.');
        }
    };

    const handlePlayerNameChange = async (playerIndex, newName) => {
        if (!canEdit || !gameData || !db) return;

        const updatedPlayers = [...gameData.players];
        updatedPlayers[playerIndex].name = newName;

        try {
            const gameDocRef = doc(collection(db, `artifacts/${appId}/public/data/golf_games`), gameId);
            await updateDoc(gameDocRef, { players: updatedPlayers });
        } catch (err) {
            console.error("Error updating player name:", err);
            setError('Failed to update player name.');
        }
    };

    const handleAddPlayer = async () => {
        if (!canEdit || !gameData || !db) return;

        const newPlayer = {
            id: generateUniqueId(),
            name: `Player ${gameData.players.length + 1}`,
            scores: Array(18).fill(0),
        };
        const updatedPlayers = [...gameData.players, newPlayer];

        try {
            const gameDocRef = doc(collection(db, `artifacts/${appId}/public/data/golf_games`), gameId);
            await updateDoc(gameDocRef, { players: updatedPlayers });
        } catch (err) {
            console.error("Error adding player:", err);
            setError('Failed to add player.');
        }
    };

    const handleDeletePlayer = async (playerIndex) => {
        if (!canEdit || !gameData || !db || gameData.players.length <= 1) return; // Cannot delete last player

        const updatedPlayers = gameData.players.filter((_, i) => i !== playerIndex);

        try {
            const gameDocRef = doc(collection(db, `artifacts/${appId}/public/data/golf_games`), gameId);
            await updateDoc(gameDocRef, { players: updatedPlayers });
        } catch (err) {
            console.error("Error deleting player:", err);
            setError('Failed to delete player.');
        }
    };

    const calculateTotal = (scores) => scores.reduce((sum, score) => sum + score, 0);

    const handleCopyLink = () => {
        // Construct the full shareable URL
        // window.location.origin gives "https://johansson-anton.github.io"
        // '/golf/' is your repository's base path
        // ?gameId=${gameId} adds the specific game ID as a query parameter
        const shareableLink = `${window.location.origin}/golf/?gameId=${gameId}`;

        // Create a temporary textarea element to copy the text
        const el = document.createElement('textarea');
        el.value = shareableLink;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy'); // Fallback for clipboard API in iframes
        document.body.removeChild(el);
        alertMessage('Link copied to clipboard!', 'success');
    };

    const handlePinSubmit = () => {
        if (enteredPin === gameData.pin) {
            setCanEdit(true);
            setShowPinModal(false);
            setPinError('');
        } else {
            setPinError('Incorrect PIN. Please try again.');
        }
    };

    const handleViewOnly = () => {
        setCanEdit(false); // Explicitly set to view-only mode
        setShowPinModal(false);
        setPinError('');
    };

    const [alertMsg, setAlertMsg] = useState({ message: '', type: '' });
    const alertMessage = (message, type) => {
        setAlertMsg({ message, type });
        setTimeout(() => setAlertMsg({ message: '', type: '' }), 3000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px] text-gray-700">
                <svg className="animate-spin h-8 w-8 text-blue-500 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading scorecard...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 min-h-[500px] flex flex-col justify-center items-center">
                <p className="text-xl font-semibold mb-4">{error}</p>
                <button
                    onClick={() => navigateTo('home')}
                    className="py-3 px-6 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-md"
                >
                    Go to Home
                </button>
            </div>
        );
    }

    if (!gameData) {
        return (
            <div className="p-6 text-center text-gray-600 min-h-[500px] flex flex-col justify-center items-center">
                <p className="text-xl font-semibold mb-4">No game data available.</p>
                <button
                    onClick={() => navigateTo('home')}
                    className="py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-md"
                >
                    Go to Home
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 flex flex-col h-full min-h-[500px]">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">{gameData.courseName}</h2>
            <p className="text-md text-gray-600 mb-4 text-center">{gameData.date}</p>

            {alertMsg.message && (
                <div className={`p-3 mb-4 rounded-lg text-center text-white ${alertMsg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {alertMsg.message}
                </div>
            )}

            {showPinModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <h3 className="text-2xl font-bold mb-4 text-gray-800">Enter PIN to Edit</h3>
                        <p className="text-gray-600 mb-4">This game requires a PIN for editing.</p>
                        <input
                            type="password"
                            value={enteredPin}
                            onChange={(e) => setEnteredPin(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm mb-4"
                            placeholder="Enter PIN"
                        />
                        {pinError && <p className="text-red-500 text-sm mb-3">{pinError}</p>}
                        <div className="space-y-3 mt-4">
                            <button
                                onClick={handlePinSubmit}
                                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
                            >
                                Submit PIN
                            </button>
                            <button
                                onClick={handleViewOnly}
                                className="w-full py-3 px-6 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded-lg shadow-md transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
                            >
                                View Only
                            </button>
                            <button
                                onClick={() => navigateTo('home')}
                                className="w-full py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg shadow-md transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-200"
                            >
                                Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto flex-grow mb-4 rounded-lg shadow-lg bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 w-28"></th> {/* Empty header for player name column */}
                            {Array.from({ length: 18 }).map((_, i) => (
                                <th key={i} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                    Hole {i + 1}
                                </th>
                            ))}
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Total</th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Par Row */}
                        <tr>
                            <td className="px-2 py-2 whitespace-nowrap sticky left-0 bg-white z-10 font-bold text-gray-700 w-28">Par</td>
                            {gameData.parValues && gameData.parValues.map((par, i) => (
                                <td key={`par-${i}`} className="px-2 py-2 whitespace-nowrap text-center font-semibold text-gray-800">
                                    {par}
                                </td>
                            ))}
                            <td className="px-2 py-2 whitespace-nowrap font-bold text-center text-gray-900 w-16">
                                {gameData.parValues ? calculateTotal(gameData.parValues) : '-'}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-center w-16"></td> {/* Empty cell for actions column */}
                        </tr>
                        {/* Player Rows */}
                        {gameData.players.map((player, playerIndex) => (
                            <tr key={player.id}>
                                <td className="px-2 py-2 whitespace-nowrap sticky left-0 bg-white z-10 w-28">
                                    <input
                                        type="text"
                                        value={player.name}
                                        onChange={(e) => handlePlayerNameChange(playerIndex, e.target.value)}
                                        readOnly={!canEdit}
                                        className={`w-full p-1 border rounded-md ${canEdit ? 'border-gray-300 focus:ring-blue-300 focus:border-blue-300' : 'border-transparent bg-transparent'}`}
                                    />
                                </td>
                                {player.scores.map((score, holeIndex) => (
                                    <td key={holeIndex} className="px-2 py-2 whitespace-nowrap text-center">
                                        <input
                                            type="number"
                                            value={score}
                                            onChange={(e) => handleScoreChange(playerIndex, holeIndex, e.target.value)}
                                            readOnly={!canEdit}
                                            className={`w-12 p-1 border rounded-md text-center ${canEdit ? 'border-gray-300 focus:ring-blue-300 focus:border-blue-300' : 'border-transparent bg-transparent'}`}
                                            min="0"
                                        />
                                    </td>
                                ))}
                                <td className="px-2 py-2 whitespace-nowrap font-bold text-center text-gray-900 w-16">
                                    {calculateTotal(player.scores)}
                                </td>
                                <td className="px-2 py-2 whitespace-nowrap text-center w-16">
                                    {canEdit && gameData.players.length > 1 && (
                                        <button
                                            onClick={() => handleDeletePlayer(playerIndex)}
                                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition duration-150"
                                            title="Delete Player"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {canEdit && (
                <button
                    onClick={handleAddPlayer}
                    className="w-full py-3 px-6 mb-4 bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg rounded-lg shadow-md transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
                >
                    <i className="fas fa-user-plus mr-2"></i> Add Player
                </button>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={handleCopyLink}
                    className="flex-1 py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg rounded-lg shadow-md transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
                >
                    <i className="fas fa-share-alt mr-2"></i> Share Link
                </button>
                {!canEdit && ( // Only show EDIT button if not currently editable
                    <button
                        onClick={() => setShowPinModal(true)}
                        className="flex-1 py-3 px-6 bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-lg rounded-lg shadow-md transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-300"
                    >
                        <i className="fas fa-edit mr-2"></i> EDIT
                    </button>
                )}
                <button
                    onClick={() => navigateTo('home')}
                    className="flex-1 py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold text-lg rounded-lg shadow-md transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-200"
                >
                    Back to Home
                </button>
            </div>
            <p className="text-center text-xs text-gray-500 mt-4">User ID: {userId}</p>
        </div>
    );
};

// History Page Component
const HistoryPage = ({ navigateTo }) => {
    const { db, appId } = useContext(FirebaseContext);
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchGames = async () => {
            if (!db) {
                setError('Database not ready.');
                setLoading(false);
                return;
            }

            try {
                // Query for ALL games in the public collection
                const q = query(
                    collection(db, `artifacts/${appId}/public/data/golf_games`)
                );
                const querySnapshot = await getDocs(q);
                let fetchedGames = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Sort by createdAt (most recent first) and limit to last 10
                fetchedGames.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setGames(fetchedGames.slice(0, 10)); // Limit to last 10 games
            } catch (err) {
                console.error("Error fetching history:", err);
                setError('Failed to load game history.');
            } finally {
                setLoading(false);
            }
        };

        fetchGames();
    }, [db, appId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px] text-gray-700">
                <svg className="animate-spin h-8 w-8 text-blue-500 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading history...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 min-h-[500px] flex flex-col justify-center items-center">
                <p className="text-xl font-semibold mb-4">{error}</p>
                <button
                    onClick={() => navigateTo('home')}
                    className="py-3 px-6 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-md"
                >
                    Go to Home
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col h-full min-h-[500px]">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Game History</h2>
            {games.length === 0 ? (
                <p className="text-center text-gray-600 text-lg flex-grow flex items-center justify-center">No games found. Start a new game!</p>
            ) : (
                <ul className="space-y-3 flex-grow overflow-y-auto max-h-[calc(100vh-200px)]">
                    {games.map((game) => (
                        <li
                            key={game.gameId}
                            className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition duration-200 cursor-pointer flex justify-between items-center"
                            onClick={() => navigateTo('scorecard', game.gameId)}
                        >
                            <div>
                                <p className="font-semibold text-lg text-gray-800">{game.courseName}</p>
                                <p className="text-sm text-gray-500">Date: {game.date}</p>
                                <p className="text-sm text-gray-500">Players: {game.players.length}</p>
                            </div>
                            <i className="fas fa-chevron-right text-gray-400"></i>
                        </li>
                    ))}
                </ul>
            )}
            <div className="mt-6">
                <button
                    onClick={() => navigateTo('home')}
                    className="w-full py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold text-lg rounded-lg shadow-md transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-200"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
};

// About Page Component
const AboutPage = ({ navigateTo }) => {
    return (
        <div className="p-6 flex flex-col h-full min-h-[500px]">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">About This App</h2>
            <div className="text-gray-700 space-y-4 flex-grow">
                <p>This Golf Scorecard web application allows you to easily track scores for your golf rounds. It's designed to be simple and mobile-friendly, requiring no user login.</p>
                <p>
                    You can start a new game, get a unique link, and share it with other players. If you set a PIN, others will need it to edit scores, ensuring your game remains secure.
                </p>
                <p>All game data is saved in a real-time database, so everyone sees the latest scores instantly.</p>
                <p className="text-sm text-gray-500 mt-4">
                    Developed using React and powered by Firebase Firestore for data persistence.
                </p>
            </div>
            <div className="mt-6">
                <button
                    onClick={() => navigateTo('home')}
                    className="w-full py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold text-lg rounded-lg shadow-md transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-200"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
};

export default App;


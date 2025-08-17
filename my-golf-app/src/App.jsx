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
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    // >>>>>>>>>>>>>> PASTE YOUR ACTUAL FIREBASE CONFIG HERE <<<<<<<<<<<<<<
    // Example: This is what it should look like *after* you paste your actual config.
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

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

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
		"green machine",
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
        if (!db && !isAuthReady) {
            const isFirebaseConfigValid = Object.keys(firebaseConfig).length > 0 && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_");

            if (isFirebaseConfigValid) {
                try {
                    const app = initializeApp(firebaseConfig);
                    const firestoreDb = getFirestore(app);
                    const firebaseAuth = getAuth(app);
                    setDb(firestoreDb);
                    setAuth(firebaseAuth);

                    const signInUser = async () => {
                        try {
                            if (initialAuthToken) {
                                await signInWithCustomToken(firebaseAuth, initialAuthToken);
                            } else {
                                await signInAnonymously(firebaseAuth);
                            }
                        } catch (error) {
                            console.error("Firebase authentication failed:", error);
                            setUserId(generateUniqueId());
                        } finally {
                            setIsAuthReady(true);
                        }
                    };
                    signInUser();

                    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
                        if (user) {
                            setUserId(user.uid);
                        } else {
                            setUserId(generateUniqueId());
                        }
                        setIsAuthReady(true);
                    });

                    return () => unsubscribe();
                } catch (error) {
                    console.error("Failed to initialize Firebase:", error);
                    setUserId(generateUniqueId());
                    setIsAuthReady(true);
                }
            } else {
                console.warn("Firebase config is missing or incomplete. Running without database persistence.");
                setUserId(generateUniqueId());
                setIsAuthReady(true);
            }
        }
    }, [db, isAuthReady, initialAuthToken]);

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
        const newUrl = id ? `${window.location.pathname}?gameId=${id}` : window.location.pathname;
        window.history.pushState({}, '', newUrl);
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
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 font-sans text-gray-800 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
                    {currentPage === 'home' && <HomePage navigateTo={navigateTo} />}
                    {currentPage === 'newGame' && <NewGamePage navigateTo={navigateTo} />}
                    {currentPage === 'scorecard' && currentGameId && <ScorecardPage gameId={currentGameId} navigateTo={navigateTo} />}
                    {currentPage === 'history' && <HistoryPage navigateTo={navigateTo} />}
                    {currentPage === 'about' && <AboutPage navigateTo={navigateTo} />}
                    {currentPage === 'allCourses' && <AllCoursesPage navigateTo={navigateTo} />}
                    {currentPage === 'addCourse' && <AddCoursePage navigateTo={navigateTo} />}
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
                <svg className="w-24 h-24 mx-auto text-green-600 mb-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<g id="golf" transform="translate(0 0)">
						<path id="secondary" fill="#00A000" d="M12,4v6l6-3Z"/>
						<path id="primary" d="M12,13c-3.31,0-6,1.79-6,4s2.69,4,6,4,6-1.79,6-4a3.59,3.59,0,0,0-2-3" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
						<path id="primary-2" data-name="primary" d="M12,3V17M12,4v6l6-3Z" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
					</g>
                </svg>
                <h1 className="text-4xl font-extrabold text-gray-900 drop-shadow-md">Golf Scorecard</h1>
                <p className="text-lg text-gray-600 mt-2">Track your rounds with ease!</p>
            </div>
            <div className="w-full space-y-4">
                <button
                    onClick={() => navigateTo('newGame')}
                    className="w-full py-4 px-6 bg-green-500 hover:bg-green-600 text-white font-bold text-lg rounded-lg shadow-lg transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
                >
                    New Game
                </button>
                <button
                    onClick={() => navigateTo('history')}
                    className="w-full py-4 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg rounded-lg shadow-lg transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
                >
                    History
                </button>
                <button
                    onClick={() => navigateTo('allCourses')}
                    className="w-full py-4 px-6 bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg rounded-lg shadow-lg transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
                >
                    Courses
                </button>
                <button
                    onClick={() => navigateTo('about')}
                    className="w-full py-4 px-6 bg-gray-400 hover:bg-gray-500 text-white font-bold text-lg rounded-lg shadow-lg transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
                >
                    About
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
    const [playerNames, setPlayerNames] = useState(['']); // *** NEW: State for player names
    const [pin, setPin] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [allCourseNames, setAllCourseNames] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [courseError, setCourseError] = useState('');

    const playerOptions = [1, 2, 3, 4];

    // *** NEW: Effect to sync playerNames array with numPlayers
    useEffect(() => {
        setPlayerNames(currentNames => {
            const newPlayerNames = Array(numPlayers).fill('');
            // Keep existing names when changing player count
            for (let i = 0; i < Math.min(numPlayers, currentNames.length); i++) {
                newPlayerNames[i] = currentNames[i];
            }
            return newPlayerNames;
        });
    }, [numPlayers]);

    // Effect to fetch all existing course names on component mount
    useEffect(() => {
        const fetchAllCourseNames = async () => {
            setLoadingCourses(true);
            setCourseError('');
            if (!db) {
                setCourseError('Database connection not available.');
                setLoadingCourses(false);
                return;
            }
            try {
                const q = collection(db, `artifacts/${appId}/public/data/golf_courses`);
                const querySnapshot = await getDocs(q);
                const names = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, parValues: doc.data().parValues }));
                setAllCourseNames(names);
            } catch (error) {
                console.error("Error fetching all course names:", error);
                setCourseError('Failed to load courses. Please check your Firebase configuration and security rules.');
            } finally {
                setLoadingCourses(false);
            }
        };
        fetchAllCourseNames();
    }, [db, appId]);

    // Effect to check for existing course
    useEffect(() => {
        if (!courseName) {
            setSelectedCourse(null);
            setMessage('');
            return;
        }
        const matchedCourse = allCourseNames.find(
            course => course.name.toLowerCase() === courseName.toLowerCase()
        );
        if (matchedCourse) {
            setSelectedCourse(matchedCourse);
            setMessage(`Course "${matchedCourse.name}" found.`);
        } else {
            setSelectedCourse(null);
            setMessage(`Course "${courseName}" not found. Please add it via the Courses page.`);
        }
    }, [courseName, allCourseNames]);
    
    // *** NEW: Handler to update a player's name
    const handlePlayerNameChange = (index, name) => {
        const newPlayerNames = [...playerNames];
        newPlayerNames[index] = name;
        setPlayerNames(newPlayerNames);
    };

    const handleCreateGame = async () => {
        setLoading(true);
        setMessage('');
        if (!db) {
            setMessage('Database not initialized. Cannot create game.');
            setLoading(false);
            return;
        }
        if (!selectedCourse) {
            setMessage('Please select an existing course.');
            setLoading(false);
            return;
        }

        try {
            const newGameId = generateUniqueId();
            // *** UPDATED: Use playerNames from state, with a fallback
            const players = Array.from({ length: numPlayers }, (_, i) => ({
                id: generateUniqueId(),
                name: playerNames[i]?.trim() || `Player ${i + 1}`,
                scores: Array(18).fill(''),
            }));

            const gameData = {
                gameId: newGameId,
                courseName: selectedCourse.name,
                courseId: selectedCourse.id,
                parValues: selectedCourse.parValues,
                date: new Date().toISOString().split('T')[0],
                pin: pin || null,
                players: players,
                createdAt: new Date().toISOString(),
                createdByUserId: userId,
            };

            const gameDocRef = doc(db, `artifacts/${appId}/public/data/golf_games`, newGameId);
            await setDoc(gameDocRef, gameData);

            setMessage('Game created successfully! Redirecting...');
            setTimeout(() => navigateTo('scorecard', newGameId), 1500);

        } catch (error) {
            console.error("Error creating game:", error);
            setMessage('Failed to create game. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loadingCourses) {
        return <div className="p-6 flex justify-center items-center min-h-[500px]">Loading courses...</div>;
    }
    if (courseError) {
        return <div className="p-6 text-red-600 text-center min-h-[500px]">{courseError}</div>;
    }

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
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm"
                        placeholder="e.g., Augusta National"
                        list="course-suggestions"
                    />
                    <datalist id="course-suggestions">
                        {allCourseNames.map(course => <option key={course.id} value={course.name} />)}
                    </datalist>
                </div>
                <div>
					<label className="block text-lg font-semibold text-gray-800 mb-4 text-center">Number of Players</label>
					<div className="flex justify-center space-x-4">
						{playerOptions.map((playerNum) => (
							<button
								key={playerNum}
								type="button"
								onClick={() => setNumPlayers(playerNum)}
								className={`px-6 py-3 rounded-full text-lg font-bold transition-all duration-200 ${numPlayers === playerNum ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
							>
								{playerNum}
							</button>
						))}
					</div>
                </div>
                {/* *** NEW: Player Name Input Section *** */}
                <div>
                    <label className="block text-lg font-semibold text-gray-800 mb-4 text-center">Player Names</label>
                    <div className="space-y-3">
                        {playerNames.map((name, index) => (
                            <input
                                key={index}
                                type="text"
                                value={name}
                                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm"
                                placeholder={`Player ${index + 1} Name`}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">PIN (Optional)</label>
                    <input
                        type="text"
                        id="pin"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm"
                        placeholder="e.g., 1234"
                    />
                </div>
                {message && <p className={`text-center text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
            </div>
            <div className="mt-6 space-y-3">
                <button
                    onClick={handleCreateGame}
                    disabled={loading || !selectedCourse}
                    className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-lg shadow-lg disabled:opacity-50"
                >
                    {loading ? 'Creating...' : 'Create Game'}
                </button>
                <button onClick={() => navigateTo('home')} className="w-full py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg shadow-md">
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
    const [canEdit, setCanEdit] = useState(false);

    useEffect(() => {
        if (!db || !gameId) {
            setError('Database not ready or Game ID is missing.');
            setLoading(false);
            return;
        }

        const gameDocRef = doc(db, `artifacts/${appId}/public/data/golf_games`, gameId);

        const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setGameData(data);
                setLoading(false);

                if (!data.pin || data.createdByUserId === userId || canEdit) {
                    setCanEdit(true);
                    setShowPinModal(false);
                } else {
                    setCanEdit(false);
                    setShowPinModal(true);
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

        return () => unsubscribe();
    }, [db, gameId, userId, canEdit, appId]);

    const handleScoreChange = async (playerIndex, holeIndex, value) => {
        if (!canEdit || !gameData || !db) return;
        const newScore = value === '' ? '' : parseInt(value, 10) || 0;
        const updatedPlayers = JSON.parse(JSON.stringify(gameData.players));
        updatedPlayers[playerIndex].scores[holeIndex] = newScore;

        try {
            const gameDocRef = doc(db, `artifacts/${appId}/public/data/golf_games`, gameId);
            await updateDoc(gameDocRef, { players: updatedPlayers });
        } catch (err) {
            console.error("Error updating score:", err);
            setError('Failed to update score.');
        }
    };

    const handlePlayerNameChange = async (playerIndex, newName) => {
        if (!canEdit || !gameData || !db) return;
        const updatedPlayers = JSON.parse(JSON.stringify(gameData.players));
        updatedPlayers[playerIndex].name = newName;

        try {
            const gameDocRef = doc(db, `artifacts/${appId}/public/data/golf_games`, gameId);
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
            scores: Array(18).fill(''),
        };
        const updatedPlayers = [...gameData.players, newPlayer];

        try {
            const gameDocRef = doc(db, `artifacts/${appId}/public/data/golf_games`, gameId);
            await updateDoc(gameDocRef, { players: updatedPlayers });
        } catch (err) {
            console.error("Error adding player:", err);
            setError('Failed to add player.');
        }
    };

    const handleDeletePlayer = async (playerIndex) => {
        if (!canEdit || !gameData || !db || gameData.players.length <= 1) return;
        const updatedPlayers = gameData.players.filter((_, i) => i !== playerIndex);

        try {
            const gameDocRef = doc(db, `artifacts/${appId}/public/data/golf_games`, gameId);
            await updateDoc(gameDocRef, { players: updatedPlayers });
        } catch (err) {
            console.error("Error deleting player:", err);
            setError('Failed to delete player.');
        }
    };

    const calculateTotal = (scores) => scores.reduce((sum, score) => sum + (score === '' ? 0 : Number(score)), 0);

    const handleCopyLink = () => {
        const shareableLink = `${window.location.origin}${window.location.pathname}?gameId=${gameId}`;
        const el = document.createElement('textarea');
        el.value = shareableLink;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        alertMessage('Link copied to clipboard!', 'success');
    };

    const handlePinSubmit = () => {
        if (enteredPin === gameData.pin) {
            setCanEdit(true);
            setShowPinModal(false);
            setPinError('');
        } else {
            setPinError('Incorrect PIN.');
        }
    };

    const handleViewOnly = () => {
        setCanEdit(false);
        setShowPinModal(false);
        setPinError('');
    };

    const [alertMsg, setAlertMsg] = useState({ message: '', type: '' });
    const alertMessage = (message, type) => {
        setAlertMsg({ message, type });
        setTimeout(() => setAlertMsg({ message: '', type: '' }), 3000);
    };

    if (loading) return <div className="p-6 flex justify-center items-center min-h-[500px]">Loading scorecard...</div>;
    if (error) return <div className="p-6 text-red-600 text-center min-h-[500px]">{error}</div>;
    if (!gameData) return <div className="p-6 text-center min-h-[500px]">No game data.</div>;

    return (
        <div className="p-4 sm:p-6 flex flex-col h-full min-h-[500px]">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">{gameData.courseName}</h2>
            <p className="text-md text-gray-600 mb-4 text-center">{gameData.date}</p>

            {alertMsg.message && <div className={`p-3 mb-4 rounded-lg text-center text-white ${alertMsg.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{alertMsg.message}</div>}

            {showPinModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <h3 className="text-2xl font-bold mb-4">Enter PIN to Edit</h3>
                        <input type="password" value={enteredPin} onChange={(e) => setEnteredPin(e.target.value)} className="w-full p-3 border rounded-lg mb-4" placeholder="Enter PIN" />
                        {pinError && <p className="text-red-500 text-sm mb-3">{pinError}</p>}
                        <div className="space-y-3 mt-4">
                            <button onClick={handlePinSubmit} className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">Submit PIN</button>
                            <button onClick={handleViewOnly} className="w-full py-3 px-6 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded-lg">View Only</button>
                            <button onClick={() => navigateTo('home')} className="w-full py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg">Back to Home</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto flex-grow mb-4 rounded-lg shadow-lg bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 py-2 whitespace-nowrap sticky left-0 bg-gray-50 z-10 font-bold text-gray-700 w-40">Hole</th>
                            {Array.from({ length: 18 }).map((_, i) => <th key={i} className="px-2 py-3 text-center text-xs font-medium text-gray-500 w-12">{i + 1}</th>)}
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 w-16">Total</th>
                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                            <td className="px-2 py-2 whitespace-nowrap sticky left-0 bg-white z-10 font-bold text-gray-700 w-40">Par</td>
                            {gameData.parValues?.map((par, i) => <td key={`par-${i}`} className="px-2 py-2 text-center font-semibold">{par}</td>)}
                            <td className="px-2 py-2 font-bold text-center w-16">{gameData.parValues ? calculateTotal(gameData.parValues) : '-'}</td>
                            <td className="w-16"></td>
                        </tr>
                        {gameData.players.map((player, playerIndex) => (
                            <tr key={player.id}>
                                <td className="px-2 py-2 whitespace-nowrap sticky left-0 bg-white z-10 w-40">
                                    <input type="text" value={player.name} onChange={(e) => handlePlayerNameChange(playerIndex, e.target.value)} readOnly={!canEdit} className={`w-full p-1 border rounded-md ${canEdit ? 'border-gray-300' : 'border-transparent bg-transparent'}`} />
                                </td>
                                {player.scores.map((score, holeIndex) => (
                                    <td key={holeIndex} className="px-2 py-2 text-center">
                                        <input type="number" value={score} onChange={(e) => handleScoreChange(playerIndex, holeIndex, e.target.value)} readOnly={!canEdit} className={`w-12 p-1 border rounded-md text-center ${canEdit ? 'border-gray-300' : 'border-transparent bg-transparent'}`} min="0" />
                                    </td>
                                ))}
                                <td className="px-2 py-2 font-bold text-center w-16">{calculateTotal(player.scores)}</td>
                                <td className="px-2 py-2 text-center w-16">
                                    {canEdit && gameData.players.length > 1 && <button onClick={() => handleDeletePlayer(playerIndex)} className="text-red-500 hover:text-red-700 p-1">Delete</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {canEdit && <button onClick={handleAddPlayer} className="w-full py-3 px-6 mb-4 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg">Add Player</button>}

            <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleCopyLink} className="flex-1 py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg">Share Link</button>
                {!canEdit && <button onClick={() => setShowPinModal(true)} className="flex-1 py-3 px-6 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg">EDIT</button>}
                <button onClick={() => navigateTo('home')} className="flex-1 py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg">Back to Home</button>
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
                const q = query(collection(db, `artifacts/${appId}/public/data/golf_games`));
                const querySnapshot = await getDocs(q);
                let fetchedGames = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedGames.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setGames(fetchedGames.slice(0, 10));
            } catch (err) {
                console.error("Error fetching history:", err);
                setError('Failed to load game history.');
            } finally {
                setLoading(false);
            }
        };
        fetchGames();
    }, [db, appId]);

    if (loading) return <div className="p-6 flex justify-center items-center min-h-[500px]">Loading history...</div>;
    if (error) return <div className="p-6 text-red-600 text-center min-h-[500px]">{error}</div>;

    return (
        <div className="p-6 flex flex-col h-full min-h-[500px]">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Game History</h2>
            {games.length === 0 ? (
                <p className="text-center text-gray-600 flex-grow">No games found.</p>
            ) : (
                <ul className="space-y-3 flex-grow overflow-y-auto">
                    {games.map((game) => (
                        <li key={game.gameId} className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer" onClick={() => navigateTo('scorecard', game.gameId)}>
                            <p className="font-semibold text-lg">{game.courseName}</p>
                            <p className="text-sm text-gray-500">Date: {game.date} | Players: {game.players.length}</p>
                        </li>
                    ))}
                </ul>
            )}
            <div className="mt-6">
                <button onClick={() => navigateTo('home')} className="w-full py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg">Back to Home</button>
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
                <p>This Golf Scorecard app lets you track scores for your golf rounds. It's simple, mobile-friendly, and requires no login.</p>
                <p>Start a new game, get a unique link, and share it. Set an optional PIN to control who can edit scores.</p>
                <p>Data is saved in a real-time database, so everyone sees updates instantly.</p>
            </div>
            <div className="mt-6 space-y-3">
                <button onClick={() => navigateTo('allCourses')} className="w-full py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg">All Courses</button>
                <button onClick={() => navigateTo('addCourse')} className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg">Add New Course</button>
                <button onClick={() => navigateTo('home')} className="w-full py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg">Back to Home</button>
            </div>
        </div>
    );
};

// AllCoursesPage Component
const AllCoursesPage = ({ navigateTo }) => {
    const { db, appId } = useContext(FirebaseContext);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCourses = async () => {
            if (!db) {
                setError('Database not ready.');
                setLoading(false);
                return;
            }
            try {
                const q = collection(db, `artifacts/${appId}/public/data/golf_courses`);
                const querySnapshot = await getDocs(q);
                const fetchedCourses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCourses(fetchedCourses.sort((a, b) => a.name.localeCompare(b.name)));
            } catch (err) {
                console.error("Error fetching courses:", err);
                setError('Failed to load courses.');
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [db, appId]);

    if (loading) return <div className="p-6 flex justify-center items-center min-h-[500px]">Loading courses...</div>;
    if (error) return <div className="p-6 text-red-600 text-center min-h-[500px]">{error}</div>;

    return (
        <div className="p-6 flex flex-col h-full min-h-[500px]">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">All Golf Courses</h2>
            {courses.length === 0 ? (
                <p className="text-center text-gray-600 flex-grow">No courses added yet.</p>
            ) : (
                <ul className="space-y-3 flex-grow overflow-y-auto">
                    {courses.map((course) => (
                        <li key={course.id} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                            <p className="font-semibold text-lg">{course.name}</p>
                            <p className="text-sm text-gray-500">Pars: {course.parValues?.join(', ')}</p>
                        </li>
                    ))}
                </ul>
            )}
            <div className="mt-6 space-y-3">
                <button onClick={() => navigateTo('addCourse')} className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg">Add New Course</button>
                <button onClick={() => navigateTo('home')} className="w-full py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg">Back to Home</button>
            </div>
        </div>
    );
};

// AddCoursePage Component
const AddCoursePage = ({ navigateTo }) => {
    const { db, userId, appId } = useContext(FirebaseContext);
    const [courseName, setCourseName] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showParEntryModal, setShowParEntryModal] = useState(false);
    const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
    const [tempParValues, setTempParValues] = useState(Array(18).fill(0));

    const handleParChange = (holeIndex, value) => {
        const newPars = [...tempParValues];
        newPars[holeIndex] = parseInt(value, 10) || 0;
        setTempParValues(newPars);
    };

    const handleParSelection = (par) => {
        handleParChange(currentHoleIndex, par);
        if (currentHoleIndex < 17) {
            setCurrentHoleIndex(currentHoleIndex + 1);
        } else {
            setCurrentHoleIndex(18); // Summary view
        }
    };

    const handleAddCourseFinal = async () => {
        if (!db || !courseName.trim() || tempParValues.some(p => p <= 0)) {
            setMessage('Please provide a valid course name and par for all holes.');
            return;
        }
        setLoading(true);
        try {
            const q = query(collection(db, `artifacts/${appId}/public/data/golf_courses`), where('name', '==', courseName.trim()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setMessage('A course with this name already exists.');
                setLoading(false);
                return;
            }
            const newCourseRef = doc(collection(db, `artifacts/${appId}/public/data/golf_courses`));
            await setDoc(newCourseRef, {
                id: newCourseRef.id,
                name: courseName.trim(),
                parValues: tempParValues,
                createdAt: new Date().toISOString(),
                createdByUserId: userId,
            });
            setMessage('Course added successfully!');
            setTimeout(() => navigateTo('allCourses'), 1500);
        } catch (error) {
            console.error("Error adding course:", error);
            setMessage('Failed to add course.');
        } finally {
            setLoading(false);
            setShowParEntryModal(false);
        }
    };

    const handleStartParEntry = async () => {
        if (!courseName.trim()) {
            setMessage('Please enter a course name first.');
            return;
        }
        setLoading(true);
        const q = query(collection(db, `artifacts/${appId}/public/data/golf_courses`), where('name', '==', courseName.trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            setMessage('A course with this name already exists.');
            setLoading(false);
            return;
        }
        setTempParValues(Array(18).fill(0));
        setCurrentHoleIndex(0);
        setShowParEntryModal(true);
        setLoading(false);
    };


    return (
        <div className="p-6 flex flex-col h-full min-h-[500px]">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Add New Course</h2>
            <div className="space-y-4 flex-grow">
                <div>
                    <label htmlFor="addCourseName" className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                    <input type="text" id="addCourseName" value={courseName} onChange={(e) => setCourseName(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="e.g., Pine Valley" />
                </div>
                {message && <p className={`text-center text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
            </div>
            <div className="mt-6 space-y-3">
                <button onClick={handleStartParEntry} disabled={loading || !courseName.trim()} className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50">Add Pars for Holes</button>
                <button onClick={() => navigateTo('about')} className="w-full py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg">Back</button>
            </div>

            {showParEntryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                        {currentHoleIndex < 18 ? (
                            <>
                                <h3 className="text-3xl font-bold mb-6">Hole {currentHoleIndex + 1}</h3>
                                <div className="flex justify-center space-x-4 mb-8">
                                    {[3, 4, 5].map(par => <button key={par} onClick={() => handleParSelection(par)} className="w-24 h-24 bg-green-500 hover:bg-green-600 text-white font-extrabold text-2xl rounded-full">Par {par}</button>)}
                                </div>
                                <button onClick={() => setCurrentHoleIndex(Math.max(0, currentHoleIndex - 1))} disabled={currentHoleIndex === 0} className="w-full py-2 bg-gray-300 rounded-lg disabled:opacity-50">Previous hole</button>
								<button onClick={() => navigateTo('about')} className="w-full py-2 bg-red-300 rounded-lg ">Exit</button>
                            </>
                        ) : (
                            <>
                                <h3 className="text-3xl font-bold mb-6">Par Summary</h3>
                                <div className="grid grid-cols-6 gap-2 mb-6">
                                    {tempParValues.map((par, i) => (
                                        <div key={i}>
                                            <label className="text-xs">H{i + 1}</label>
                                            <input type="number" value={par} onChange={(e) => handleParChange(i, e.target.value)} className="w-12 p-1 border rounded text-center" />
                                        </div>
                                    ))}
                                </div>
                                <div className="w-full space-y-3">
                                    <button onClick={handleAddCourseFinal} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg">Confirm & Add</button>
                                    <button onClick={() => setCurrentHoleIndex(17)} className="w-full py-3 bg-gray-400 text-white font-bold rounded-lg">Back to Holes</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

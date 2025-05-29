// Import Firebase
import firebase from 'firebase/app';
import 'firebase/database';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCN_JGTzbOiojCeInn_gqMhWwrwZEA_B9I",
    authDomain: "concurso-cosplay-canto.firebaseapp.com",
    databaseURL: "https://concurso-cosplay-canto-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "concurso-cosplay-canto",
    storageBucket: "concurso-cosplay-canto.firebasestorage.app",
    messagingSenderId: "918535636527",
    appId: "1:918535636527:web:059b9458370b71354d28da"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global variables
let participants = [];
let activeTab = 'cosplay';
let isConnected = true;

// Criteria for each category
const COSPLAY_CRITERIA = ['Originalidad', 'Caracterización', 'Dificultad'];
const SINGING_CRITERIA = ['Técnica vocal', 'Interpretación', 'Presencia escénica'];
const JUDGES_COUNT = 3;

// DOM Elements
const cosplayNameInput = document.getElementById('cosplay-name');
const cosplayCharacterInput = document.getElementById('cosplay-character');
const singingNameInput = document.getElementById('singing-name');
const singingSongInput = document.getElementById('singing-song');
const registerCosplayBtn = document.getElementById('register-cosplay');
const registerSingingBtn = document.getElementById('register-singing');
const cosplayTabBtn = document.getElementById('cosplay-tab-btn');
const singingTabBtn = document.getElementById('singing-tab-btn');
const cosplayTab = document.getElementById('cosplay-tab');
const singingTab = document.getElementById('singing-tab');
const cosplayParticipants = document.getElementById('cosplay-participants');
const singingParticipants = document.getElementById('singing-participants');
const cosplayEmpty = document.getElementById('cosplay-empty');
const singingEmpty = document.getElementById('singing-empty');
const leaderboards = document.getElementById('leaderboards');
const cosplayLeaderboard = document.getElementById('cosplay-leaderboard');
const singingLeaderboard = document.getElementById('singing-leaderboard');
const connectionIndicator = document.getElementById('connection-indicator');
const connectionText = document.getElementById('connection-text');
const cosplayCount = document.getElementById('cosplay-count');
const singingCount = document.getElementById('singing-count');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners
    registerCosplayBtn.addEventListener('click', () => addParticipant('cosplay'));
    registerSingingBtn.addEventListener('click', () => addParticipant('singing'));
    cosplayTabBtn.addEventListener('click', () => switchTab('cosplay'));
    singingTabBtn.addEventListener('click', () => switchTab('singing'));
    
    // Show loading indicator
    showLoading();
    
    // Initialize Firebase listeners
    initializeFirebase();
});

// Show loading indicator
function showLoading() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loadingOverlay);
}

// Hide loading indicator
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

// Initialize Firebase listeners
function initializeFirebase() {
    const participantsRef = database.ref('participants');
    
    // Listen for changes in real-time
    participantsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            participants = Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));
        } else {
            participants = [];
        }
        
        updateDisplay();
        hideLoading();
        updateConnectionStatus(true);
    }, (error) => {
        console.error('Error connecting to Firebase:', error);
        updateConnectionStatus(false);
        loadFromLocalStorage();
        hideLoading();
    });
    
    // Monitor connection state
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            updateConnectionStatus(true);
        } else {
            updateConnectionStatus(false);
        }
    });
}

// Update connection status indicator
function updateConnectionStatus(connected) {
    isConnected = connected;
    
    if (connected) {
        connectionIndicator.className = 'connected';
        connectionIndicator.innerHTML = '<i class="fas fa-wifi"></i>';
        connectionText.textContent = 'Conectado - Datos sincronizados en tiempo real';
    } else {
        connectionIndicator.className = 'disconnected';
        connectionIndicator.innerHTML = '<i class="fas fa-wifi-slash"></i>';
        connectionText.textContent = 'Sin conexión - Trabajando en modo local';
    }
}

// Fallback to localStorage if Firebase fails
function loadFromLocalStorage() {
    const saved = localStorage.getItem('contestParticipants');
    if (saved) {
        participants = JSON.parse(saved);
        updateDisplay();
    }
}

// Save to localStorage as backup
function saveToLocalStorage() {
    if (participants.length > 0) {
        localStorage.setItem('contestParticipants', JSON.stringify(participants));
    }
}

// Add a new participant
async function addParticipant(category) {
    let name, details;
    
    if (category === 'cosplay') {
        name = cosplayNameInput.value.trim();
        details = cosplayCharacterInput.value.trim();
    } else {
        name = singingNameInput.value.trim();
        details = singingSongInput.value.trim();
    }
    
    if (!name || !details) {
        alert('Por favor, completa todos los campos');
        return;
    }
    
    // Create judges array with empty scores
    const judges = Array.from({ length: JUDGES_COUNT }, (_, index) => ({
        id: index + 1,
        scores: [0, 0, 0],
        average: 0
    }));
    
    const newParticipant = {
        name: name,
        category: category,
        details: details,
        judges: judges,
        finalAverage: 0,
        timestamp: Date.now()
    };
    
    try {
        if (isConnected) {
            // Add to Firebase
            await database.ref('participants').push(newParticipant);
        } else {
            // Fallback to local storage
            const localParticipant = {
                ...newParticipant,
                id: Date.now().toString()
            };
            participants.push(localParticipant);
            saveToLocalStorage();
            updateDisplay();
        }
        
        // Clear form
        if (category === 'cosplay') {
            cosplayNameInput.value = '';
            cosplayCharacterInput.value = '';
        } else {
            singingNameInput.value = '';
            singingSongInput.value = '';
        }
    } catch (error) {
        console.error('Error adding participant:', error);
        alert('Error al añadir participante. Intenta de nuevo.');
    }
}

// Update score for a specific judge and criterion
async function updateScore(participantId, judgeIndex, criterionIndex, value) {
    try {
        // Find participant
        const participant = participants.find(p => p.id === participantId);
        if (!participant) return;
        
        // Update the specific score
        const updatedParticipant = { ...participant };
        const updatedJudges = [...participant.judges];
        const updatedJudge = { ...updatedJudges[judgeIndex] };
        const updatedScores = [...updatedJudge.scores];
        updatedScores[criterionIndex] = parseFloat(value) || 0;
        
        // Calculate judge average
        const judgeAverage = updatedScores.reduce((sum, score) => sum + score, 0) / updatedScores.length;
        updatedJudge.scores = updatedScores;
        updatedJudge.average = judgeAverage;
        updatedJudges[judgeIndex] = updatedJudge;
        
        // Calculate final average from all judges
        const finalAverage = updatedJudges.reduce((sum, judge) => sum + judge.average, 0) / JUDGES_COUNT;
        updatedParticipant.judges = updatedJudges;
        updatedParticipant.finalAverage = finalAverage;
        
        if (isConnected) {
            // Update in Firebase
            await database.ref(`participants/${participantId}`).set(updatedParticipant);
        } else {
            // Update locally
            participants = participants.map(p => p.id === participantId ? updatedParticipant : p);
            saveToLocalStorage();
            updateDisplay();
        }
    } catch (error) {
        console.error('Error updating score:', error);
        alert('Error al actualizar puntuación. Intenta de nuevo.');
    }
}

// Remove a participant
async function removeParticipant(participantId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este participante?')) return;
    
    try {
        if (isConnected) {
            // Remove from Firebase
            await database.ref(`participants/${participantId}`).remove();
        } else {
            // Remove locally
            participants = participants.filter(p => p.id !== participantId);
            saveToLocalStorage();
            updateDisplay();
        }
    } catch (error) {
        console.error('Error removing participant:', error);
        alert('Error al eliminar participante. Intenta de nuevo.');
    }
}

// Switch between tabs
function switchTab(tab) {
    activeTab = tab;
    
    // Update tab buttons
    cosplayTabBtn.classList.toggle('active', tab === 'cosplay');
    singingTabBtn.classList.toggle('active', tab === 'singing');
    
    // Update tab content
    cosplayTab.classList.toggle('active', tab === 'cosplay');
    singingTab.classList.toggle('active', tab === 'singing');
}

// Switch judge for a participant
function switchJudge(participantId, judgeIndex) {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    // Update active judge buttons
    const card = document.querySelector(`[data-participant-id="${participantId}"]`);
    const judgeButtons = card.querySelectorAll('.judge-btn');
    judgeButtons.forEach((btn, index) => {
        btn.classList.toggle('active', index === judgeIndex);
    });
    
    // Update scoring inputs
    const criteria = participant.category === 'cosplay' ? COSPLAY_CRITERIA : SINGING_CRITERIA;
    criteria.forEach((criterion, criterionIndex) => {
        criteria.forEach((_, cIndex) => {
            for (let j = 0; j < JUDGES_COUNT; j++) {
                const input = card.querySelector(`#score-${participantId}-${j}-${cIndex}`);
                if (input) {
                    input.style.display = j === judgeIndex ? 'block' : 'none';
                }
            }
        });
    });
    
    updateParticipantScoreDisplay(participantId, judgeIndex);
}

// Update participant score display
function updateParticipantScoreDisplay(participantId, activeJudgeIndex) {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    const card = document.querySelector(`[data-participant-id="${participantId}"]`);
    
    // Update judge score display
    const judgeScoreElement = card.querySelector('.judge-score');
    if (judgeScoreElement) {
        const judgeAverage = participant.judges[activeJudgeIndex].average;
        judgeScoreElement.innerHTML = `
            <i class="fas fa-user"></i>
            Puntuación Juez ${activeJudgeIndex + 1}: ${judgeAverage.toFixed(2)}
        `;
    }
    
    // Update final score display
    const finalScoreElement = card.querySelector('.final-score-value');
    if (finalScoreElement && participant.finalAverage > 0) {
        finalScoreElement.innerHTML = `
            <i class="fas fa-star"></i>
            Puntuación Final: ${participant.finalAverage.toFixed(2)}
        `;
    }
}

// Get top participants for leaderboard
function getTopParticipants(category) {
    return participants
        .filter(p => p.category === category && p.finalAverage > 0)
        .sort((a, b) => b.finalAverage - a.finalAverage)
        .slice(0, 3);
}

// Get participants by category
function getCategoryParticipants(category) {
    return participants.filter(p => p.category === category);
}

// Update the entire display
function updateDisplay() {
    updateLeaderboards();
    updateParticipantsList();
    updateEmptyStates();
    updateCounters();
}

// Update counters
function updateCounters() {
    const cosplayParticipantsCount = getCategoryParticipants('cosplay').length;
    const singingParticipantsCount = getCategoryParticipants('singing').length;
    
    cosplayCount.textContent = `(${cosplayParticipantsCount})`;
    singingCount.textContent = `(${singingParticipantsCount})`;
}

// Update leaderboards
function updateLeaderboards() {
    const cosplayTop = getTopParticipants('cosplay');
    const singingTop = getTopParticipants('singing');
    
    if (cosplayTop.length > 0 || singingTop.length > 0) {
        leaderboards.style.display = 'grid';
        
        // Update cosplay leaderboard
        cosplayLeaderboard.innerHTML = cosplayTop.map((participant, index) => `
            <div class="leaderboard-item">
                <div class="leaderboard-left">
                    <span class="position-badge ${index === 0 ? 'first' : ''}">${index + 1}°</span>
                    <span>${participant.name}</span>
                </div>
                <div class="score">
                    <i class="fas fa-star"></i>
                    <span>${participant.finalAverage.toFixed(2)}</span>
                </div>
            </div>
        `).join('');
        
        // Update singing leaderboard
        singingLeaderboard.innerHTML = singingTop.map((participant, index) => `
            <div class="leaderboard-item">
                <div class="leaderboard-left">
                    <span class="position-badge ${index === 0 ? 'first' : ''}">${index + 1}°</span>
                    <span>${participant.name}</span>
                </div>
                <div class="score">
                    <i class="fas fa-star"></i>
                    <span>${participant.finalAverage.toFixed(2)}</span>
                </div>
            </div>
        `).join('');
    } else {
        leaderboards.style.display = 'none';
    }
}

// Update participants lists
function updateParticipantsList() {
    updateCategoryParticipants('cosplay');
    updateCategoryParticipants('singing');
}

// Update participants for a specific category
function updateCategoryParticipants(category) {
    const categoryParticipants = getCategoryParticipants(category);
    const container = category === 'cosplay' ? cosplayParticipants : singingParticipants;
    
    container.innerHTML = categoryParticipants.map(participant => 
        createParticipantCard(participant)
    ).join('');
    
    // Add event listeners for judge buttons
    categoryParticipants.forEach(participant => {
        const card = document.querySelector(`[data-participant-id="${participant.id}"]`);
        if (card) {
            const judgeButtons = card.querySelectorAll('.judge-btn');
            judgeButtons.forEach((btn, index) => {
                btn.addEventListener('click', () => switchJudge(participant.id, index));
            });
            
            // Initialize first judge as active
            switchJudge(participant.id, 0);
        }
    });
}

// Create participant card HTML
function createParticipantCard(participant) {
    const criteria = participant.category === 'cosplay' ? COSPLAY_CRITERIA : SINGING_CRITERIA;
    const categoryClass = participant.category;
    
    return `
        <div class="participant-card" data-participant-id="${participant.id}">
            <div class="participant-header ${categoryClass}">
                <div>
                    <div class="participant-title">
                        <i class="fas fa-${participant.category === 'cosplay' ? 'palette' : 'music'}"></i>
                        ${participant.category === 'cosplay' ? 'Cosplay' : 'Canto'} - ${participant.name}
                    </div>
                    <div class="participant-details">
                        <strong>${participant.category === 'cosplay' ? 'Personaje:' : 'Canción:'}</strong> ${participant.details}
                    </div>
                </div>
                <button class="delete-btn" onclick="removeParticipant('${participant.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="participant-content">
                <!-- Judge Selector -->
                <div class="judge-selector">
                    <label>Seleccionar Juez</label>
                    <div class="judge-buttons">
                        ${participant.judges.map((judge, index) => `
                            <button class="judge-btn ${index === 0 ? 'active' : ''}">
                                <i class="fas fa-user"></i>
                                Juez ${judge.id}
                                ${judge.average > 0 ? `(${judge.average.toFixed(2)})` : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Scoring Grid -->
                <div class="scoring-grid">
                    ${criteria.map((criterion, criterionIndex) => `
                        <div class="score-input-group">
                            <label>${criterion} (1-10)</label>
                            ${participant.judges.map((judge, judgeIndex) => `
                                <input type="number" 
                                       id="score-${participant.id}-${judgeIndex}-${criterionIndex}"
                                       min="1" max="10" 
                                       value="${judge.scores[criterionIndex] || ''}"
                                       style="display: ${judgeIndex === 0 ? 'block' : 'none'}"
                                       onchange="updateScore('${participant.id}', ${judgeIndex}, ${criterionIndex}, this.value)">
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
                
                <!-- Judge Score Display -->
                ${participant.judges[0].average > 0 ? `
                    <div class="score-display judge-score">
                        <i class="fas fa-user"></i>
                        Puntuación Juez 1: ${participant.judges[0].average.toFixed(2)}
                    </div>
                ` : ''}
                
                <!-- Final Score Display -->
                ${participant.finalAverage > 0 ? `
                    <div class="final-score">
                        <div class="score-value final-score-value">
                            <i class="fas fa-star"></i>
                            Puntuación Final: ${participant.finalAverage.toFixed(2)}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Update empty states
function updateEmptyStates() {
    const cosplayParticipantsCount = getCategoryParticipants('cosplay').length;
    const singingParticipantsCount = getCategoryParticipants('singing').length;
    
    cosplayEmpty.style.display = cosplayParticipantsCount === 0 ? 'block' : 'none';
    singingEmpty.style.display = singingParticipantsCount === 0 ? 'block' : 'none';
}

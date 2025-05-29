// Global variables
let participants = [];
let activeTab = 'cosplay';

// Criteria for each category
const COSPLAY_CRITERIA = ['Originalidad', 'Caracterización', 'Dificultad'];
const SINGING_CRITERIA = ['Técnica vocal', 'Interpretación', 'Presencia escénica'];
const JUDGES_COUNT = 3;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadParticipants();
    updateDisplay();
});

// Load participants from localStorage
function loadParticipants() {
    const saved = localStorage.getItem('contestParticipants');
    if (saved) {
        participants = JSON.parse(saved);
    }
}

// Save participants to localStorage
function saveParticipants() {
    localStorage.setItem('contestParticipants', JSON.stringify(participants));
}

// Add a new participant
function addParticipant(category) {
    const nameInput = document.getElementById(`${category}-name`);
    const detailInput = document.getElementById(category === 'cosplay' ? 'cosplay-character' : 'singing-song');
    
    const name = nameInput.value.trim();
    const details = detailInput.value.trim();
    
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
        id: Date.now().toString(),
        name: name,
        category: category,
        details: details,
        judges: judges,
        finalAverage: 0
    };
    
    participants.push(newParticipant);
    
    // Clear form
    nameInput.value = '';
    detailInput.value = '';
    
    saveParticipants();
    updateDisplay();
}

// Remove a participant
function removeParticipant(participantId) {
    if (confirm('¿Estás seguro de que quieres eliminar este participante?')) {
        participants = participants.filter(p => p.id !== participantId);
        saveParticipants();
        updateDisplay();
    }
}

// Update score for a specific judge and criterion
function updateScore(participantId, judgeIndex, criterionIndex, value) {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    // Update the specific score
    participant.judges[judgeIndex].scores[criterionIndex] = parseFloat(value) || 0;
    
    // Calculate judge average
    const judgeScores = participant.judges[judgeIndex].scores;
    const judgeAverage = judgeScores.reduce((sum, score) => sum + score, 0) / judgeScores.length;
    participant.judges[judgeIndex].average = judgeAverage;
    
    // Calculate final average from all judges
    const finalAverage = participant.judges.reduce((sum, judge) => sum + judge.average, 0) / JUDGES_COUNT;
    participant.finalAverage = finalAverage;
    
    saveParticipants();
    updateDisplay();
}

// Switch between tabs
function switchTab(tab) {
    activeTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');
}

// Switch judge for a participant
function switchJudge(participantId, judgeIndex) {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    // Update active judge buttons
    const card = document.querySelector(`[data-participant-id="${participantId}"]`);
    card.querySelectorAll('.judge-btn').forEach(btn => btn.classList.remove('active'));
    card.querySelector(`[onclick="switchJudge('${participantId}', ${judgeIndex})"]`).classList.add('active');
    
    // Update scoring inputs
    const criteria = participant.category === 'cosplay' ? COSPLAY_CRITERIA : SINGING_CRITERIA;
    criteria.forEach((criterion, criterionIndex) => {
        const input = card.querySelector(`#score-${participantId}-${judgeIndex}-${criterionIndex}`);
        if (input) {
            input.style.display = 'block';
        }
    });
    
    // Hide other judge inputs
    for (let i = 0; i < JUDGES_COUNT; i++) {
        if (i !== judgeIndex) {
            criteria.forEach((criterion, criterionIndex) => {
                const input = card.querySelector(`#score-${participantId}-${i}-${criterionIndex}`);
                if (input) {
                    input.style.display = 'none';
                }
            });
        }
    }
    
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

// Update the entire display
function updateDisplay() {
    updateLeaderboards();
    updateParticipantsList();
    updateEmptyStates();
}

// Update leaderboards
function updateLeaderboards() {
    const cosplayTop = getTopParticipants('cosplay');
    const singingTop = getTopParticipants('singing');
    
    const leaderboards = document.getElementById('leaderboards');
    
    if (cosplayTop.length > 0 || singingTop.length > 0) {
        leaderboards.style.display = 'grid';
        
        // Update cosplay leaderboard
        const cosplayLeaderboard = document.getElementById('cosplay-leaderboard');
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
        const singingLeaderboard = document.getElementById('singing-leaderboard');
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
    const categoryParticipants = participants.filter(p => p.category === category);
    const container = document.getElementById(`${category}-participants`);
    
    container.innerHTML = categoryParticipants.map(participant => 
        createParticipantCard(participant)
    ).join('');
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
                            <button class="judge-btn ${index === 0 ? 'active' : ''}" 
                                    onclick="switchJudge('${participant.id}', ${index})">
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
    const cosplayParticipants = participants.filter(p => p.category === 'cosplay');
    const singingParticipants = participants.filter(p => p.category === 'singing');
    
    document.getElementById('cosplay-empty').style.display = cosplayParticipants.length === 0 ? 'block' : 'none';
    document.getElementById('singing-empty').style.display = singingParticipants.length === 0 ? 'block' : 'none';
}
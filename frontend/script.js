let boardSize = 10;
let selectedAmountOfMines = 10;
let grid = [];
let isGameOver = false;
let revealedCellsCount = 0;
let gameStartTime = 0;
let timerInterval = null;
let currentGameTime = 0.0;
let gameWon = false;
let isScoreSaved = false;
let firstClickMade = false;

const board = document.getElementById("board");


const API_BASE_URL = window.location.origin + '/api';


const timerElement = document.createElement("div");
timerElement.className = "timer";
timerElement.textContent = "Время: 0 сек";
document.querySelector(".control-panel").appendChild(timerElement);


document.getElementById("startGame").addEventListener("click", () => {
    const size = parseInt(document.getElementById("boardSize").value);
    const mines = parseInt(document.getElementById("mineCount").value);

    if (size < 5 || size > 20) {
        return;
    }

    const maxMines = size * size - 9;
    if (mines < 1 || mines > maxMines) {
        return;
    }

    boardSize = size;
    selectedAmountOfMines = mines;
    startGame();
});

document.getElementById("saveScore").addEventListener("click", saveScore);


document.addEventListener("DOMContentLoaded", loadLeaderboard);


const authManager = {
    sessionId: localStorage.getItem('sessionId'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),

    isAuthenticated() {
        return !!this.sessionId && !!this.user;
    },

    async login(username, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            this.sessionId = data.sessionId;
            this.user = data.user;

            localStorage.setItem('sessionId', this.sessionId);
            localStorage.setItem('user', JSON.stringify(this.user));

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async register(username, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            this.sessionId = data.sessionId;
            this.user = data.user;

            localStorage.setItem('sessionId', this.sessionId);
            localStorage.setItem('user', JSON.stringify(this.user));

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async logout() {
        if (this.sessionId) {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: this.sessionId })
            });
        }

        this.sessionId = null;
        this.user = null;
        localStorage.removeItem('sessionId');
        localStorage.removeItem('user');
    },

    async checkAuth() {
        if (!this.sessionId) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/check?sessionId=${this.sessionId}`);
            const data = await response.json();

            if (data.authenticated) {
                this.user = data.user;
                localStorage.setItem('user', JSON.stringify(this.user));
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            return false;
        }
    }
};


function startGame() {
    isGameOver = false;
    gameWon = false;
    revealedCellsCount = 0;
    firstClickMade = false;
    grid = [];
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${boardSize}, 30px)`;

    isScoreSaved = false;

    stopTimer();
    currentGameTime = 0.0;
    timerElement.textContent = "Время: 0 сек";

    createBoard();
}

function startTimer() {
    gameStartTime = Date.now();
    timerInterval = setInterval(() => {
        currentGameTime = (Date.now() - gameStartTime) / 1000;
        timerElement.textContent = `Время: ${currentGameTime.toFixed(3)} сек`;
    }, 10);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function createBoard() {
    for (let row = 0; row < boardSize; row++) {
        const rowArr = [];
        for (let col = 0; col < boardSize; col++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");

            const cellData = {
                element: cell,
                row: row,
                col: col,
                isMine: false,
                mineCount: 0,
                isRevealed: false,
                isFlagged: false,
            }

            cell.addEventListener("click", (e) => {
                if (cellData.isRevealed && cellData.mineCount > 0) {
                    quickRevealNeighbors(cellData);
                    return;
                }
                if (!cellData.isRevealed) {
                    revealCell(cellData);
                }
            });

            cell.addEventListener("dblclick", (e) => {
                e.preventDefault();
                if (cellData.isRevealed && cellData.mineCount > 0) {
                    quickRevealNeighbors(cellData);
                }
            });

            cell.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                toggleFlag(cellData);
            });

            rowArr.push(cellData);
            board.appendChild(cell);
        }
        grid.push(rowArr);
    }
}

function placeMines(firstClickRow, firstClickCol) {
    const availablePositions = [];

    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const isNearFirstClick = Math.abs(row - firstClickRow) <= 1 &&
                Math.abs(col - firstClickCol) <= 1;

            if (!isNearFirstClick) {
                availablePositions.push({ row, col });
            }
        }
    }

    if (availablePositions.length < selectedAmountOfMines) {
        console.error('Недостаточно позиций для размещения мин');
        return;
    }

    for (let i = availablePositions.length - 1; i > 0 && selectedAmountOfMines > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
    }

    for (let i = 0; i < selectedAmountOfMines; i++) {
        const { row, col } = availablePositions[i];
        grid[row][col].isMine = true;
    }
}

function calculateNeighbours() {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const cellData = grid[row][col];

            if (cellData.isMine) {
                continue;
            }

            let mineCount = 0;
            for (let r = -1; r <= 1; r++) {
                for (let c = -1; c <= 1; c++) {
                    if (r === 0 && c === 0) continue;

                    const newRow = row + r;
                    const newCol = col + c;

                    if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
                        if (grid[newRow][newCol].isMine) {
                            mineCount++;
                        }
                    }
                }
            }
            cellData.mineCount = mineCount;
        }
    }
}

function revealCell(cellData) {
    if (isGameOver || cellData.isRevealed || cellData.isFlagged) {
        return;
    }

    if (!firstClickMade) {
        placeMines(cellData.row, cellData.col);
        calculateNeighbours();
        startTimer();
        firstClickMade = true;
    }

    const cell = cellData.element;

    cellData.isRevealed = true;
    revealedCellsCount++;
    cell.classList.add('revealed');

    if (cellData.isMine) {
        isGameOver = true;
        gameWon = false;
        stopTimer();
        revealAllMines();
        cell.classList.add('mine-exploded');
        return;
    }

    if (cellData.mineCount > 0) {
        cell.textContent = cellData.mineCount;
        cell.classList.add(`number-${cellData.mineCount}`);
    } else {
        revealNeighborsIterative(cellData.row, cellData.col);
    }

    checkWinCondition();
}

function checkWinCondition() {
    const totalSafeCells = boardSize * boardSize - selectedAmountOfMines;
    if (revealedCellsCount === totalSafeCells) {
        isGameOver = true;
        gameWon = true;
        stopTimer();

        markAllMinesAsFlagged();
    }
}

function revealAllMines() {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const cellData = grid[row][col];

            if (cellData.isMine) {
                cellData.isRevealed = true;
                cellData.element.classList.add("revealed");
                cellData.element.classList.add("mine");

                if (!cellData.isFlagged) {
                    cellData.element.classList.add("mine-wrong");
                }
            } else if (cellData.isFlagged && !cellData.isMine) {
                cellData.element.classList.add("flag-wrong");
            }
        }
    }
}

function markAllMinesAsFlagged() {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const cellData = grid[row][col];

            if (cellData.isMine && !cellData.isFlagged) {
                cellData.isFlagged = true;
                cellData.element.classList.add("flagged");
            }
        }
    }
}

function revealNeighborsIterative(startRow, startCol) {
    const queue = [{ row: startRow, col: startCol }];
    const processed = new Set();

    while (queue.length > 0) {
        const { row, col } = queue.shift();
        const key = `${row},${col}`;

        if (processed.has(key)) continue;
        processed.add(key);

        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                if (r === 0 && c === 0) continue;

                const newRow = row + r;
                const newCol = col + c;

                if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
                    continue;
                }

                const neighbor = grid[newRow][newCol];
                const neighborKey = `${newRow},${newCol}`;

                if (processed.has(neighborKey) || neighbor.isRevealed || neighbor.isMine) {
                    continue;
                }

                if (neighbor.isFlagged) {
                    neighbor.isFlagged = false;
                    neighbor.element.classList.remove('flagged');
                }

                neighbor.isRevealed = true;
                neighbor.element.classList.add('revealed');
                revealedCellsCount++;

                if (neighbor.mineCount === 0) {
                    queue.push({ row: newRow, col: newCol });
                } else {
                    neighbor.element.textContent = neighbor.mineCount;
                    neighbor.element.classList.add(`number-${neighbor.mineCount}`);
                }
            }
        }
    }
}

function toggleFlag(cellData) {
    if (isGameOver || cellData.isRevealed) {
        return;
    }

    cellData.isFlagged = !cellData.isFlagged;
    cellData.element.classList.toggle('flagged');
}

function quickRevealNeighbors(cellData) {
    if (isGameOver || !cellData.isRevealed || cellData.mineCount === 0) {
        return;
    }

    let flaggedCount = 0;
    const neighbors = [];

    for (let r = -1; r <= 1; r++) {
        for (let c = -1; c <= 1; c++) {
            if (r === 0 && c === 0) continue;

            const newRow = cellData.row + r;
            const newCol = cellData.col + c;

            if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
                const neighbor = grid[newRow][newCol];
                neighbors.push(neighbor);

                if (neighbor.isFlagged) {
                    flaggedCount++;
                }
            }
        }
    }

    if (flaggedCount === cellData.mineCount) {
        neighbors.forEach(neighbor => {
            if (!neighbor.isRevealed && !neighbor.isFlagged) {
                revealCell(neighbor);
            }
        });
    }
}

async function saveScoreToServer(score) {
    try {
        const response = await fetch(`${API_BASE_URL}/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(score)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error saving score:', error);
        throw error;
    }
}

async function loadLeaderboardFromServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/scores/top?limit=20`);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return await response.json();
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        throw error;
    }
}

async function saveScore() {
    const playerName = document.getElementById("playerName").textContent.trim();

    if (!playerName || playerName === "---") {
        return;
    }

    if (!gameWon) {
        return;
    }

    if (isScoreSaved) {
        return;
    }

    if (currentGameTime === 0) {
        return;
    }

    const score = {
        player_name: playerName,
        time_seconds: parseFloat(currentGameTime.toFixed(3)),
        board_size: boardSize,
        mines_count: selectedAmountOfMines,
        difficulty: calculateDifficulty()
    };

    try {
        await saveScoreToServer(score);
        await loadLeaderboard();
        isScoreSaved = true;
    } catch (error) {
        console.error('Failed to save score to server:', error);
        alert('Не удалось сохранить результат на сервере');
    }
}

function calculateDifficulty() {
    const totalCells = boardSize * boardSize;
    const minePercentage = (selectedAmountOfMines / totalCells) * 100;

    if (minePercentage < 10) return "Легко";
    if (minePercentage < 20) return "Средне";
    return "Сложно";
}

async function loadLeaderboard() {
    try {
        const leaderboard = await loadLeaderboardFromServer();
        displayLeaderboard(leaderboard);
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        displayLeaderboard([]);
    }
}

function displayLeaderboard(scores) {
    const leaderboardBody = document.getElementById("leaderboardBody");

    leaderboardBody.innerHTML = '';

    if (!scores || scores.length === 0) {
        leaderboardBody.innerHTML = `
            <div class="main-container" style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #888;">
                Пока нет результатов. Будьте первым!
            </div>
        `;
        return;
    }

    scores.forEach((score, index) => {
        const row = document.createElement("div");
        row.className = "leaderboard-row";

        let timeValue;

        if (score.time_seconds !== undefined && score.time_seconds !== null) {
            timeValue = parseFloat(score.time_seconds);
        } else if (score.time !== undefined && score.time !== null) {

            timeValue = parseFloat(score.time);
        } else {
            timeValue = 0;
        }

        const timeFormatted = timeValue.toFixed(3);

        row.innerHTML = `
            <span class="leaderboard-place">${index + 1}</span>
            <span class="leaderboard-name">${score.player_name || score.name || 'Игрок'}</span>
            <span class="leaderboard-time">${timeFormatted} сек</span>
            <span>${score.board_size || score.boardSize || 10}×${score.board_size || score.boardSize || 10}</span>
            <span class="leaderboard-difficulty">${score.difficulty || 'Средне'}</span>
        `;
        leaderboardBody.appendChild(row);
    });
}




async function checkServerConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.ok;
    } catch (error) {
        return false;
    }
}


async function initAuth() {
    if (authManager.sessionId) {
        const isAuthenticated = await authManager.checkAuth();
        updateAuthUI(isAuthenticated);
    } else {
        updateAuthUI(false);
    }

    setupAuthModals();
}

function updateAuthUI(isAuthenticated) {
    const authSection = document.getElementById('authSection');
    const userSection = document.getElementById('userSection');
    const userGreeting = document.getElementById('userGreeting');
    const playerNameInput = document.getElementById('playerName');

    if (isAuthenticated) {
        authSection.style.display = 'none';
        userSection.style.display = 'block';
        userGreeting.textContent = `Привет, ${authManager.user.username}`;

        if (playerNameInput) {
            playerNameInput.textContent = authManager.user.username;
        }
    } else {
        authSection.style.display = 'block';
        userSection.style.display = 'none';
        if (playerNameInput) {
            playerNameInput.textContent = "---";
        }
    }
}

function setupAuthModals() {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const closeButtons = document.querySelectorAll('.close');

    function clearAuthFields() {
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerPassword').value = '';

        const loginMessage = document.getElementById('loginMessage');
        const registerMessage = document.getElementById('registerMessage');

        loginMessage.textContent = '';
        loginMessage.className = '';
        registerMessage.textContent = '';
        registerMessage.className = '';
    }

    showLoginBtn.addEventListener('click', () => {
        clearAuthFields();
        loginModal.style.display = 'block';
    });

    showRegisterBtn.addEventListener('click', () => {
        clearAuthFields();
        registerModal.style.display = 'block';
    });

    logoutBtn.addEventListener('click', async () => {
        await authManager.logout();
        updateAuthUI(false);
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
            clearAuthFields();
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            loginModal.style.display = 'none';
            clearAuthFields();
        }
        if (event.target === registerModal) {
            registerModal.style.display = 'none';
            clearAuthFields();
        }
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const messageElement = document.getElementById('loginMessage');

        const result = await authManager.login(username, password);

        if (result.success) {
            messageElement.textContent = 'Вход выполнен успешно!';
            messageElement.className = 'message-success';
            updateAuthUI(true);

            setTimeout(() => {
                loginModal.style.display = 'none';
                clearAuthFields();
            }, 1500);
        } else {
            messageElement.textContent = result.error;
            messageElement.className = 'message-error';
        }
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const messageElement = document.getElementById('registerMessage');

        const result = await authManager.register(username, password);

        if (result.success) {
            messageElement.textContent = 'Регистрация выполнена успешно!';
            messageElement.className = 'message-success';
            updateAuthUI(true);

            setTimeout(() => {
                registerModal.style.display = 'none';
                clearAuthFields();
            }, 1500);
        } else {
            messageElement.textContent = result.error;
            messageElement.className = 'message-error';
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
            clearAuthFields();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    await loadLeaderboard();
});
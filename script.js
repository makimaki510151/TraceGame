document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-button');
    const gameArea = document.getElementById('game-area');
    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('high-score');
    const timeElement = document.getElementById('time');
    const volumeSlider = document.getElementById('volume-slider');
    
    const GAME_DURATION = 15;
    let score = 0;
    let highScore = localStorage.getItem('highScore') || 0;
    let timeRemaining = GAME_DURATION;
    let isGameRunning = false;
    let timerInterval;

    let audioContext;
    let gainNode;

    // ページロード時に最高スコアと音量を設定
    highScoreElement.textContent = highScore;
    const savedVolume = localStorage.getItem('gameVolume');
    if (savedVolume !== null) {
        volumeSlider.value = savedVolume;
    }

    // ゲーム開始ボタンの初回クリック時にAudioContextを初期化
    // 自動再生ポリシーのため、ユーザー操作後に初期化を行う
    startButton.addEventListener('click', () => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = volumeSlider.value;
        }
        startGame();
    });
    
    // 音量スライダーの変更を監視
    volumeSlider.addEventListener('input', () => {
        if (gainNode) {
            gainNode.gain.value = volumeSlider.value;
        }
        localStorage.setItem('gameVolume', volumeSlider.value);
    });

    function startGame() {
        if (isGameRunning) return;
        isGameRunning = true;
        score = 0;
        timeRemaining = GAME_DURATION;
        scoreElement.textContent = score;
        timeElement.textContent = timeRemaining;
        gameArea.innerHTML = '';
        
        createBall();

        timerInterval = setInterval(() => {
            timeRemaining--;
            timeElement.textContent = timeRemaining;
            if (timeRemaining <= 0) {
                endGame();
            }
        }, 1000);
    }

    function endGame() {
        clearInterval(timerInterval);
        isGameRunning = false;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
            highScoreElement.textContent = highScore;
            gameArea.innerHTML = `<p>ゲーム終了！</p><p>新記録達成！</p><p>あなたのスコアは ${score} 点です！</p><button id="start-button">もう一度</button>`;
        } else {
            gameArea.innerHTML = `<p>ゲーム終了！</p><p>あなたのスコアは ${score} 点です！</p><button id="start-button">もう一度</button>`;
        }
        
        document.getElementById('start-button').addEventListener('click', startGame);
    }

    function createBall() {
        const ball = document.createElement('div');
        ball.className = 'ball';
        const ballSize = 25;
        ball.style.width = `${ballSize}px`;
        ball.style.height = `${ballSize}px`;

        const gameAreaRect = gameArea.getBoundingClientRect();
        const maxX = gameAreaRect.width - ballSize;
        const maxY = gameAreaRect.height - ballSize;

        const randomX = Math.floor(Math.random() * maxX);
        const randomY = Math.floor(Math.random() * maxY);

        ball.style.left = `${randomX}px`;
        ball.style.top = `${randomY}px`;

        gameArea.appendChild(ball);
    }

    let lastMouseX = 0;
    let lastMouseY = 0;

    gameArea.addEventListener('mousemove', (e) => {
        if (!isGameRunning) return;

        const currentMouseX = e.clientX - gameArea.getBoundingClientRect().left;
        const currentMouseY = e.clientY - gameArea.getBoundingClientRect().top;

        const balls = document.querySelectorAll('.ball');
        balls.forEach(ball => {
            if (isIntersecting(ball, currentMouseX, currentMouseY, lastMouseX, lastMouseY)) {
                handleBallCollision(ball);
            }
        });

        lastMouseX = currentMouseX;
        lastMouseY = currentMouseY;
    });

    function isIntersecting(ball, currentX, currentY, prevX, prevY) {
        const ballRect = ball.getBoundingClientRect();
        const ballCenterX = ballRect.left + ballRect.width / 2;
        const ballCenterY = ballRect.top + ballRect.height / 2;
        const radius = ballRect.width / 2;

        const gameAreaRect = gameArea.getBoundingClientRect();
        const cursorPoint = {
            x: currentX + gameAreaRect.left,
            y: currentY + gameAreaRect.top
        };

        const prevCursorPoint = {
            x: prevX + gameAreaRect.left,
            y: prevY + gameAreaRect.top
        };

        const dx = cursorPoint.x - ballCenterX;
        const dy = cursorPoint.y - ballCenterY;
        
        if (Math.sqrt(dx * dx + dy * dy) <= radius) {
            return true;
        }

        const line = { p1: prevCursorPoint, p2: cursorPoint };
        const circle = { center: { x: ballCenterX, y: ballCenterY }, radius: radius };
        
        return isLineCircleIntersect(line, circle);
    }
    
    function isLineCircleIntersect(line, circle) {
        const a = (line.p2.x - line.p1.x) ** 2 + (line.p2.y - line.p1.y) ** 2;
        const b = 2 * ((line.p2.x - line.p1.x) * (line.p1.x - circle.center.x) + (line.p2.y - line.p1.y) * (line.p1.y - circle.center.y));
        const c = (line.p1.x - circle.center.x) ** 2 + (line.p1.y - circle.center.y) ** 2 - circle.radius ** 2;
        
        const delta = b * b - 4 * a * c;

        if (delta < 0) {
            return false;
        }
        
        const t1 = (-b + Math.sqrt(delta)) / (2 * a);
        const t2 = (-b - Math.sqrt(delta)) / (2 * a);
        
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
    }
    
    function handleBallCollision(ball) {
        if (!isGameRunning) return;
        score++;
        scoreElement.textContent = score;
        ball.remove();
        
        playTouchSound();
        
        createBall();
        createBall();
    }
    
    function playTouchSound() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNodeForSound = audioContext.createGain();

        // ノイズの代わりに短いサイン波のバーストを使用
        oscillator.type = 'sine';
        oscillator.frequency.value = 1000; // 高めの周波数で「カッ」に近い音に
        
        // ゲインを急激に変化させて短い音を表現
        gainNodeForSound.gain.setValueAtTime(1, audioContext.currentTime);
        gainNodeForSound.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);

        oscillator.connect(gainNodeForSound);
        gainNodeForSound.connect(gainNode); // メインのゲインノードに接続

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05); // 0.05秒で停止
    }
});
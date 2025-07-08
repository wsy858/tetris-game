document.addEventListener('DOMContentLoaded', () => {
    const gameCanvas = document.getElementById('gameCanvas');
    const nextCanvas = document.getElementById('nextCanvas');
    const ctx = gameCanvas.getContext('2d');
    const nextCtx = nextCanvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const linesElement = document.getElementById('lines');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    // 游戏常量
    const BLOCK_SIZE = 30;
    const COLS = 10;
    const ROWS = 20;
    const NEXT_BLOCK_SIZE = 20;

    // 游戏状态
    let score = 0;
    let lines = 0;
    let gameOver = false;
    let paused = false;
    let board = [];
    let currentPiece = null;
    let nextPiece = null;
    let gameLoop = null;
    const FALL_SPEED = 1000; // 毫秒

    // 方块形状和颜色 (I, O, T, L, J, S, Z)
    const SHAPES = [
        [[1, 1, 1, 1]], // I
        [[1, 1], [1, 1]], // O
        [[0, 1, 0], [1, 1, 1]], // T
        [[0, 0, 1], [1, 1, 1]], // L
        [[1, 0, 0], [1, 1, 1]], // J
        [[0, 1, 1], [1, 1, 0]], // S
        [[1, 1, 0], [0, 1, 1]]  // Z
    ];

    const COLORS = [
        '#00FFFF', // Cyan (I)
        '#FFFF00', // Yellow (O)
        '#800080', // Purple (T)
        '#FFA500', // Orange (L)
        '#0000FF', // Blue (J)
        '#00FF00', // Green (S)
        '#FF0000'  // Red (Z)
    ];

    // 初始化游戏板
    function initBoard() {
        board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    }

    // 创建新方块
    function createPiece() {
        const type = Math.floor(Math.random() * SHAPES.length);
        return {
            shape: SHAPES[type],
            color: COLORS[type],
            x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2),
            y: 0
        };
    }

    // 绘制方块
    function drawPiece(ctx, piece, blockSize) {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = piece.color;
                    ctx.fillRect(
                        (piece.x + x) * blockSize,
                        (piece.y + y) * blockSize,
                        blockSize - 1, // -1 为了显示网格线
                        blockSize - 1
                    );
                }
            });
        });
    }

    // 绘制游戏板
    function drawBoard() {
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = value;
                    ctx.fillRect(
                        x * BLOCK_SIZE,
                        y * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
        if (currentPiece) drawPiece(ctx, currentPiece, BLOCK_SIZE);
    }

    // 绘制下一个方块预览
    function drawNextPiece() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        if (nextPiece) {
            // 居中显示下一个方块
            const offsetX = (nextCanvas.width / NEXT_BLOCK_SIZE - nextPiece.shape[0].length) / 2;
            const offsetY = (nextCanvas.height / NEXT_BLOCK_SIZE - nextPiece.shape.length) / 2;
            const tempPiece = { ...nextPiece, x: offsetX, y: offsetY };
            drawPiece(nextCtx, tempPiece, NEXT_BLOCK_SIZE);
        }
    }

    // 检查碰撞
    function checkCollision(piece, dx = 0, dy = 0, rotatedShape = null) {
        const shape = rotatedShape || piece.shape;
        return shape.some((row, y) => {
            return row.some((value, x) => {
                if (value) {
                    const newX = piece.x + x + dx;
                    const newY = piece.y + y + dy;
                    return (
                        newX < 0 || // 左边界
                        newX >= COLS || // 右边界
                        newY >= ROWS || // 下边界
                        (newY >= 0 && board[newY][newX]) // 已有方块
                    );
                }
                return false;
            });
        });
    }

    // 旋转方块
    function rotatePiece() {
        if (!currentPiece || paused || gameOver) return;

        // 转置矩阵并反转每一行（90度顺时针旋转）
        const rotatedShape = currentPiece.shape[0].map((_, index) =>
            currentPiece.shape.map(row => row[index]).reverse()
        );

        // 如果旋转后碰撞，尝试墙踢（简单版）
        if (!checkCollision(currentPiece, 0, 0, rotatedShape)) {
            currentPiece.shape = rotatedShape;
        } else if (!checkCollision(currentPiece, -1, 0, rotatedShape)) {
            currentPiece.x -= 1;
            currentPiece.shape = rotatedShape;
        } else if (!checkCollision(currentPiece, 1, 0, rotatedShape)) {
            currentPiece.x += 1;
            currentPiece.shape = rotatedShape;
        }
        drawBoard();
    }

    // 合并方块到游戏板
    function mergePiece() {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const newY = currentPiece.y + y;
                    const newX = currentPiece.x + x;
                    if (newY < 0) {
                        // 游戏结束
                        gameOver = true;
                        clearInterval(gameLoop);
                        alert('游戏结束！得分: ' + score);
                        return;
                    }
                    board[newY][newX] = currentPiece.color;
                }
            });
        });

        // 检查并清除完整行
        clearLines();

        // 生成下一个方块
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();

        // 检查游戏是否结束
        if (checkCollision(currentPiece)) {
            gameOver = true;
            clearInterval(gameLoop);
            alert('游戏结束！得分: ' + score);
        }
    }

    // 清除完整行
    function clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (board[y].every(cell => cell !== 0)) {
                // 移除完整行并在顶部添加新行
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
                y++; // 检查新移下来的行
                linesCleared++;
            }
        }

        // 更新分数和行数
        if (linesCleared > 0) {
            lines += linesCleared;
            // 分数计算：1行100分，2行300分，3行500分，4行800分
            const lineScores = [0, 100, 300, 500, 800];
            score += lineScores[linesCleared];
            scoreElement.textContent = score;
            linesElement.textContent = lines;
        }
    }

    // 移动方块
    function movePiece(dx, dy) {
        if (!currentPiece || paused || gameOver) return;

        if (!checkCollision(currentPiece, dx, dy)) {
            currentPiece.x += dx;
            currentPiece.y += dy;
            drawBoard();
            return true;
        } else if (dy > 0) {
            // 下移时碰撞，合并方块
            mergePiece();
            return false;
        }
        return false;
    }

    // 硬下落
    function hardDrop() {
        if (!currentPiece || paused || gameOver) return;
        while (movePiece(0, 1)) {}
    }

    // 游戏循环
    function startGameLoop() {
        if (gameLoop) clearInterval(gameLoop);
        gameLoop = setInterval(() => {
            movePiece(0, 1);
        }, FALL_SPEED);
    }

    // 初始化游戏
    function initGame() {
        score = 0;
        lines = 0;
        gameOver = false;
        paused = false;
        scoreElement.textContent = score;
        linesElement.textContent = lines;
        initBoard();
        currentPiece = createPiece();
        nextPiece = createPiece();
        drawNextPiece();
        drawBoard();
        startGameLoop();
    }

    // 事件监听
    document.addEventListener('keydown', (e) => {
        if (gameOver) return;

        switch (e.key) {
            case 'ArrowLeft':
                movePiece(-1, 0);
                break;
            case 'ArrowRight':
                movePiece(1, 0);
                break;
            case 'ArrowDown':
                movePiece(0, 1);
                break;
            case 'ArrowUp':
                rotatePiece();
                break;
            case ' ': // 空格键硬下落
                hardDrop();
                break;
            case 'p': // P键暂停
                togglePause();
                break;
        }
    });

    // 暂停/继续游戏
    function togglePause() {
        if (gameOver) return;
        paused = !paused;
        if (paused) {
            clearInterval(gameLoop);
            pauseBtn.textContent = '继续';
        } else {
            startGameLoop();
            pauseBtn.textContent = '暂停';
        }
    }

    // 按钮事件
    startBtn.addEventListener('click', () => {
        if (!gameOver && !paused) return;
        initGame();
        pauseBtn.textContent = '暂停';
    });

    pauseBtn.addEventListener('click', togglePause);

    resetBtn.addEventListener('click', () => {
        clearInterval(gameLoop);
        initGame();
        pauseBtn.textContent = '暂停';
    });

    // 初始化游戏
    initGame();
});
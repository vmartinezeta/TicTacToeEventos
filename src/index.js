import EventEmitter from 'events';
import readline from 'readline';


class TicTacToe extends EventEmitter {
    constructor() {
        super();
        this.board = Array(3).fill(null).map(() => Array(3).fill(' '));
        this.currentPlayer = 'X';
        this.gameOver = false;
    }

    printBoard() {
        console.log('\n  0   1   2');
        for (let i = 0; i < 3; i++) {
            console.log(`${i} ${this.board[i].join(' | ')}`);
            if (i < 2) console.log(' -----------');
        }
        console.log('\n');
    }

    makeMove(row, col) {
        if (this.gameOver) {
            this.emit('gameOver', 'El juego ya terminó');
            return;
        }

        if (row < 0 || row > 2 || col < 0 || col > 2) {
            this.emit('invalidMove', 'Movimiento fuera de los límites');
            return;
        }

        if (this.board[row][col] !== ' ') {
            this.emit('invalidMove', 'Casilla ya ocupada');
            return;
        }

        this.board[row][col] = this.currentPlayer;
        this.printBoard();

        // Verificar si hay ganador o empate
        if (this.checkWin()) {
            this.gameOver = true;
            this.emit('win', this.currentPlayer);
            return;
        }

        if (this.checkTie()) {
            this.gameOver = true;
            this.emit('tie');
            return;
        }

        // Cambiar turno
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        this.emit('turn', this.currentPlayer);
    }

    checkWin() {
        const b = this.board;

        // Filas
        for (let i = 0; i < 3; i++) {
            if (b[i][0] !== ' ' && b[i][0] === b[i][1] && b[i][1] === b[i][2]) {
                return true;
            }
        }

        // Columnas
        for (let j = 0; j < 3; j++) {
            if (b[0][j] !== ' ' && b[0][j] === b[1][j] && b[1][j] === b[2][j]) {
                return true;
            }
        }

        // Diagonales
        if (b[0][0] !== ' ' && b[0][0] === b[1][1] && b[1][1] === b[2][2]) {
            return true;
        }
        if (b[0][2] !== ' ' && b[0][2] === b[1][1] && b[1][1] === b[2][0]) {
            return true;
        }

        return false;
    }

    checkTie() {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.board[i][j] === ' ') {
                    return false;
                }
            }
        }
        return true;
    }

    fromInt(numero) {        
        if (Intervalo.estaDentro(numero, 1, 3, 'CERRADO')) {
            return {
                i: 0, j: numero - 1
            };
        } else if (Intervalo.estaDentro(numero, 4, 6, 'CERRADO')) {
            return {
                i: 1,
                j: numero - 4
            };
        } else if (Intervalo.estaDentro(numero, 7, 9, 'CERRADO')) {
            return {
                i: 2,
                j: numero - 7
            };
        }
    }
}

class Intervalo {
    static estaDentro(numero, desde, hasta, estado) {
        if (estado === 'CERRADO') {
            return numero >= desde && numero <= hasta;
        } else if (estado === 'ABIERTO') {
            return numero > desde && numero < hasta;
        } else if (estado === 'CERRADO-IZQUIERDA') {
            return numero >= desde && numero < hasta;
        } else if (estado === 'CERRADO-DERECHA') {
            return numero > desde && numero <= hasta;
        }
        return false;
    }
}


// Configuración de readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Función para preguntar al usuario
function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}


// Función principal para jugar
async function playGame() {
    const game = new TicTacToe();

    game.on('turn', (player) => {
        console.log(`Turno del jugador: ${player}`);
    });

    game.on('invalidMove', (message) => {
        console.log(`Movimiento inválido: ${message}`);
    });

    game.on('win', (player) => {
        console.log(`¡El jugador ${player} ha ganado!`);
        rl.close();
    });

    game.on('tie', () => {
        console.log('¡Empate!');
        rl.close();
    });

    game.on('gameOver', (message) => {
        console.log(message);
    });

    // Iniciar el juego
    console.log('Bienvenido al Tic Tac Toe');
    game.printBoard();
    game.emit('turn', game.currentPlayer);
    const sistemDecimal = Array(10).fill(null).map((_, index)=> index);
    while (!game.gameOver) {
        const numero = await askQuestion('Numero (1-9): ');
        if (!sistemDecimal.includes(+numero)) continue;
        const { i, j } = game.fromInt(+numero);
        game.makeMove(i, j);
    }
}

playGame();
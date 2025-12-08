import EventEmitter from 'events';
import rl from 'readline';

const readline = rl.createInterface({
  input: process.stdin,
  output: process.stdout
});


class MoveCommand {
  constructor(boardProxy, player, row, col) {
    this.boardProxy = boardProxy;
    this.player = player;
    this.row = row;
    this.col = col;
    this.previousValue = null;
  }

  execute() {
    // Guardamos el valor actual de la celda
    this.previousValue = this.boardProxy.getCell(this.row, this.col);

    // Intentamos colocar la ficha
    if (this.previousValue !== ' ') {
      throw new Error('Cell already occupied');
    }

    this.boardProxy.setCell(this.row, this.col, this.player);
  }

  undo() {
    if (this.previousValue !== null) {
      this.boardProxy.setCell(this.row, this.col, this.previousValue);
    }
  }

}


class BoardProxy {
  constructor() {
    this.board = [
      [' ', ' ', ' '],
      [' ', ' ', ' '],
      [' ', ' ', ' ']
    ];
  }

  getCell(row, col) {
    return this.board[row][col];
  }

  setCell(row, col, value) {
    // Validamos que la celda esté libre
    if (this.board[row][col] !== ' ') {
      throw new Error('Invalid move: Cell is already occupied');
    }
    this.board[row][col] = value;
  }

  // Para imprimir el tablero, necesitamos acceso a la matriz
  getBoard() {
    return this.board;
  }

}


class TicTacToe extends EventEmitter {
  constructor() {
    super();
    this.board = new BoardProxy();
    this.currentPlayer = 'X';
    this.gameActive = true;
    this.commandHistory = [];
    // Configurar listeners de eventos
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.on('move', (row, col) => {
      this.makeMove(row, col);
    });

    this.on('invalidMove', (message) => {
      console.log(`❌ ${message}`);
      this.promptPlayer();
    });

    this.on('boardUpdated', () => {
      this.printBoard();
      if (this.gameActive) {
        this.checkGameStatus();
        if (this.gameActive) {
          this.switchPlayer();
          this.promptPlayer();
        }
      }
    });

    this.on('gameWon', (player) => {
      console.log(`🎉 ¡Jugador ${player} gana!`);
      this.gameActive = false;
      this.askPlayAgain();
    });

    this.on('gameTied', () => {
      console.log('🤝 ¡Empate!');
      this.gameActive = false;
      this.askPlayAgain();
    });

    this.on('restart', () => {
      this.resetGame();
    });

  }

  printBoard() {
    console.log('\n  0   1   2');
    console.log(' -----------');
    this.board.getBoard().forEach((row, index) => {
      console.log(`${index}| ${row.join(' | ')} |`);
      console.log(' -----------');
    });
    console.log('');
  }

  makeMove(row, col) {
    try {
      const command = new MoveCommand(this.board, this.currentPlayer, row, col);
      command.execute();
      this.commandHistory.push(command); // Guardamos el comando en el historial
      this.emit('boardUpdated');
    } catch (error) {
      this.emit('invalidMove', error.message);
    }
  }

  checkGameStatus() {
    // Verificar filas
    const board = this.board.getBoard();
    for (let i = 0; i < 3; i++) {
      if (board[i][0] !== ' ' &&
        board[i][0] === board[i][1] &&
        board[i][1] === board[i][2]) {
        this.emit('gameWon', this.currentPlayer);
        return;
      }
    }

    // Verificar columnas
    for (let j = 0; j < 3; j++) {
      if (board[0][j] !== ' ' &&
        board[0][j] === board[1][j] &&
        board[1][j] === board[2][j]) {
        this.emit('gameWon', this.currentPlayer);
        return;
      }
    }

    // Verificar diagonales
    if (board[0][0] !== ' ' &&
      board[0][0] === board[1][1] &&
      board[1][1] === board[2][2]) {
      this.emit('gameWon', this.currentPlayer);
      return;
    }

    if (board[0][2] !== ' ' &&
      board[0][2] === board[1][1] &&
      board[1][1] === board[2][0]) {
      this.emit('gameWon', this.currentPlayer);
      return;
    }

    // Verificar empate
    if (board.flat().every(cell => cell !== ' ')) {
      this.emit('gameTied');
      return;
    }
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
  }

  promptPlayer() {
    console.log(`Turno del jugador: ${this.currentPlayer}`);
    readline.question('Ingresa fila y columna (ej: 0 1): ', (input) => {
      const [row, col] = input.trim().split(' ').map(Number);

      if (input.toLowerCase() === 'exit') {
        console.log('¡Hasta luego! 👋');
        readline.close();
        return;
      }

      if (isNaN(row) || isNaN(col)) {
        console.log('❌ Por favor ingresa números válidos (ej: 0 1)');
        this.promptPlayer();
        return;
      }

      // Emitir el evento de movimiento
      this.emit('move', row, col);
    });
  }

  askPlayAgain() {
    readline.question('\n¿Quieres jugar de nuevo? (s/n): ', (answer) => {
      if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'si') {
        this.emit('restart');
      } else {
        console.log('¡Gracias por jugar! 👋');
        readline.close();
      }
    });
  }

  resetGame() {
    this.board = new BoardProxy();
    this.currentPlayer = 'X';
    this.gameActive = true;

    console.log('\n✨ ¡Nuevo juego!');
    this.printBoard();
    this.promptPlayer();
  }

  start() {
    console.log('🎮 TIC TAC TOE - EventEmitter Edition');
    console.log('=====================================');
    console.log('Instrucciones:');
    console.log('- Ingresa fila y columna (0-2) separados por espacio');
    console.log('- Ejemplo: "0 1" para fila 0, columna 1');
    console.log('- Escribe "exit" para salir\n');

    this.printBoard();
    this.promptPlayer();
  }

}


// Ejecutar el juego
const game = new TicTacToe();
game.start();



// Manejar cierre del programa
readline.on('close', () => {
  console.log('\n¡Hasta la próxima! 🎯');
  process.exit(0);
});
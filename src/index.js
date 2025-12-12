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
    if (this.previousValue instanceof Ficha) {
      throw new Error('Cell already occupied');
    }

    this.boardProxy.setCell(this.row, this.col, this.player);
  }

  undo() {
    this.boardProxy.setCell(this.row, this.col, this.previousValue);
    this.boardProxy.currentPlayer = this.player;
  }

}

class Ficha {
  constructor(id, simbolo) {
    this.id = id;
    this.simbolo = simbolo;
  }
}

class Celda {
  constructor(id, x, y, ficha) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.ficha = ficha;
  }

  isOcupada() {
    return this.ficha instanceof Ficha;
  }

}

class BoardProxy {
  constructor() {
    this.player1 = new Ficha(1, 'X');
    this.player2 = new Ficha(0, 'O');
    this.currentPlayer = this.player1;

    this.board = [];
    for (let i = 0; i < 3; i++) {
      this.board[i] = [];
      for (let j = 0; j < 3; j++) {
        this.board[i][j] = new Celda(3 * i + j + 1, i, j);
      }
    }
  }

  getCell(row, col) {
    return this.board[row][col];
  }

  setCell(row, col, value) {
    // Validamos que la celda esté libre
    if (this.getCell(row, col) instanceof Ficha) {
      throw new Error('Invalid move: Cell is already occupied');
    }
    this.getCell(row, col).ficha = value;
  }

  fromInt(numero) {
    return this.board.flat().find(c => c.id === numero);
  }

  fromXY(x, y) {
    return this.board[x][y];
  }

  // Para imprimir el tablero, necesitamos acceso a la matriz
  getBoard() {
    return this.board;
  }

  toLineas() {
    const celdas = {
      horizontal: [],
      vertical: [],
      diagonal: [],
      diagonal2: []
    }
    const lineas = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        celdas.horizontal.push(this.fromXY(i, j));
        celdas.vertical.push(this.fromXY(j, i));
        if (i === j) {
          celdas.diagonal.push(this.fromXY(i, j));
          celdas.diagonal2.push(this.fromXY(2 - j, j));
        }
      }
      lineas.push(new Linea(celdas.horizontal, 'HORIZONTAL'));
      lineas.push(new Linea(celdas.vertical, 'VERTICAL'));
      celdas.horizontal = [];
      celdas.vertical = [];
    }

    lineas.push(new Linea(celdas.diagonal, 'DIAGONAL'));
    lineas.push(new Linea(celdas.diagonal2, 'DIAGONAL2'));
    return lineas;
  }

  completo() {
    return this.board.flat().filter(c => !c.isOcupada()).length === 0;
  }

  switchPlayer() {
    if (this.currentPlayer.id === this.player1.id) {
      this.currentPlayer = this.player2;
    } else {
      this.currentPlayer = this.player1;
    }
  }

}

class Linea {
  constructor(celdas, orientacion) {
    this.celdas = celdas;
    this.orientacion = orientacion;
  }
}

class LineaManager {
  constructor(linea, propietario) {
    this.linea = linea;
    this.propietario = propietario;
  }

  hayGanador() {
    return this.linea.celdas.map(c => {
      if (c.ficha) return c.ficha.simbolo;
      return ' ';
    }).every(c => c === this.propietario.simbolo);
  }
}

class UIManager extends EventEmitter {
  constructor() {
    super();
    this.board = new BoardProxy();
    this.command = null;
    this.gameActive = true;
    this.commandHistory = [];
    // Configurar listeners de eventos
    this.setupEventListeners();
  }

  printBoard() {
    console.log('\n  0   1   2');
    console.log(' -----------');
    this.board.getBoard().forEach((row, index) => {
      console.log(`${index}| ${row.map(c => {
        if (c.ficha) {
          return c.ficha.simbolo;
        }
        return ' ';
      }).join(' | ')} |`);
      console.log(' -----------');
    });
    console.log('');
  }

  makeMove(row, col) {
    try {
      const command = new MoveCommand(this.board, this.board.currentPlayer, row, col);
      command.execute();
      this.commandHistory.push(command); // Guardamos el comando en el historial

      this.emit('boardUpdated');
    } catch (error) {
      this.emit('invalidMove', error.message);
    }
  }

  checkGameStatus() {
    for (const l of this.board.toLineas()) {
      const lm = new LineaManager(l, this.board.currentPlayer);
      if (lm.hayGanador()) {
        this.emit('gameWon', this.board.currentPlayer);
        return;
      }
    }

    if (this.board.completo()) {
      this.emit('gameTied');
      return;
    }
  }

  promptPlayer() {
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
    this.currentPlayer = this.player1;
    this.gameActive = true;
    console.log('\n✨ ¡Nuevo juego!');
    this.promptMainMenu();
  }

  start() {
    this.promptMainMenu();
  }

}

class TicTacToe extends UIManager {
  constructor() {
    super();
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
      console.log(`Haz colocado: ${this.board.currentPlayer.simbolo}`);
      this.printBoard();

      if (this.gameActive) {
        this.checkGameStatus();
        if (this.gameActive) {
          this.submenu();
          this.board.switchPlayer();
          console.log(`Turno del jugador: ${this.board.currentPlayer.simbolo}`);
          this.processSubmenu();
        }
      }
    });

    this.on('gameWon', (player) => {
      console.log(`🎉 ¡Jugador ${player.simbolo} gana!`);
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

  promptMainMenu() {
    console.log('🎮 TIC TAC TOE - EventEmitter Edition');
    console.log('=====================================');
    console.log('Menu principal');
    console.log(" ", '1.- Jugar juego');
    console.log(" ", '2.- Configurar player´s');
    console.log(" ", '3.- Salir');

    readline.question('\n¿Elije una opcion? (1-3): ', (answer) => {
      if (answer === '1') {
        this.promptSubmenuInicial();
      } else if (answer === '3') {
        console.log('¡Gracias por jugar! 👋');
        readline.close();
      } else {
        this.promptMainMenu();
      }
    });

  }

  promptSubmenuInicial() {
    this.printBoard();
    this.submenu();
    console.log(`Turno del jugador: ${this.board.currentPlayer.simbolo}`);
    this.processSubmenu();
  }

  submenu() {
    console.log('Opciones del submenu');
    console.log(" ", '1.- Hacer movimiento');
    console.log(" ", '2.- Deshacer movimiento(ctrl+z)');
    console.log(" ", '3.- Rehacer movimiento(ctrl+y)');
    console.log(" ", '4.- Historial de movimiento');
    console.log(" ", '5.- Atras');
  }

  promptSubmenu() {
    this.submenu();
    this.processSubmenu();
  }

  processSubmenu() {
    readline.question('\n¿Elije una opcion? (1-5): ', (answer) => {
      switch (answer) {
        case '1':
          this.promptPlayer();
          break;
        case '2':
          if (this.commandHistory.length) {
            this.command = this.commandHistory.pop();
            this.command.undo();
          }
          this.promptSubmenu();
          break;
        case '3':
          if (this.command) {
            this.command.execute();
            this.board.switchPlayer();
            this.commandHistory.push(this.command);
            this.command = null;
          }
          this.promptSubmenu();
          break;
        case '4':
          console.log("Movimientos al dia de hoy");
          if (this.commandHistory.length === 0) {
            console.log('No hay movimientos');
            this.processSubmenu();
            return;
          }
          const logs = this.commandHistory.map((c, index) => ({
            MOVIMIENTO: index + 1,
            FILA: c.row,
            COLUMNA: c.col,
            FICHA: c.player.simbolo
          }));
          console.table(logs);
          this.promptSubmenu();
          break;
        case '5':
          this.resetGame();
          break;
        default:
          this.promptSubmenu();
      }
    });
  }

}


class TicTacToeFunny extends UIManager {
  constructor() {
    super();
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
          this.submenu();
          this.board.switchPlayer();
          console.log(`Turno del jugador: ${this.board.currentPlayer.simbolo}`);
          this.processSubmenu();
        }
      }
    });

    this.on('gameWon', (player) => {
      console.log(`🎉 ¡Jugador ${player.simbolo} gana!`);
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

  promptMainMenu() {
    console.log('🎮 TIC TAC TOE - EventEmitter Edition');
    console.log('=====================================');
    console.log('Menu principal');
    console.log(" ", 'i.- Jugar juego');
    console.log(" ", 'ii.- Configurar player´s');
    console.log(" ", 'iii.- Salir');

    readline.question('\n¿Elije una opcion? (i-iii): ', (answer) => {
      if (answer === 'i') {
        this.promptSubmenuInicial();
      } else if (answer === 'iii') {
        console.log('¡Gracias por jugar! 👋');
        readline.close();
      } else {
        this.promptMainMenu();
      }
    });

  }

  promptSubmenuInicial() {
    this.printBoard();
    this.submenu();
    console.log(`Turno del jugador: ${this.board.currentPlayer.simbolo}`);
    this.processSubmenu();
  }

  submenu() {
    console.log('Opciones del submenu');
    console.log(" ", 'i.- Hacer movimiento');
    console.log(" ", 'ii.- Deshacer movimiento(ctrl+z)');
    console.log(" ", 'iii.- Rehacer movimiento(ctrl+y)');
    console.log(" ", 'iv.- Historial de movimiento');
    console.log(" ", 'v.- Atras');
  }

  promptSubmenu() {
    this.submenu();
    this.processSubmenu();
  }

  processSubmenu() {
    readline.question('\n¿Elije una opcion? (i-v): ', (answer) => {
      switch (answer) {
        case 'i':
          this.promptPlayer();
          break;
        case 'ii':
          if (this.commandHistory.length) {
            this.command = this.commandHistory.pop();
            this.command.undo();
          }
          this.promptSubmenu();
          break;
        case 'iii':
          if (this.command) {
            this.command.execute();
            this.board.switchPlayer();
            this.commandHistory.push(this.command);
            this.command = null;
          }
          this.promptSubmenu();
          break;
        case 'iv':
          console.log("Movimientos al dia de hoy");
          if (this.commandHistory.length === 0) {
            console.log('No hay movimientos');
            this.processSubmenu();
            return;
          }
          const logs = this.commandHistory.map((c, index) => ({
            MOVIMIENTO: index + 1,
            FILA: c.row,
            COLUMNA: c.col,
            FICHA: c.player.simbolo
          }));
          console.table(logs);
          this.promptSubmenu();
          break;
        case 'v':
          this.resetGame();
          break;
        default:
          this.promptSubmenu();
      }
    });
  }

}

// Ejecutar el juego
const game = new TicTacToeFunny();
game.start();


// Manejar cierre del programa
readline.on('close', () => {
  console.log('\n¡Hasta la próxima! 🎯');
  process.exit(0);
});
// Game state management
class ChessGame {
  constructor() {
    this.board = this.createInitialBoard();
    this.currentPlayer = 'white';
    this.gameState = {
      isCheck: false,
      isCheckmate: false,
      lastMove: null,
      canCastle: {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true }
      },
      enPassantTarget: null
    };
  }

  createInitialBoard() {
    const board = new Array(8).fill(null).map(() => new Array(8).fill(null));
    // Setup pieces
    const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    
    // Place pieces
    for (let col = 0; col < 8; col++) {
      board[0][col] = { type: backRow[col], color: 'black', hasMoved: false };
      board[1][col] = { type: 'pawn', color: 'black', hasMoved: false };
      board[6][col] = { type: 'pawn', color: 'white', hasMoved: false };
      board[7][col] = { type: backRow[col], color: 'white', hasMoved: false };
    }
    
    return board;
  }

  // Movement validation
  isValidMove(from, to) {
    const piece = this.board[from.row][from.col];
    if (!piece || piece.color !== this.currentPlayer) return false;

    const validMoves = this.getValidMoves(from);
    return validMoves.some(move => move.row === to.row && move.col === to.col);
  }

  getValidMoves(pos) {
    const piece = this.board[pos.row][pos.col];
    if (!piece) return [];

    let moves = [];
    switch (piece.type) {
      case 'pawn':
        moves = this.getPawnMoves(pos);
        break;
      case 'knight':
        moves = this.getKnightMoves(pos);
        break;
      case 'bishop':
        moves = this.getBishopMoves(pos);
        break;
      case 'rook':
        moves = this.getRookMoves(pos);
        break;
      case 'queen':
        moves = [...this.getBishopMoves(pos), ...this.getRookMoves(pos)];
        break;
      case 'king':
        moves = this.getKingMoves(pos);
        break;
    }

    // Filter moves that would put/leave king in check
    return moves.filter(move => !this.wouldBeInCheck(pos, move));
  }

  getPawnMoves(pos) {
    const moves = [];
    const direction = this.board[pos.row][pos.col].color === 'white' ? -1 : 1;
    const startRow = this.board[pos.row][pos.col].color === 'white' ? 6 : 1;

    // Forward move
    if (!this.board[pos.row + direction]?.[pos.col]) {
      moves.push({ row: pos.row + direction, col: pos.col });
      
      // Double move from start
      if (pos.row === startRow && !this.board[pos.row + direction * 2]?.[pos.col]) {
        moves.push({ row: pos.row + direction * 2, col: pos.col });
      }
    }

    // Captures
    for (const offset of [-1, 1]) {
      const targetCol = pos.col + offset;
      if (targetCol >= 0 && targetCol < 8) {
        const targetRow = pos.row + direction;
        const targetPiece = this.board[targetRow]?.[targetCol];
        
        if (targetPiece && targetPiece.color !== this.board[pos.row][pos.col].color) {
          moves.push({ row: targetRow, col: targetCol });
        }
        
        // En passant
        if (this.gameState.enPassantTarget && 
            targetRow === this.gameState.enPassantTarget.row && 
            targetCol === this.gameState.enPassantTarget.col) {
          moves.push({ row: targetRow, col: targetCol, isEnPassant: true });
        }
      }
    }

    return moves;
  }

  getKnightMoves(pos) {
    const moves = [];
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    for (const [rowOffset, colOffset] of offsets) {
      const targetRow = pos.row + rowOffset;
      const targetCol = pos.col + colOffset;
      
      if (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
        const targetPiece = this.board[targetRow][targetCol];
        if (!targetPiece || targetPiece.color !== this.board[pos.row][pos.col].color) {
          moves.push({ row: targetRow, col: targetCol });
        }
      }
    }

    return moves;
  }

  getSlidingMoves(pos, directions) {
    const moves = [];
    const piece = this.board[pos.row][pos.col];

    for (const [dx, dy] of directions) {
      let targetRow = pos.row + dx;
      let targetCol = pos.col + dy;

      while (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
        const targetPiece = this.board[targetRow][targetCol];
        
        if (!targetPiece) {
          moves.push({ row: targetRow, col: targetCol });
        } else {
          if (targetPiece.color !== piece.color) {
            moves.push({ row: targetRow, col: targetCol });
          }
          break;
        }
        
        targetRow += dx;
        targetCol += dy;
      }
    }

    return moves;
  }

  getBishopMoves(pos) {
    return this.getSlidingMoves(pos, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
  }

  getRookMoves(pos) {
    return this.getSlidingMoves(pos, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
  }

  getKingMoves(pos) {
    const moves = [];
    const piece = this.board[pos.row][pos.col];

    // Normal moves
    const offsets = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dx, dy] of offsets) {
      const targetRow = pos.row + dx;
      const targetCol = pos.col + dy;
      
      if (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
        const targetPiece = this.board[targetRow][targetCol];
        if (!targetPiece || targetPiece.color !== piece.color) {
          moves.push({ row: targetRow, col: targetCol });
        }
      }
    }

    // Castling
    if (!piece.hasMoved && !this.isCheck) {
      const row = piece.color === 'white' ? 7 : 0;
      const castlingRights = this.gameState.canCastle[piece.color];

      // Kingside
      if (castlingRights.kingSide &&
          !this.board[row][5] && !this.board[row][6] &&
          this.board[row][7]?.type === 'rook' && !this.board[row][7].hasMoved) {
        if (!this.isSquareAttacked({ row, col: 5 }, piece.color) &&
            !this.isSquareAttacked({ row, col: 6 }, piece.color)) {
          moves.push({ row, col: 6, isCastling: 'kingside' });
        }
      }

      // Queenside
      if (castlingRights.queenSide &&
          !this.board[row][3] && !this.board[row][2] && !this.board[row][1] &&
          this.board[row][0]?.type === 'rook' && !this.board[row][0].hasMoved) {
        if (!this.isSquareAttacked({ row, col: 3 }, piece.color) &&
            !this.isSquareAttacked({ row, col: 2 }, piece.color)) {
          moves.push({ row, col: 2, isCastling: 'queenside' });
        }
      }
    }

    return moves;
  }

  isSquareAttacked(pos, defendingColor) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color !== defendingColor) {
          const moves = this.getValidMoves({ row, col }, true);
          if (moves.some(move => move.row === pos.row && move.col === pos.col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  wouldBeInCheck(from, to) {
    // Make temporary move
    const originalBoard = JSON.parse(JSON.stringify(this.board));
    this.makeMove(from, to);
    
    // Check if king is in check
    const kingPos = this.findKing(this.currentPlayer);
    const isInCheck = this.isSquareAttacked(kingPos, this.currentPlayer);
    
    // Restore board
    this.board = originalBoard;
    return isInCheck;
  }

  findKing(color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece?.type === 'king' && piece.color === color) {
          return { row, col };
        }
      }
    }
  }

  makeMove(from, to) {
    const piece = this.board[from.row][from.col];
    const targetPiece = this.board[to.row][to.col];

    // Handle en passant
    if (piece.type === 'pawn' && to.isEnPassant) {
      this.board[from.row][to.col] = null;
    }

    // Handle castling
    if (piece.type === 'king' && to.isCastling) {
      const row = piece.color === 'white' ? 7 : 0;
      if (to.isCastling === 'kingside') {
        this.board[row][5] = this.board[row][7];
        this.board[row][7] = null;
      } else {
        this.board[row][3] = this.board[row][0];
        this.board[row][0] = null;
      }
    }

    // Move piece
    this.board[to.row][to.col] = piece;
    this.board[from.row][from.col] = null;
    piece.hasMoved = true;

    // Handle pawn promotion
    if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
      this.board[to.row][to.col] = { type: 'queen', color: piece.color, hasMoved: true };
    }

    // Update en passant target
    this.gameState.enPassantTarget = null;
    if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
      this.gameState.enPassantTarget = {
        row: (from.row + to.row) / 2,
        col: from.col
      };
    }

    // Update castling rights
    if (piece.type === 'king') {
      this.gameState.canCastle[piece.color] = { kingSide: false, queenSide: false };
    } else if (piece.type === 'rook') {
      if (from.col === 0) {
        this.gameState.canCastle[piece.color].queenSide = false;
      } else if (from.col === 7) {
        this.gameState.canCastle[piece.color].kingSide = false;
      }
    }

    // Switch player
    this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

    // Update game state
    this.gameState.lastMove = { from, to };
    this.updateGameState();
  }

  updateGameState() {
    // Check for check
    const kingPos = this.findKing(this.currentPlayer);
    this.gameState.isCheck = this.isSquareAttacked(kingPos, this.currentPlayer);

    // Check for checkmate or stalemate
    let hasValidMoves = false;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece?.color === this.currentPlayer) {
          const moves = this.getValidMoves({ row, col });
          if (moves.length > 0) {
            hasValidMoves = true;
            break;
          }
        }
      }
      if (hasValidMoves) break;
    }

    if (!hasValidMoves) {
      this.gameState.isCheckmate = this.gameState.isCheck;
      this.gameState.isStalemate = !this.gameState.isCheck;
    }
  }
}

// UI Handler
class ChessUI {
  constructor() {
    this.game = new ChessGame();
    this.selectedSquare = null;
    this.gameBoard = document.querySelector("#gameboard");
    this.playerDetails = document.querySelector("#player");
    this.infoDisplay = document.querySelector("#info-display");
    this.errorDisplay = document.querySelector("#err");
    
    this.initializeBoard();
    this.addEventListeners();
  }

  initializeBoard() {
    this.gameBoard.innerHTML = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        square.classList.add('square');
        square.dataset.row = row;
        square.dataset.col = col;
        
        // Set square color
        square.classList.add((row + col) % 2 === 0 ? 'beige' : 'brown');
        
        // Add piece if exists
        const piece = this.game.board[row][col];
        if (piece) {
          square.innerHTML = this.getPieceHTML(piece);
        }
        
        this.gameBoard.appendChild(square);
      }
    }
  }
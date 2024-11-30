const DIRECTIONS = {
  bishop: [
    { dx: 1, dy: 1 },   // top-right
    { dx: 1, dy: -1 },  // bottom-right
    { dx: -1, dy: 1 },  // top-left
    { dx: -1, dy: -1 }  // bottom-left
  ]
};

function getSquareId(row, col) {
  return row * 8 + col;
}

function getCoordinates(squareId) {
  return {
    row: Math.floor(squareId / 8),
    col: squareId % 8
  };
}

function isValidCoordinate(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function checkBishopMove(startId, targetId) {
  const start = getCoordinates(startId);
  const target = getCoordinates(targetId);

  // Check if moving diagonally
  const rowDiff = Math.abs(target.row - start.row);
  const colDiff = Math.abs(target.col - start.col);
  if (rowDiff !== colDiff) return false;

  // Get direction of movement
  const direction = {
    dx: Math.sign(target.col - start.col),
    dy: Math.sign(target.row - start.row)
  };

  // Check path for obstacles
  let currentRow = start.row + direction.dy;
  let currentCol = start.col + direction.dx;
  while (currentRow !== target.row && currentCol !== target.col) {
    const currentSquareId = getSquareId(currentRow, currentCol);
    if (document.querySelector(`[square-id="${currentSquareId}"]`).firstChild) {
      return false; // Path is blocked
    }
    currentRow += direction.dy;
    currentCol += direction.dx;
  }

  return true;
}

// Usage in checkIfValid function:
case 'bishop':
  return checkBishopMove(startId, targetId);


const cellsInColumn = 9;
const  cellsInRow = 9;

const difficultyLevels = {
  easy: 38,
  normal: 30,
  hard: 23,
  expert: 17, // 17 is the minimum number of revealed cells for a sudoku to have a unique solution
};

const RuleType = {
  NORMAL_SUDOKU: 'normal-sudoku',
  KINGS_MOVE: 'kings-move',
  KNIGHTS_MOVE: 'knights-move',
  KILLER_SUDOKU: 'killer-sudoku',
  THERMO: 'thermo',
  SUM_ARROW: 'sum-arrow',
}

const ruleWeights = {
  [RuleType.NORMAL_SUDOKU]: 0,
  [RuleType.KINGS_MOVE]: 4,
  [RuleType.KNIGHTS_MOVE]: 7,
  [RuleType.KILLER_SUDOKU]: 0,
  [RuleType.THERMO]: 4,
  [RuleType.SUM_ARROW]: 0,
};

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
};

const isValidNormalSudoku = (meta, cells, number, index) => {
  const col = index % cellsInRow;
  const row = Math.floor(index / cellsInRow);

  // check row and col
  for (let i = 0; i < cellsInRow; i++) {
    const rowIndex = row * cellsInRow + i;
    const colIndex = col + i * cellsInRow;

    if (rowIndex !== index && cells[rowIndex] === number) {
      return false;
    }

    if (colIndex !== index && cells[colIndex] === number) {
      return false;
    }
  }

  // check sudoku area
  // assuming area is 3x3
  const areaStartRow = Math.floor(row / 3) * 3;
  const areaStartCol = Math.floor(col / 3) * 3;
  const areaEndRow = areaStartRow + 3;
  const areaEndCol = areaStartCol + 3;

  for (let i = areaStartRow; i < areaEndRow; i++) {
    for (let j = areaStartCol; j < areaEndCol; j++) {
      const areaIndex = i * cellsInRow + j;

      if (areaIndex !== index && cells[areaIndex] === number) {
        return false;
      }
    }
  }

  return true;
};

const isValidKingsMove = (meta, cells, number, index) => {
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const kingIndex = index + (i * cellsInRow) + j;

      if (kingIndex !== index && cells[kingIndex] === number) {
        return false;
      }
    }
  }

  return true;
};

const isValidKnightsMove = (meta, cells, number, index) => {
  const col = index % cellsInRow;
  const row = Math.floor(index / cellsInRow);

  const moves = [
    { col: col - 2, row: row - 1 },
    { col: col - 2, row: row + 1 },
    { col: col - 1, row: row - 2 },
    { col: col - 1, row: row + 2 },
    { col: col + 1, row: row - 2 },
    { col: col + 1, row: row + 2 },
    { col: col + 2, row: row - 1 },
    { col: col + 2, row: row + 1 },
  ];

  for (const move of moves) {
    if (move.col >= 0 && move.col < cellsInRow && move.row >= 0 && move.row < cellsInRow) {
      const moveIndex = move.row * cellsInRow + move.col;

      if (cells[moveIndex] === number) {
        return false;
      }
    }
  }

  return true;
};

const isValidKillerSudoku = (meta, cells, number, index) => {
  const { cages } = meta;
  const col = index % cellsInRow;
  const row = Math.floor(index / cellsInRow);

  for (const cage of cages) {
    const cell = cage.path.find((c) => c.col === col && c.row === row);

    if (!cell) {
      continue;
    }

    const inCage = cage.path.find((c) => cells[c.col + c.row * cellsInColumn] === number);

    if (inCage) {
      return false;
    }
  }

  return true;
};

const isValidThermo = (meta, cells, number, index) => {
  const { thermos } = meta;
  const col = index % cellsInRow;
  const row = Math.floor(index / cellsInRow);

  for (const thermo of thermos) {
    const indexInThermo = thermo.path.findIndex((c) => c.col === col && c.row === row);

    if (indexInThermo === -1) {
      continue;
    }

    if (number <= indexInThermo) {
      return false;
    }

    if (cellsInRow - number < thermo.path.length - indexInThermo) {
      return false;
    }

    for (let i = 0; i < thermo.path.length; i++) {
      if (i === indexInThermo) {
        continue;
      }

      const cell = thermo.path[i];
      const cellIndex = cell.col + cell.row * cellsInRow;
      const cellValue = cells[cellIndex];

      if (cellValue === null) {
        continue;
      }

      if (i < indexInThermo && cellValue >= number) {
        return false;
      }

      if (i > indexInThermo && cellValue <= number) {
        return false;
      }
    }
  }

  return true;
};

const isValidArrowSum = (meta, cells, number, index) => {
  const { sumArrows } = meta;
  const col = index % cellsInRow;
  const row = Math.floor(index / cellsInRow);

  for (const arrow of sumArrows) {
    const indexOnArrow = arrow.path.findIndex((c) => c.col === col && c.row === row);

    if (indexOnArrow === -1) {
      continue;
    }

    const sum = arrow.path.slice(1).reduce((acc, cell) => {
      const cellIndex = cell.col + cell.row * cellsInRow;
      const cellValue = cells[cellIndex];

      if (cellValue === null) {
        return acc;
      }

      return acc + cellValue;
    }, 0);

    const isSumCell = indexOnArrow === 0;

    if (isSumCell) {
      if (sum > number) {
        return false;
      }

      const arrowFilled = arrow.path.slice(1).every((cell) => {
        const cellIndex = cell.col + cell.row * cellsInRow;
        const cellValue = cells[cellIndex];

        return cellValue !== null;
      });

      if (arrowFilled && sum !== number) {
        return false;
      }
    } else {
      const sumCell = arrow.path[0];
      const sumCellIndex = sumCell.col + sumCell.row * cellsInRow;
      const sumCellValue = cells[sumCellIndex];

      if (sumCellValue === null) {
        continue;
      }

      if (sumCellValue < number) {
        return false;
      }

      if (sum + number > sumCellValue) {
        return false;
      }

      const isLastCellOnArrow = arrow.path.slice(1).filter((cell) => {
        const cellIndex = cell.col + cell.row * cellsInRow;
        const cellValue = cells[cellIndex];

        return cellValue === null;
      }).length === 1;

      if (isLastCellOnArrow && sum + number !== sumCellValue) {
        return false;
      }
    }
  }

  return true;
};

const ruleValidaroMap = {
  [RuleType.NORMAL_SUDOKU]: isValidNormalSudoku,
  [RuleType.KINGS_MOVE]: isValidKingsMove,
  [RuleType.KNIGHTS_MOVE]: isValidKnightsMove,
  [RuleType.KILLER_SUDOKU]: isValidKillerSudoku,
  [RuleType.THERMO]: isValidThermo,
  [RuleType.SUM_ARROW]: isValidArrowSum,
};

const isValid = (rules, meta, cells, number, index) => {
  for (const rule of rules) {
    if (!ruleValidaroMap[rule](meta, cells, number, index)) {
      return false;
    }
  }

  return true;
};

// expects an array filled with nulls only
const solve = (rules, meta, cells, i = 0) => {
  if (i === cells.length) {
    return true;
  }

  const available = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  while (available.length) {
    const [value] = available.splice(
      Math.floor(Math.random() * available.length),
      1,
    );

    if (isValid(rules, meta, cells, value, i)) {
      cells[i] = value;

      if (solve(rules, meta, cells, i + 1)) {
        return true;
      }
    }
  }

  cells[i] = null;
  return false;
};

const getEmptyCellIndex = (cells) => {
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === null) {
      return i;
    }
  }

  return null;
};

const createSolutionCounter = (rules, meta) => {
  let iter = 0;

  return function countSolutions(cells, count = 0) {
    iter++;

    if (iter > 100_000) {
      throw new Error('enough');
    }

    // stop at two since we use this function as a sudoku validator
    if (count > 1) {
      return count;
    }

    const i = getEmptyCellIndex(cells);

    if (i !== null) {
      for (let num = 1; num <= 9; num++) {
        if (isValid(rules, meta, cells, num, i)) {
          cells[i] = num;
          count = countSolutions(cells, count);
          cells[i] = null;
        }
      }
    } else {
      count++;
    }

    return count;
  };
};

// optimization reference:
// https://en.wikipedia.org/wiki/Sudoku_solving_algorithms#Stochastic_search_/_optimization_methods
const mask = (cells, difficulty, rules, meta) => {
  try {
    const countSolutions = createSolutionCounter(rules, meta);

    // TODO mask cells on a clue first
    const masked = cells.slice();
    // const indexes = [...masked.keys()];

    // shuffleArray(indexes);
    const indexes = [
      21, 41, 39, 34,  6, 28,  1, 33,  8,  9, 74, 65,
      77, 62, 13, 19, 57, 22, 25,  2, 18, 48,  0, 71,
      27, 59, 75, 30, 51, 76, 11, 67, 73, 49,  3, 58,
      63, 52, 36, 10, 54, 61, 53, 45, 15, 50, 72, 70,
      32, 46, 17, 26, 79, 37, 80, 20, 60,  7, 56, 23,
      78, 12, 29, 35, 14, 66, 42, 68,  4,  5, 24, 69,
      16, 64, 44, 47, 43, 40, 38, 31, 55
    ];


    let maskedMax = masked.length - 1 - difficultyLevels[difficulty];

    for (const rule of rules) {
      maskedMax += ruleWeights[rule];
    }

    for (let maskedCount = 0; maskedCount <= maskedMax;) {
      const randomIndex = indexes.pop();

      const value = masked[randomIndex];

      masked[randomIndex] = null;

      if (countSolutions(masked.slice()) === 1) {
        maskedCount++;
      } else {
        masked[randomIndex] = value;
        indexes.unshift(randomIndex);
      }
    }

    return masked;
  } catch (e) {
    return mask(cells, difficulty, rules, meta);
  }
};

const generateCages = () => {
  const cages = [];

  const cageSizeRange = {
    min: 2,
    max: 4,
  };
  const cageCountRange = {
    min: 3,
    max: 6,
  };

  const cageCount = Math.floor(Math.random() * (cageCountRange.max - cageCountRange.min + 1)) + cageCountRange.min;

  const occupiedCells = [];
  const freeCellIndexes = [...Array(cellsInColumn * cellsInRow).keys()];
  shuffleArray(freeCellIndexes);

  outer: for (let i = 0; i < cageCount; i++) {
    let iter = 0;

    const size = Math.floor(Math.random() * (cageSizeRange.max - cageSizeRange.min + 1)) + cageSizeRange.min;
    const path = [];

    const index = freeCellIndexes.pop();
    let col = index % cellsInColumn;
    let row = Math.floor(index / cellsInColumn);

    while (path.length < size) {
      iter++;

      if (iter > 100) {
        i--;
        continue outer;
      }

      const prevCol = col;
      const prevRow = row;

      if (Math.random() > 0.5) {
        const newCol = col + (Math.random() > 0.5 ? 1 : -1);
        const newIndex = newCol + row * cellsInColumn;

        if (newCol < 0 || newCol >= cellsInColumn) {
          continue;
        }

        if (occupiedCells.includes(newIndex)) {
          continue;
        }

        col = newCol;
      } else {
        const newRow = row + (Math.random() > 0.5 ? 1 : -1);
        const newIndex = col + newRow * cellsInColumn;

        if (newRow < 0 || newRow >= cellsInRow) {
          continue;
        }

        if (occupiedCells.includes(newIndex)) {
          continue;
        }

        row = newRow;
      }

      // the TipButton overlaps the sum clue for a cages that has a cell in the top left corner
      if (col === 0 && row === 0) {
        col = prevCol;
        row = prevRow;
        continue;
      }

      const newIndex = col + row * cellsInColumn;
      occupiedCells.push(newIndex);

      path.push({ col, row });
    }

    cages[i] = {
      path,
      total: 0,
    };
  }

  return cages;
};

const generateThermos = () => {
  const thermos = [];

  const thermoSizeRange = {
    min: 2,
    max: 6,
  };

  const thermoCountRange = {
    min: 2,
    max: 4,
  };

  const thermoCount = Math.floor(
    Math.random() * (thermoCountRange.max - thermoCountRange.min + 1),
  ) + thermoCountRange.min;

  const occupiedCells = [];
  const freeCellIndexes = [...Array(cellsInColumn * cellsInRow).keys()];
  shuffleArray(freeCellIndexes);

  outer: for (let i = 0; i < thermoCount; i++) {
    let iter = 0;

    const size = Math.floor(
      Math.random() * (thermoSizeRange.max - thermoSizeRange.min + 1),
    ) + thermoSizeRange.min;
    const path = [];

    const index = freeCellIndexes.pop();
    let col = index % cellsInColumn;
    let row = Math.floor(index / cellsInColumn);

    while (path.length < size) {
      iter++;

      if (iter > 1000) {
        i--;
        continue outer;
      }

      if (Math.random() > 0.5) {
        const newCol = col + (Math.random() > 0.5 ? 1 : -1);
        const newIndex = newCol + row * cellsInColumn;

        if (newCol < 0 || newCol >= cellsInColumn) {
          continue;
        }

        if (occupiedCells.includes(newIndex)) {
          continue;
        }

        col = newCol;
      } else {
        const newRow = row + (Math.random() > 0.5 ? 1 : -1);
        const newIndex = col + newRow * cellsInColumn;

        if (newRow < 0 || newRow >= cellsInRow) {
          continue;
        }

        if (occupiedCells.includes(newIndex)) {
          continue;
        }

        row = newRow;
      }

      const newIndex = col + row * cellsInColumn;
      occupiedCells.push(newIndex);

      path.push({ col, row });
    }

    thermos[i] = {
      path,
    };
  }

  return thermos;
};

const generateArrowSums = () => {
  const arrows = [];

  const arrowSizeRange = {
    min: 3, // min of 2 would be possible if arrows could be diagonal
    max: 4,
  };

  const arrowCountRange = {
    min: 3,
    max: 5,
  };

  const arrowCount = Math.floor(
    Math.random() * (arrowCountRange.max - arrowCountRange.min + 1),
  ) + arrowCountRange.min;

  const occupiedCells = [];
  const freeCellIndexes = [...Array(cellsInColumn * cellsInRow).keys()];
  shuffleArray(freeCellIndexes);

  outer: for (let i = 0; i < arrowCount; i++) {
    let iter = 0;

    const size = Math.floor(
      Math.random() * (arrowSizeRange.max - arrowSizeRange.min + 1),
    ) + arrowSizeRange.min;
    const path = [];

    const index = freeCellIndexes.pop();
    let col = index % cellsInColumn;
    let row = Math.floor(index / cellsInColumn);

    while (path.length < size) {
      iter++;

      if (iter > 1000) {
        i--;
        continue outer;
      }

      if (Math.random() > 0.5) {
        const newCol = col + (Math.random() > 0.5 ? 1 : -1);
        const newIndex = newCol + row * cellsInColumn;

        if (newCol < 0 || newCol >= cellsInColumn) {
          continue;
        }

        if (occupiedCells.includes(newIndex)) {
          continue;
        }

        col = newCol;
      } else {
        const newRow = row + (Math.random() > 0.5 ? 1 : -1);
        const newIndex = col + newRow * cellsInColumn;

        if (newRow < 0 || newRow >= cellsInRow) {
          continue;
        }

        if (occupiedCells.includes(newIndex)) {
          continue;
        }

        row = newRow;
      }

      const newIndex = col + row * cellsInColumn;
      occupiedCells.push(newIndex);

      path.push({ col, row });
    }

    arrows[i] = {
      path,
    };
  }

  return arrows;
};

const countTotals = (cages, cells) => {
  for (const cage of cages) {
    cage.total = 0;

    for (const { col, row } of cage.path) {
      cage.total += cells[col + row * cellsInColumn].answer;
    }
  }
};

const generateMeta = (rules) => {
  const meta = {};

  for (const rule of rules) {
    switch (rule) {
      case RuleType.KILLER_SUDOKU:
        meta.cages = generateCages();
        break;

      case RuleType.THERMO:
        meta.thermos = generateThermos();
        break;

      case RuleType.SUM_ARROW:
        meta.sumArrows = generateArrowSums();
        break;

      default:
        break;
    }
  }

  return meta;
};

const updateMeta = (rules, meta, cells) => {
  const updatedMeta = { ...meta };

  for (const rule of rules) {
    switch (rule) {
      case RuleType.KILLER_SUDOKU:
        countTotals(updatedMeta.cages, cells);
        break;

      default:
        break;
    }
  }

  return updatedMeta;
};

// const util = require('util');

const generateBoard = (difficulty, rules) => {
  // const meta = generateMeta(rules);

  // console.log(util.inspect(meta, {showHidden: false, depth: null, colors: true}));

  // const solved = new Array(cellsInRow * cellsInColumn).fill(null);
  // solve(rules, meta, solved);

  // console.log(solved);

  const meta = {
    thermos: [
      {
        path: [
          { col: 3, row: 5 },
          { col: 4, row: 5 },
          { col: 5, row: 5 },
          { col: 5, row: 4 }
        ]
      },
      {
        path: [
          { col: 6, row: 6 },
          { col: 6, row: 5 },
          { col: 7, row: 5 },
          { col: 8, row: 5 },
          { col: 8, row: 6 }
        ]
      },
      {
        path: [
          { col: 1, row: 3 },
          { col: 1, row: 2 },
          { col: 1, row: 1 },
          { col: 0, row: 1 },
          { col: 0, row: 0 }
        ]
      }
    ]
  }
  const solved = [
    5, 7, 8, 6, 9, 2, 4, 1, 3, 4, 3, 9,
    5, 8, 1, 7, 6, 2, 6, 2, 1, 7, 4, 3,
    9, 5, 8, 3, 1, 2, 4, 6, 5, 8, 7, 9,
    7, 5, 4, 9, 3, 8, 6, 2, 1, 9, 8, 6,
    1, 2, 7, 3, 4, 5, 1, 4, 3, 8, 5, 6,
    2, 9, 7, 8, 6, 5, 2, 7, 9, 1, 3, 4,
    2, 9, 7, 3, 1, 4, 5, 8, 6
  ]

  const masked = mask(solved, difficulty, rules, meta);

  const cells = [];

  for (let i = 0; i < solved.length; i += 1) {
    cells.push({
      value: null,
      answer: solved[i],
      revealed: masked[i] !== null,
      corner: [],
      middle: [],
      col: i % cellsInRow,
      row: Math.floor(i / cellsInRow),
      colors: [],
    });
  }

  return {
    cells,
    meta: updateMeta(rules, meta, cells),
  };
}

(() => {
  const difficulty = 'hard';
  const rules = [
    RuleType.NORMAL_SUDOKU,
    RuleType.THERMO,
  ];

  const ts = Date.now();

  for (let i = 0; i < 10; i++) {
    generateBoard(difficulty, rules);
  }

  console.log('time', Date.now() - ts, 'ms');
})()

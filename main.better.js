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

const findHiddenSingle = (cells) => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  for (const number of numbers) {
    const seenInCol = [];
    const seenInRow = [];

    for (let i = 0; i < cellsInColumn; i++) {
      for (let j = 0; j < cellsInRow; j++) {
        const index = i + j * cellsInColumn;

        if (cells[index] === number) {
          seenInCol.push(i);
          seenInRow.push(j);
        }
      }
    }

    const avaliableInCol = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !seenInCol.includes(i));
    const avaliableInRow = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !seenInRow.includes(i));
    const seenInBox = new Map();

    for (let i = 0; i < avaliableInCol.length; i++) {
      loop: for (let j = 0; j < avaliableInRow.length; j++) {
        const col = avaliableInCol[i];
        const row = avaliableInRow[j];
        const index = col + row * cellsInColumn;

        if (cells[index] !== null) {
          continue;
        }

        const boxStartRow = Math.floor(row / 3) * 3;
        const boxStartCol = Math.floor(col / 3) * 3;
        const boxEndRow = boxStartRow + 3;
        const boxEndCol = boxStartCol + 3;

        for (let i = boxStartRow; i < boxEndRow; i++) {
          for (let j = boxStartCol; j < boxEndCol; j++) {
            const boxIndex = i * cellsInRow + j;

            if (cells[boxIndex] === number) {
              continue loop;
            }
          }
        }

        const key = `${boxStartCol}x${boxStartRow}`;

        if (seenInBox.has(key)) {
          seenInBox.set(key, {
            count: seenInBox.get(key).count + 1,
            col,
            row,
          });
        } else {
          seenInBox.set(key, {
            count: 1,
            col,
            row,
          });
        }
      }
    }

    const boxWithOne = [...seenInBox.entries()].find(([, value]) => value.count === 1);

    if (boxWithOne) {
      const { col, row } = boxWithOne[1];
      return {
        found: true,
        index: col + row * cellsInColumn,
        value: number,
      };
    }
  }

  return {
    found: false,
    index: null,
    value: null,
  };
};

const findNakedSingle = (cells) => {
  for (let index = 0; index < cells.length; index++) {
    if (cells[index] !== null) {
      continue;
    }

    const col = index % cellsInColumn;
    const row = Math.floor(index / cellsInRow);

    const available = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const possible = [];

    avLoop: while (available.length) {
      const number = available.pop();

      // check row and col
      for (let i = 0; i < cellsInRow; i++) {
        const rowIndex = row * cellsInRow + i;
        const colIndex = col + i * cellsInRow;

        if (rowIndex !== index && cells[rowIndex] === number) {
          continue avLoop;
        }

        if (colIndex !== index && cells[colIndex] === number) {
          continue avLoop;
        }
      }

      // check sudoku box
      // assuming box is 3x3
      const boxStartRow = Math.floor(row / 3) * 3;
      const boxStartCol = Math.floor(col / 3) * 3;
      const boxEndRow = boxStartRow + 3;
      const boxEndCol = boxStartCol + 3;

      for (let i = boxStartRow; i < boxEndRow; i++) {
        for (let j = boxStartCol; j < boxEndCol; j++) {
          const boxIndex = i * cellsInRow + j;

          if (boxIndex !== index && cells[boxIndex] === number) {
            continue avLoop;
          }
        }
      }

      possible.push(number);
    }

    if (possible.length === 1) {
      return {
        found: true,
        index,
        value: possible[0],
      };
    }
  }

  return {
    found: false,
    index: null,
    value: null,
  };
};

const findIntersection = (cells) => {
    
};

const backtrack = (rules, meta, cells, i = 0) => {
  if (i === cells.length) {
    return true;
  }

  if (cells[i] !== null) {
    return backtrack(rules, meta, cells, i + 1);
  }

  const available = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  while (available.length) {
    const value = available.pop();

    if (isValid(rules, meta, cells, value, i)) {
      cells[i] = value;

      if (backtrack(rules, meta, cells, i + 1)) {
        return true;
      }
    }
  }

  cells[i] = null;
  return false;
};

const solve = (rules, meta, cells) => {
  const solved = cells.slice();

  let result;
  do {
    result = findHiddenSingle(solved)
          || findNakedSingle(solved)
          || findIntersection(solved);

    if (result.found) {
      solved[result.index] = result.value;
    }
  } while (result.found);

  // backtrack(rules, meta, solved);

  return solved;
};

const print = (cells) => {
  const str = cells.reduce((acc, cell, i) => {
    if (i % cellsInColumn === 0) {
      acc += '\n';
      
      if (i !== 0 && i % (cellsInColumn * 3) === 0) {
        acc += '-'.repeat(cellsInColumn * 2);
        acc += '\n';
      }
    }

    acc += i % 3 === 0 ? '|' : ' ';
    acc += cell === null ? ' ' : cell;

    return acc;
  }, '');

  console.log(str);
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

(async () => {
  const rules = [
    RuleType.NORMAL_SUDOKU,
    // RuleType.THERMO,
  ];

  // const board = (await import('./data.json', { assert: { type: 'json' } })).default;
  // const cells = board.cells.map((cell) => cell.revealed ? cell.answer : null);
  // console.log(cells);

  const easy = [
    1, 5, 8, 3, null, 6, 4, null, 7,
    4, 2, null, null, 7, 9, null, 3, null,
    null, null, null, null, 4, 8, 5, null, 6,
    null, 4, null, null, 9, 3, null, null, null,
    3, 1, null, null, null, 2, 9, null, null,
    null, null, null, 4, 1, 5, null, 7, 2,
    null, 8, null, 2, 6, null, null, null, 9,
    null, 7, null, 9, 3, null, null, null, 8,
    null, null, 4, null, null, null, 2, null, null,
  ];

  let ts = Date.now();

  {
    const solved = solve(rules, {}, easy.slice());
    print(solved);
  }

  console.log('time for easy', Date.now() - ts, 'ms');


  const medium = [
    null, 7,    8,    null, null, null, 4,    null, 3,    null,
    null, null, null, null, null, null, null, 2,    6,    null,
    null, 7,    null, null, null, 5,    null, null, 1,    null,
    null, null, null, 8,    7,    null, null, null, null, 9,
    null, 8,    null, null, null, null, null, null, null, 2,
    null, null, null, null, null, null, null, 8,    null, 6,
    null, null, null, null, null, 5,    null, null, null, null,
    null, null, null, null, null, 3,    null, 4,    null, null,
    null
  ];

  ts = Date.now();

  {
    const solved = solve(rules, {}, medium.slice());
    print(solved);
  }

  console.log('time for medium', Date.now() - ts, 'ms');

  const hard = [
    8, null, null, null, null, null, null, null, null,
    null, null, 3, 6, null, null, null, null, null,
    null, 7, null, null, 9, null, 2, null, null,
    null, 5, null, null, null, 7, null, null, null,
    null, null, null, null, 4, 5, 7, null, null,
    null, null, null, 1, null, null, null, 3, null,
    null, null, 1, null, null, null, null, 6, 8,
    null, null, 8, 5, null, null, null, 1, null,
    null, 9, null, null, null, null, 4, null, null
  ];

  ts = Date.now();

  {
    const solved = solve(rules, {}, hard.slice());
    print(solved);
  }

  console.log('time for hard', Date.now() - ts, 'ms');
})()
// (() => {
//   const difficulty = 'hard';
//   const rules = [
//     RuleType.NORMAL_SUDOKU,
//     RuleType.THERMO,
//   ];

//   const ts = Date.now();

//   for (let i = 0; i < 1; i++) {
//     console.log(JSON.stringify(generateBoard(difficulty, rules)));
//   }

//   console.log('time', Date.now() - ts, 'ms');
// })()

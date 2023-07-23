package main

import (
	"fmt"
	"time"
	"math"
	"math/rand"
)

var cellsInRow = 9
var cellsInColumn = 9

type RuleType string

const (
  NORMAL_SUDOKU RuleType = "normal-sudoku"
  KINGS_MOVE = "kings-move"
  KNIGHTS_MOVE = "knights-move"
  KILLER_SUDOKU = "killer-sudoku"
  THERMO = "thermo"
  SUM_ARROW = "sum-arrow"
)

type Cell struct {
	value int
	answer int
	revealed bool
	corner []int
	middle []int
	col int
	row int
	colors []int
}

type CellPosition struct {
	col int
	row int
}

type Cage struct {
	sum int
	path []CellPosition
}

type Thermo struct {
	path []CellPosition
}

type SumArrow struct {
	sum int
	path []CellPosition
}

type Meta struct {
	cages []Cage
	thermos []Thermo
	sumArrows []SumArrow
}

type MinMax struct {
	min int
	max int
}

var difficultyLevels = map[string]int {
	"easy": 36,
	"normal": 30,
	"hard": 23,
	"expert": 17,
}


var ruleWeights =  map[RuleType]int {
  NORMAL_SUDOKU: 0,
  KINGS_MOVE: 4,
  KNIGHTS_MOVE: 7,
  KILLER_SUDOKU: 0,
  THERMO: 4,
  SUM_ARROW: 0,
};

func makeRange(min, max int) []int {
	a := make([]int, max-min+1)

	for i := range a {
			a[i] = min + i
	}

	return a
}

func contains[T int | string](s []T, v T) bool {
	for _, e := range s {
		if e == v {
			return true
		}
	}

	return false
}

func shuffleArray[T any](array *[]T) {
  for i := len(*array) - 1; i > 0; i-- {
    j := rand.Intn(i + 1)
    temp := (*array)[i]
    (*array)[i] = (*array)[j]
    (*array)[j] = temp
  }
}

func pop[T any](array *[]T) T {
	length := len(*array)
	res := (*array)[length-1]
	(*array) = (*array)[:length-1]
	return res
}

func push[T any](array *[]T, value T) {
	(*array) = append(*array, value)
}

func pluck[T any](array *[]T, index int) T {
	value := (*array)[index]
	(*array) = append((*array)[:index], (*array)[index+1:len(*array)]...)

	return value
}

func keys[T any](array []T) []int {
	keys := make([]int, len(array))

	for i := range array {
		keys[i] = i
	}

	return keys
}

func unshift[T any](array *[]T, value T) {
	(*array) = append([]T{value}, (*array)...)
}

func findIndex[T any](array []T, predicate func(T) bool) int {
	for i, v := range array {
		if predicate(v) {
			return i
		}
	}

	return -1
}

func generateThermos() []Thermo {
  thermos := []Thermo{}

  thermoSizeRange := MinMax{
    min: 2,
    max: 6,
  }

  thermoCountRange := MinMax{
    min: 2,
    max: 4,
  }

  thermoCount := int(math.Floor(rand.Float64() * float64(thermoCountRange.max - thermoCountRange.min + 1))) + thermoCountRange.min

  occupiedCells := []int{}
  freeCellIndexes := makeRange(0, cellsInColumn * cellsInRow - 1)
  shuffleArray(&freeCellIndexes)

  outer: for i := 0; i < thermoCount; i++ {
    iter := 0

    size := int(math.Floor(rand.Float64() * float64(thermoSizeRange.max - thermoSizeRange.min + 1))) + thermoSizeRange.min
    path := []CellPosition{}

    index := pop(&freeCellIndexes)
    col := index % cellsInColumn
    row := index / cellsInColumn

    for len(path) < size {
      iter++

      if iter > 1000 {
        i--
        continue outer
      }

      if (rand.Float64() > 0.5) {
				d := 0
				if (rand.Float64() > 0.5) {
					d = 1
				} else {
					d = -1
				}
        newCol := col + d
        newIndex := newCol + row * cellsInColumn

        if newCol < 0 || newCol >= cellsInColumn {
          continue
        }

        if contains(occupiedCells, newIndex) {
          continue
        }

        col = newCol
      } else {
				d := 0
				if (rand.Float64() > 0.5) {
					d = 1
				} else {
					d = -1
				}
        newRow := row + d
        newIndex := col + newRow * cellsInColumn

        if newRow < 0 || newRow >= cellsInRow {
          continue
        }

        if contains(occupiedCells, newIndex) {
          continue
        }

        row = newRow
      }

      newIndex := col + row * cellsInColumn
			push(&occupiedCells, newIndex)

      push(&path, CellPosition{ col, row })
    }

    push(&thermos, Thermo{ path })
  }

  return thermos
}

func generateMeta(rules []RuleType) Meta {
  meta := Meta{}

  for _, rule := range rules {
		switch rule {
      // case KILLER_SUDOKU:
      //   meta.cages = generateCages()

      case THERMO:
        meta.thermos = generateThermos()

      // case SUM_ARROW:
        // meta.sumArrows = generateArrowSums()
    }
  }

  return meta
}

func isValidNormalSudoku(meta Meta, cells []int, number int, index int) bool {
  col := index % cellsInRow
  row := index / cellsInRow

  // check row and col
  for i := 0; i < cellsInRow; i++ {
    rowIndex := row * cellsInRow + i
    colIndex := col + i * cellsInRow

    if (rowIndex != index && cells[rowIndex] == number) {
      return false
    }

    if (colIndex != index && cells[colIndex] == number) {
      return false
    }
  }

  // check sudoku area
  // assuming area is 3x3
  areaStartRow := row / 3 * 3
  areaStartCol := col / 3 * 3
  areaEndRow := areaStartRow + 3
  areaEndCol := areaStartCol + 3

  for i := areaStartRow; i < areaEndRow; i++ {
    for j := areaStartCol; j < areaEndCol; j++ {
      areaIndex := i * cellsInRow + j

      if (areaIndex != index && cells[areaIndex] == number) {
        return false
      }
    }
  }

  return true
}

func isValidThermo(meta Meta, cells []int, number int, index int) bool {
  col := index % cellsInRow
  row := index / cellsInRow

  for _, thermo := range meta.thermos {
    indexInThermo := findIndex(thermo.path, func(c CellPosition) bool {
			return c.col == col && c.row == row
		})

    if (indexInThermo == -1) {
      continue
    }

    if (number <= indexInThermo) {
      return false
    }

    if (cellsInRow - number < len(thermo.path) - indexInThermo) {
      return false
    }

    for i := 0; i < len(thermo.path); i++ {
      if i == indexInThermo {
        continue
      }

      cell := thermo.path[i]
      cellIndex := cell.col + cell.row * cellsInRow
      cellValue := cells[cellIndex]

      if (cellValue == -1) {
        continue
      }

      if (i < indexInThermo && cellValue >= number) {
        return false
      }

      if (i > indexInThermo && cellValue <= number) {
        return false
      }
    }
  }

  return true
}

var ruleValidaroMap = map[RuleType]func(Meta, []int, int, int) bool{
  NORMAL_SUDOKU: isValidNormalSudoku,
  // KINGS_MOVE: isValidKingsMove,
  // KNIGHTS_MOVE: isValidKnightsMove,
  // KILLER_SUDOKU: isValidKillerSudoku,
  THERMO: isValidThermo,
  // SUM_ARROW: isValidArrowSum,
};

func isValid(rules []RuleType, meta Meta, cells []int, number int, index int) bool {
  for _, rule := range rules {
    if !ruleValidaroMap[rule](meta, cells, number, index) {
      return false
    }
  }

  return true
};

func solve(rules []RuleType, meta Meta, cells *[]int, i int) bool {
  if i == len(*cells) {
    return true
  }

  available := []int{1, 2, 3, 4, 5, 6, 7, 8, 9}

  for len(available) > 0 {
    value := pluck(
			&available,
			int(math.Floor(rand.Float64() * float64(len(available)))),
    )

    if isValid(rules, meta, (*cells), value, i) {
      (*cells)[i] = value

      if solve(rules, meta, cells, i + 1) {
        return true
      }
    }
  }

  (*cells)[i] = -1
  return false
}

func getEmptyCellIndex(cells []int) int {
  for i := 0; i < len(cells); i++ {
    if cells[i] == -1 {
      return i
    }
  }

  return -1
}

var iter = 0

func countSolutions(rules []RuleType, meta Meta, cells *[]int, count int) (int, error) {
	iter++

	if iter > 100_000 {
		return -1, fmt.Errorf("too many iterations")
	}
	
	// stop at two since we use this function as a sudoku validator
	if count > 1 {
		return count, nil
	}

	i := getEmptyCellIndex(*cells)

	if i != -1 {
		for num := 1; num <= 9; num++ {
			if isValid(rules, meta, *cells, num, i) {
				(*cells)[i] = num
				count, _ = countSolutions(rules, meta, cells, count)
				(*cells)[i] = -1
			}
		}
	} else {
		count++
	}

	return count, nil
}

func mask(cells []int, difficulty string, rules []RuleType, meta Meta) []int {
	outer: for {
		iter = 0

		masked := make([]int, len(cells))
		copy(masked, cells)
		// indexes := keys(masked)

		// shuffleArray(&indexes)

		indexes := []int{
      21, 41, 39, 34,  6, 28,  1, 33,  8,  9, 74, 65,
      77, 62, 13, 19, 57, 22, 25,  2, 18, 48,  0, 71,
      27, 59, 75, 30, 51, 76, 11, 67, 73, 49,  3, 58,
      63, 52, 36, 10, 54, 61, 53, 45, 15, 50, 72, 70,
      32, 46, 17, 26, 79, 37, 80, 20, 60,  7, 56, 23,
      78, 12, 29, 35, 14, 66, 42, 68,  4,  5, 24, 69,
      16, 64, 44, 47, 43, 40, 38, 31, 55,
		}

		maskedMax := len(masked) - 1 - difficultyLevels[difficulty]

		for _, rule := range rules {
			maskedMax += ruleWeights[rule]
		}

		for maskedCount := 0; maskedCount <= maskedMax; {
			randomIndex := pop(&indexes)

			value := masked[randomIndex]

			masked[randomIndex] = -1

			maskedCopy := make([]int, len(masked))
			copy(maskedCopy, masked)

			solutionCount, err := countSolutions(rules, meta, &maskedCopy, 0)

			if err != nil {
				continue outer
			}

			if solutionCount == 1 {
				maskedCount++
			} else {
				masked[randomIndex] = value
				unshift(&indexes, randomIndex)
			}
		}

		return masked
	}
}

type Result struct {
	cells []Cell
	meta Meta
}

func generateBoard(difficulty string, rules []RuleType) Result {
  // meta := generateMeta(rules)

  // solved := make([]int, cellsInRow * cellsInColumn)
	// for index := range solved {
	// 	solved[index] = -1
	// }

	// solve(rules, meta, &solved, 0)

	meta := Meta{
    thermos: []Thermo{
      {
        path: []CellPosition{
          { col: 3, row: 5 },
          { col: 4, row: 5 },
          { col: 5, row: 5 },
          { col: 5, row: 4 },
				},
      },
      {
        path: []CellPosition{
          { col: 6, row: 6 },
          { col: 6, row: 5 },
          { col: 7, row: 5 },
          { col: 8, row: 5 },
          { col: 8, row: 6 },
				},
      },
      {
        path: []CellPosition{
          { col: 1, row: 3 },
          { col: 1, row: 2 },
          { col: 1, row: 1 },
          { col: 0, row: 1 },
          { col: 0, row: 0 },
				},
      },
		},
  }
  solved := []int{
    5, 7, 8, 6, 9, 2, 4, 1, 3, 4, 3, 9,
    5, 8, 1, 7, 6, 2, 6, 2, 1, 7, 4, 3,
    9, 5, 8, 3, 1, 2, 4, 6, 5, 8, 7, 9,
    7, 5, 4, 9, 3, 8, 6, 2, 1, 9, 8, 6,
    1, 2, 7, 3, 4, 5, 1, 4, 3, 8, 5, 6,
    2, 9, 7, 8, 6, 5, 2, 7, 9, 1, 3, 4,
    2, 9, 7, 3, 1, 4, 5, 8, 6,
	}

	masked := mask(solved, difficulty, rules, meta)

  cells := []Cell{};

  for i := 0; i < len(solved); i += 1 {
    push(&cells, Cell{
      value: -1,
      answer: solved[i],
      revealed: masked[i] != -1,
      corner: []int{},
      middle: []int{},
      col: i % cellsInRow,
      row: i / cellsInRow,
      colors: []int{},
    });
  }

  return Result{
    cells,
    // meta: updateMeta(rules, meta, cells),
    meta,
  };
}

func main() {
	rand.Seed(time.Now().UnixNano())

	difficulty := "hard"
  rules := []RuleType{
		NORMAL_SUDOKU,
		THERMO,
	}

  ts := time.Now().UnixMilli()

  for i := 0; i < 10; i++ {
    generateBoard(difficulty, rules)
  }

  fmt.Println("time", time.Now().UnixMilli() - ts, "ms")
}

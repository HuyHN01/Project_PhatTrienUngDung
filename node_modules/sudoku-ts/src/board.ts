/**
 * Squares hold the values represented in the board. 
 * If a squares value is initialized as a nonzero number, it will be constant
 */
interface square {
    constant: boolean
    value: number
}


/**
 * Each Board has nine Boxes. Each box has nine squares
 */
class Box {
    private squares: square[]
    private stringConstructor(input: string[]) {
        if (input.length != 9)
            throw new Error("Input string array must have exactly 9 integers")
        for (let i = 0; i < input.length; ++i) {
            if (input[i] == "")
                throw new Error("Each element in the input string array must have a value")
            if (input[i].length != 1)
                throw new Error("Every element in the array must have exactly one integer")
            this.squares[i] = { constant: Boolean(parseInt(input[i])), value: parseInt(input[i]) }
        }
    }
    /**
     * Creates a board object using data provided in parameter
     * @param valueList An array of strings or numbers representing the initial values for this
     * Box's squares
     * @returns nothing
     */
    constructor(valueList: number[] | string[]) {
        const isStringObj = (obj: number[] | string[]): obj is string[] => { return (typeof (obj as string[])[0] == "string") };
        this.squares = new Array<square>(9)
        if (valueList.length != 21)
            throw new Error("Box input must be of size 21")
        if (isStringObj(valueList)) {
            this.stringConstructor(valueList)
            return
        }
        valueList.forEach(n => { return Math.floor(n) })
        for (let i = 0; i < 3; ++i) {
            this.squares[i * 3] = { constant: Boolean(valueList[i * 9]), value: valueList[i * 9] }
            this.squares[i * 3 + 1] = { constant: Boolean(valueList[i * 9 + 1]), value: valueList[i * 9 + 1] }
            this.squares[i * 3 + 2] = { constant: Boolean(valueList[i * 9 + 2]), value: valueList[i * 9 + 2] }
        }
    }
    /**
     * Gets the square in the index specified. Index value must be [0,9] to avoid throwing an Error
     * @param index Index of the square to return
     * @returns square in index
     */
    getSquare(index: number) {
        if (index < 0 || index > 9)
            throw new Error("Index:" + index + " is out of range. Index value must be [0,9]")
        return this.squares[index]
    }
    /**
     * A valid box is one where no square has the same value as any other square.
     * The only exception to this is if the square has a value of zero.
     * @returns a boolean
     */
    isValid() {
        let seen = Array<boolean>(9).fill(false)
        for (let i = 0; i < 9; ++i) {
            if (!this.squares[i].value)
                continue
            if (seen[this.squares[i].value - 1]) {
                return false
            }
            seen[this.squares[i].value - 1] = true
        }
        return true
    }
}

export default class Board {
    private boxes: Box[]
    /**
     * A valid row is one where no square has the same value as any other square.
     * The only exception to this is if the square has a value of zero.
     * @param row index of the row to be inspected
     * @returns a boolean
     */
    private rowIsValid(row: number) {
        let valid = true
        let seen = Array<boolean>(9).fill(false)
        this.getRow(row).forEach(square => {
            if (!square.value)
                return
            if (seen[square.value - 1]) {
                valid = false
                return
            }
            seen[square.value - 1] = true
        })
        return valid
    }
    /**
     * A valid column is one where no square has the same value as any other square.
     * The only exception to this is if the square has a value of zero.
     * @param col index of the column to be inspected
     * @returns a boolean
     */
    private colIsValid(col: number) {
        let valid = true
        let seen = Array<boolean>(9).fill(false)
        this.getCol(col).forEach(square => {
            if (!square.value)
                return
            if (seen[square.value - 1]) {
                valid = false
                return
            }
            seen[square.value - 1] = true
        })
        return valid
    }
    /**
     * Gets the row at index n and returns the value of each square in an Array
     * @param n index of the row to get
     * @returns An array of squares
     */
    private getRow(n: number) {
        let row = Array<square>(9)
        for (let i = 0; i < 9; ++i)
            row[i] = this.getSquare(n, i)
        return row
    }
    /**
     * Gets the column at index n and returns the value of each square in an Array
     * @param n index of the column to get
     * @returns An array of squares
     */
    private getCol(n: number) {
        let col = Array<square>(9)
        for (let i = 0; i < 9; ++i)
            col[i] = this.getSquare(i, n)
        return col
    }
    /**
     * Creates a Board from an Array of 81 numbers
     * @param input must have a length of 81
     * @returns nothing
     */
    constructor(input: number[]) {
        this.boxes = new Array<Box>(9)
        if (input.length != 81)
            throw new Error("input array must have size of 81")
        for (let i = 0; i < 3; ++i) {
            this.boxes[i * 3] = new Box(input.slice(i * 27, i * 27 + 21))
            this.boxes[i * 3 + 1] = new Box(input.slice(i * 27 + 3, i * 27 + 24))
            this.boxes[i * 3 + 2] = new Box(input.slice(i * 27 + 6, i * 27 + 27))
        }
        return
    }
    /**
     * Row and column parameters must both have a value of [0,9]
     * @param row index to get
     * @param col index to get
     * @returns The square at the given row and column
     */
    getSquare(row: number, col: number) {
        row = Math.floor(row)
        col = Math.floor(col)
        let rowValid = row > 0 && row < 9
        let colValid = col > 0 && col < 9
        if (!rowValid || !colValid)
            throw new Error("Row and index must both have a value [0,9]")
        let box_i = (Math.floor(row / 3) * 3) + Math.floor(col / 3)
        let square_i = (row % 3) * 3 + (col % 3)
        return this.boxes[box_i].getSquare(square_i)
    }
    /**
     * A Board is valid if every row, box, and column are valid
     * @returns a boolean
     */
    isValid() {
        for (let i = 0; i < 9; ++i) {
            let box_valid = this.boxes[i].isValid()
            let col_valid = this.colIsValid(i)
            let row_valid = this.rowIsValid(i)
            if (!row_valid || !col_valid || !box_valid)
                return false
        }
        return true;
    }
    /**
     * Iterates through this Board's squares to create a string representation of them
     * @returns A string of this Board's values
     */
    asString() {
        let valueString = ""
        for (let i = 0; i < 81; ++i)
            valueString += this.getSquare(i / 9, i % 9).value.toString()
        return valueString
    }
    /**
     * Solves a copy of this Board using a backtracking algorithm
     * @param callBackFn Function that gets called whenever a square's value is changed
     * @returns A solved Board
     */
    solve(callBackFn?: (board: Board) => void) {
        let callBack = (_: Board) => { }
        if (callBackFn)
            callBack = callBackFn
        let boardValues = Array<number>(81)
        for (let i = 0; i < 81; ++i)
            boardValues[i] = this.getSquare(Math.floor(i / 9), i % 9).value
        let solvedBoard = new Board(boardValues)
        let i = 0
        while (i < 81) {
            let currentSquare = solvedBoard.getSquare(i / 9, i % 9)
            if (currentSquare.constant) {
                ++i
                continue
            }
            solvedBoard.getSquare(i / 9, i % 9).value += 1
            callBack(solvedBoard)
            while (!solvedBoard.isValid() && solvedBoard.getSquare(i / 9, i % 9).value < 10) {
                solvedBoard.getSquare(i / 9, i % 9).value += 1
                callBack(solvedBoard)
            }
            if (solvedBoard.getSquare(i / 9, i % 9).value == 10) {
                solvedBoard.getSquare(i / 9, i % 9).value = 0
                callBack(solvedBoard)
                --i
                while (solvedBoard.getSquare(i / 9, i % 9).constant)
                    --i
                continue
            }
            if (solvedBoard.isValid())
                ++i
        }
        return solvedBoard
    }
}
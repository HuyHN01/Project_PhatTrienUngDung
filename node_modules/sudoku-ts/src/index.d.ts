export = Board

declare class Board {
    constructor(input: number[])
    getSquare(row: number, col: number): Board.square
    isValid(): boolean
    asString(): string;
    solve(callBackFn?: (board: Board) => void): Board
}

declare namespace Board {
    export interface square {
        constant: boolean
        value: number
    }
}
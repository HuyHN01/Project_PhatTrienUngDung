# Overview

A typescript implementation of a Sudoku puzzle solving algorithm. To solve any given puzzle, first represent its initial values as an array of numbers. Then, creting a `Board` object and calling the `solve()` function returns a solved board. The Board class provides an `asString` function which returns the Board's values as a string. The algorithm used to solve the puzzle is a [backtracking algorithm](https://en.wikipedia.org/wiki/Sudoku_solving_algorithms#Backtracking "Wikipedia Article")

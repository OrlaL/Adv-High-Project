#main.py

#Imports
from flask import Flask, jsonify, render_template, request
import numpy as np
import random

app = Flask(__name__)

#Generate Puzzle Grid, 2D-Array (EU1, FR1)
#Function to return the grid as a 2D array with each index having
#coordinates and a number that correlates with a colour
def createGrid():              
    grid = []
    colours = ["1", "2", "3", "4", "5", "6", "7", "8"]

    #Loops through the array to assign values
    for i in range(8):
        grid.append([])
        for j in range(8):
            #Assign the coordinates and colour code to each index
            grid[i].append([np.array([i+1, j+1]), colours[i]])  

    return grid

#Randomise Solution (EU1, FR1)
#Function that randomises the solution by swapping the positions
#of values in the array then returns the unique grid
def randomiseSolution(grid):                                                     
    for i in range(len(grid)):                       
        for j in range(-1, 1):
            #Assign to the current index coordinates                   
            point1 = grid[i][j][0]
            for k in range(len(grid)): 
                #Check that the connection is larger than the minimum length
                if k == i or len(grid[k]) == 4:
                    continue
                for l in range(-1, 1): 
                    #Assign to the next index coordinates            
                    point2 = grid[k][l][0]       
                    #Check the euclidean distance between these two points    
                    if np.linalg.norm(point1 - point2) == 1.0 and np.random.rand()>0.5:
                        grid[k].pop(l)
                        #Randomly either append a new tile or insert a new value 
                        if j == -1:
                            grid[i].append([point2, grid[i][0][1]])        
                        else:
                            grid[i].insert(0, [point2, grid[i][0][1]])
                        return grid
    return grid

#Generate Puzzle Grid & Generate Solution Grid (EU1, FR1)
#Function to create arrays of the puzzle grid and solution grid
def generateGrid(grid, solution=False):
    puzzle = [['0'] * 8 for i in range(8)]

    for i in range(len(grid)):
        start_x, start_y = grid[i][0][0] - 1  
        end_x, end_y = grid[i][-1][0] - 1     

        if solution:
            for j in range(len(grid[i])):  # Loop through each element in grid[i]
                x, y = grid[i][j][0] - 1
                puzzle[x][y] = grid[i][j][1] 
        else:
            puzzle[start_x][start_y] = grid[i][0][1] 
            puzzle[end_x][end_y] = grid[i][-1][1]  

    return puzzle  

#Sort Leaderboard, Insertion Sort (EU6, FR4, FR5)
#Procedure to read the contents of the file and sort it into ascending order
def sortLeaderboard(file):
    i = 0
    array = [] 
    with open(file) as readfile:  # Open and read the file
        line = readfile.readline().rstrip('\n')
        while line:
            array.append(line)  # Add the time to an array
            line = readfile.readline().rstrip('\n')
            i += 1

    max = len(array)
    for outer in range(1, max):  # Scan array n-1 times
        inner = outer
        while inner > 0 and array[inner-1] > array[inner]:
            # Progressively shorten items scanned
            array[inner-1], array[inner] = swap(array[inner-1], array[inner])
            inner = inner - 1

    with open(file, "w") as writefile:  # Open and write to file
        for i in range(len(array)):
            writefile.write(str(array[i]) + '\n')

#Swap Leaderboard Values (EU6, FR4, FR5)
#Function that swaps two values
def swap(item1, item2):
    return item2, item1

#Receive and store time (EU5, FR3, FR7, FR16)
#Receive and write the time to file from the frontend then sort the file using the insertion sort
@app.route('/getTime', methods=['POST'])
def submit_time():
    data = request.get_json()  #Get the data
    time_in_seconds = data.get('time')
    print(time_in_seconds)
    #If no time is provided, return an error
    if time_in_seconds is None:
        return jsonify({"error": "Time is required"}), 400

    #Add the new time to the leaderboard file
    file = "leaderboard.csv"
    with open(file, "a") as writefile:
        writefile.write(str(time_in_seconds) + '\n')

    #Sort the leaderboard
    sortLeaderboard(file)

#Send Initial Grid template to frontend (FR16)
#Sends the template for the grid to the web server
@app.route('/')
def index():
    regularPuzzle = createGrid()
    return render_template("main.html", puzzle=regularPuzzle)  # Pass puzzle to template

#Send Initial Puzzle Grid to frontend (EU1, FR16)
#Called when the start button is clicked to randomise a puzzle
@app.route('/getGrid')
def getGrid():
    base = createGrid()

    for _ in range(100):  # Ensure the puzzle is shuffled but still solvable
        base = randomiseSolution(base)
        random.shuffle(base)

    global regularPuzzle
    regularPuzzle = generateGrid(base, solution=False)
    global solutionGrid
    solutionGrid = generateGrid(base, solution=True) 

    return jsonify(regularPuzzle)  #Returns random puzzle as JSON

#Send Completed Grid to frontend (EU3, FR16)
#Returns the solution when a user gives up by sending the global solution
#variable that is generated alongside the puzzle.
@app.route('/getSolution')
def getSolution():
    return jsonify(solutionGrid)  #Sends the solution  as JSON

#Send leaderboard values to frontend (EU6, FR9, FR16)
#Sends the top 10 values from the csv file to the frontend server
@app.route('/getLeaderboard')
def getLeaderboard():
    leaderboard = []
    file = "leaderboard.csv"
    try: #Check that a file exists
        with open(file) as readfile:  #Opens and reads the file
            for i in range(10): #Loops through the top 10 times in the file
                line = readfile.readline().rstrip('\n')
                leaderboard.append(line)  # Add the time to an array

    except FileNotFoundError:
        pass  #If no file exists then return empty leaderboard

    return jsonify(leaderboard) #Sends the leadboard as JSON

if __name__ == '__main__':
    app.run(debug=True)

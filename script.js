//script.js

//Create and assign variables
let timerInterval; 
let seconds = 0;
let minutes = 0;
let grid = [];
let gameStarted = false;
let drawing = false;
let currentPath = [];
let startTile = null;

//Event listeners for mouse actions
document.addEventListener("mousedown", onMouseDown);
document.addEventListener("mouseover", onMouseEnter);
document.addEventListener("mouseup", onMouseUp);
document.addEventListener("click", onClick);


//Integration

//startGame (EU1, FR1, FR8, FR14, FR16)
//Starts the game by generating the grid and starting the timer.
function startGame() {
    //Get the generated grid from the backend server
    fetch("/getGrid")
        .then(response => {
            if (!response.ok) {
                throw new Error(`${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Grid received:", data);
            grid = data;
            updateGrid(data);
            startTimer(); //Start the game timer
            gameStarted = true;
        })
        .catch(error => console.error("Error loading grid:", error));
}

//Start Timer (EU5, FR3, FR7)
//Increases the time by 1 every second the game is being played. 
function startTimer() {
    clearInterval(timerInterval); //Clears any previous timers
    seconds = 0;
    minutes = 0;

    //Loops to increment timer every second
    timerInterval = setInterval(() => {
        seconds++;
        if (seconds === 60) {
            minutes++;
            seconds = 0;
        }
        //Updates the displayed timer div
        document.querySelector(".timer p").textContent =
            (minutes < 10 ? "0" : "") + minutes + ":" +
            (seconds < 10 ? "0" : "") + seconds;
    }, 1000);
}

//updateGrid (EU1, FR1, FR6, FR14)
//Updates the displayed grid with the correct colours, leaving blank tiles white
function updateGrid(gridData) {
    const tiles = document.querySelectorAll(".tile");
    let i = 0;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const value = gridData[row][col];
            const tile = tiles[i];
            tile.dataset.value = value;
            tile.dataset.row = row;
            tile.dataset.col = col;

            if (value !== "0") {
                tile.style.backgroundColor = getColour(value);
            } else {
                tile.style.backgroundColor = "white";
            }
            i++;
        }
    }
}

//getColour(EU1, FR1, FR6, FR14)
function getColour(value) {
    const colours = {
        "1": "#FF6B57",
        "2": "#FFC98A",
        "3": "#B4FFA8",
        "4": "#59AB6D",
        "5": "#A8B9FF",
        "6": "#2B58B6",
        "7": "#AD3BB0",
        "8": "#F9A8FF"
    };
    return colours[value] || "#FFFFFF";
}

//Connect Tiles: On Mouse Down (EU2, FR2)
//Activated when user holds mouse down and starts the connection
function onMouseDown(event) {
    if (!gameStarted) return;
    let tile = event.target;
    if (tile.classList.contains("tile") && tile.dataset.value !== "0") {
        drawing = true;
        startTile = tile;
        currentPath = [tile];
    }
}

//Connect Tiles: On Mouse Enter (EU2, FR2)
//When a user enters a tile it is validated to ensure it is in the grid and not overlapping then added to the path
function onMouseEnter(event) {
    if (!drawing) return;
    let tile = event.target;
    if (withinGrid(tile)){
        alert("Error! Stay inside the grid.");
        clearPath(startTile.dataset.value);
        drawing = false;
        return;
    } 

    let lastTile = currentPath[currentPath.length - 1];
    let validMove = checkAdjacent(lastTile, tile);
    //change validation to functions
    if (validMove && checkOverlap(tile)) {
        tile.dataset.value = startTile.dataset.value;
        tile.style.backgroundColor = getColour(startTile.dataset.value);
        currentPath.push(tile);
    }
    if(!validMove){
        alert("Error! Connections must be adjacent.");
        clearPath(startTile.dataset.value);
        drawing = false;
    }
}

//Connect Tiles: On Mouse Up (EU2, FR2, FR11)
//When the user releases the mouse, start and end points are validated before a connection is made
//and a completion check is ran.
function onMouseUp(event) {
    if (!drawing) return;
    drawing = false;
    let tile = event.target;

    if(colourMatch(tile)){
        alert("Error! Colours must match.");
        clearPath(startTile.dataset.value);
    }

    let completed = checkCompletion()
    //Check if the puzzle is complete after the move
    if (completed) {
        clearInterval(timerInterval); //Stop the timer if completed
        let time = minutes + (seconds/100)
        alert('Game completed! Time: '+ time);
        sendTimeToLeaderboard(minutes, seconds);
    }
}

//Clear Path (EU2, FR2)
//Clears a connection by making all the background colours white.
function clearPath(tileValue) {
    let tiles = document.querySelectorAll(".tile");
    tiles.forEach(t => {
        let isStartOrEnd = grid[t.dataset.row][t.dataset.col] !== "0";  //Check if it's a start or end point
        if (t.dataset.value === tileValue && !isStartOrEnd) {  //Clear connecting tiles
            t.dataset.value = "0";  //Reset the tile value
            t.style.backgroundColor = "white";  //Change the background color to white
            
        }
    });currentPath = []; //Clear the current path
}

//Undo Connection (EU2, FR17)
//Allows a user to undo a connection they have made by clicking on the path
function onClick(event) {
    let tile = event.target;
    //Check that there is a connection
    if (!gameStarted || tile.dataset.value === "0") return;
    let row = tile.dataset.row;
    let col = tile.dataset.col;

    //If the clicked tile is a start or end point, do nothing
    if (grid[row][col] !== "0") return;

    clearPath(tile.dataset.value)
}

//Show Solution (EU3, FR6)
//Recieves the completed grid and displays it when the user clicks the give up button
function showSolution() {
    //Check if the game has started
    if (!gameStarted) {
        alert("Error! Start the game first.");
        return;
    }
    fetch("/getSolution") //Recieve solution when button is clicked
        .then(response => response.json())
        .then(data => {
            console.log("Solution grid received:", data);
            updateGrid(data); //Show the solution
            clearInterval(timerInterval); //Stop the timer
            alert("Solution Revealed!");
        })
        .catch(error => console.error("Error fetching solution:", error));
}

//Update Leaderboard (EU6, FR9)
//Recieves the 10 fastest times and displays them in a MM:SS format in an ordered list
function updateLeaderboard() {
    fetch("/getLeaderboard")
        .then(response => response.json())
        .then(data => {
            let leaderboardDiv = document.getElementById("leaderboard");
            leaderboardDiv.innerHTML = "<h2>Leaderboard</h2>";
            //Display if there is no leaderboard values
            if (data.length === 0) {
                leaderboardDiv.innerHTML += "<p>Leaderboard Empty!</p>";
                return;
            }
            let list = "<ol>";
            data.forEach(time => {
                let [minutes, seconds] = time.toString().split("."); //Split time into minutes and seconds
                minutes = parseInt(minutes, 10);
                seconds = Math.round(parseFloat("0." + seconds) * 100); //Convert decimals into seconds
                if (seconds === 60) { //If the seconds round up to 60 add a minute
                    minutes += 1;
                    seconds = 0;
                }
                //Format as MM:SS and add to list
                let formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
                list += `<li>${formattedTime}</li>`;
            });
            list += "</ol>";
            leaderboardDiv.innerHTML += list;
        })
        .catch(error => console.error("Error loading leaderboard:", error));
}


//Input Validation

//Within grid (FR19)
//Checks that a move remains inside the grid
function withinGrid(tile){
    if(!tile.classList.contains("tile") && drawing){
        return true;
    }
    return false;
}

//Check completion (EU4, FR12)
//Loops through the grid to validate that the game has been completed.
function checkCompletion() {
    //Loop through each tile in the grid
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            let tile = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            let gridValue = grid[row][col];
            
            //Don't check empty tiles
            if (gridValue === "0") continue;
            
            //Check if the tile has been correctly filled with the right color
            if (tile.dataset.value !== gridValue) {
                return false;  // Found an incorrect tile
            }
            //Check if the tile is part of the same connected path (not isolated)
            if (!isConnected(row, col, gridValue)) {
                return false;  //Found a tile that's not correctly connected
            }
        }
    }
    return true;  //All tiles are correctly filled and connected
}

//Connection Check (EU4, FR11, FR12)
//Validates the connection between tiles.
function isConnected(row, col, value) {
    //Assign adjacent tiles
    let adjacentTiles = [
        [row - 1, col], //Top
        [row + 1, col], //Bottom
        [row, col - 1], //Left
        [row, col + 1]  //Right
    ];
    
    for (let [r, c] of adjacentTiles) {
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            let tile = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (tile && tile.dataset.value === value) {
                return true;  //If there is a connected tile of the same color
            }
        }
    }
    return false;  //When no connected tile
}

//Check adjacent (FR18)
//Check if the move is valid by validating the tile is next to the previous tile.
function checkAdjacent(lastTile, newTile) {
    let rowDiff = Math.abs(lastTile.dataset.row - newTile.dataset.row);
    let colDiff = Math.abs(lastTile.dataset.col - newTile.dataset.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

//Colour match (FR11)
//Validates the start and end colour of a connection.
function colourMatch(tile){
    if(tile.dataset.value !== startTile.dataset.value){
        return true;
    }
    return false;
}

//Check overlap (FR13)
//Validates that a connection doesn't overlap a previous connection
function checkOverlap(tile){
    if(tile.dataset.value === "0"){
        return true;
    }
    return false;
}


//Additional Requirements

//Send time to backend (EU5, FR3, FR7, FR16)
//Sends the final time on the timer to the backend to display on the leaderboard.
function sendTimeToLeaderboard(minutes, seconds) {
    let finalTime = minutes + (seconds/100);

    //Send time using POST
    fetch("/getTime", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ time: finalTime })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Time submitted successfully", data);
    })
    .catch(error => {
        console.error("Error submitting time:", error);
    });
}



/*!
 * Mosaic [WIP]
 *
 * Licensing info here
 *
 * Copyright 2015 Arielle Chapin
 * github.com/ariellebryn
 */

 /*		Helpers		*/
 function noop() {}

  var error = (typeof console === 'undefined') ? noop :
	  function(msg) {
	    console.error(msg);
	  };

 /*		Tile		*/
 var Tile = function(element, id) {
 	// Defaults (-1 means a default placement will be found)
 	this.row = -1;
 	this.col = -1;
 	this.width = 1;
 	this.height = 1;

 	// ID for easy reference if tile moves
 	this.id = id;

 	// DOM element
 	this.element = element;
 }

 // Parses the class names of the element to
 // find its specs
 // TODO: No way can I use this shit
 Tile.prototype.parseElement = function(colMax) {
 	var classes = this.element.className.split(" ");

	for(var i = 0; i < classes.length; i++) {
		var split = classes[i].split("-");
		var critical = split[0];
		switch (critical) {
			case 'row':
				this.row = parseInt(split[1]);
				break;
			case 'col':
				this.col = parseInt(split[1]);
				if (this.col > colMax) {
					error("[Mosaic] Error: Element assigned to column " + this.col + ", but column maximum is " + colMax + ". Reassigned to column maximum.");
					this.col = colMax;
				}
				break;
			case 'width':
				this.width = parseInt(split[1]);
				if (this.width > colMax) {
					error("[Mosaic] Error: Element width is " + this.width + ", which is greater than the column maximum of " + colMax + ". Width reassigned to column maximum.");
					this.width = colMax;
				}
				break;
			case 'height':
				this.height = parseInt(split[1]);
				break;
		}
	}
 }

 // Sets the margin-top and margin-left of the element to the given values,
 // in percents 
 Tile.prototype.setMarginTopLeft = function(marginTop, marginLeft) {
 	console.log(this.element);
 	$(this.element).css('margin-top', marginTop + "%");
 	$(this.element).css('margin-left', marginLeft+ "%");
 }

 /*		Grid		*/
 var Grid = function(container, columns) {
 	this.container = container;
 	this.columns = columns;
 	this.colMax = columns - 1;

 	// TODO: Undo hard coding
 	this.tileSide = 8.9;
 	this.gutter = 1;

 	// Tile id counter
 	this.idCounter = 0;

 	// 2D Array to store positions of all tiles,
 	// default with first row
 	this.grid = [this.newRow()];

 	// Default position of a tile
 	// The first empty slot in the grid
 	this.defaultPos = {row: 0, col: 0};

 	// Associative array of DOM Elements to their corresponding Tile
 	this.tiles = {}; 
 }

 // Returns id and increments
 Grid.prototype.getNextId = function() {
 	return this.idCounter++;
 }

 // Reset grid and fill one row with default
 Grid.prototype.resetGrid = function() {
 	this.grid = [this.newRow];
 }

 // Reset default position
 Grid.prototype.resetDefaultPosition = function() {
 	this.defaultPos = {row: 0, col: 0};
 }

 // Change the internal working and re-lay out for new columns
 Grid.prototype.changeColumnSize = function(columns) {
 	// If no actual change, do nothing
 	if (columns === this.columns)
 		return;

 	this.columns = columns;
 	this.colMax = columns - 1;
 	this.resetGrid();
 	this.resetDefaultPosition();

 	this.layoutTiles();
 }

 // Get children of container
 Grid.prototype.getChildren = function() {
 	return this.container.children();
 }

 // Reads in the children of the container and
 // makes them into tiles
 Grid.prototype.readTiles = function() {
 	var children = this.getChildren();

 	for (var i = 0; i < children.length; i++) {
 		var el = children[i];
		var tile = new Tile(el, this.getNextId());
 		tile.parseElement(this.colMax);
 		this.tiles[tile.id] = tile;
 	}
 }

 // Get a copy of a default row
 Grid.prototype.newRow = function() {
 	var newRow = [];
 	var i = this.columns;
 	while (i--)
 		newRow.push(i + 1);
 	return newRow;
 }

 // Increment a row, adding a new row if necessary
 Grid.prototype.incrementRow = function(row) {
	row++;
	if (this.grid[row] == undefined) {
		this.grid[row] = this.newRow();
		this.printGrid();
	}
	return row;
 }

 Grid.prototype.checkNextPos = function(row, col) {
	// If beyond grid bounds or on a filled slot,
	// keep iterating through
	while (col > this.colMax || this.grid[row][col] < 0) {
		if (col > this.colMax) {
			row = this.incrementRow(row);
			col = 0;
		} else {
			col = col + (-1 * this.grid[row][col]);
		}
	}

	return {row: row, col: col};
 }

 // TODO: shorten
 Grid.prototype.findDefaultPosition = function(tile) {
 	var row, topRow, col, leftCol;
	row = topRow = this.defaultPos.row;
	col = leftCol = this.defaultPos.col;

	// Loop through finding process until a slot is found
	while (row - topRow < tile.height) {
		// If the width of the tile doesn't fit,
		// find next possible position
		if (!(this.grid[row][col] - tile.width >= 0)) {
			// Go to end of free space
			col = col + this.grid[row][col];

			var rowCol = this.checkNextPos(row, col);

			// Reset positional topRow and leftCol
			topRow = row = rowCol.row;
			leftCol = col = rowCol.col;
		} else {
			row = this.incrementRow(row);
		}
	}

	tile.row = topRow;
	tile.col = leftCol;
	this.fillPosition(tile);

	// If the default pos is now taken
	if (topRow == this.defaultPos.row && leftCol == this.defaultPos.col) {
		// Find next default position
		var newCol =  this.defaultPos.col + (-1 * this.grid[this.defaultPos.row][this.defaultPos.col]);
		var defRowCol = this.checkNextPos(this.defaultPos.row, newCol);
		this.defaultPos.row = defRowCol.row;
		this.defaultPos.col = defRowCol.col;
	}
	
	return tile;
 }

 // Takes the given tile and fills the grid
 Grid.prototype.fillPosition = function(tile) {
	for (var i = tile.row; i < tile.row + tile.height; i++) {
		for (var k = tile.col - 1; k >= 0; k--) {
			if (this.grid[i][k] < 0)
				break;
			else
				this.grid[i][k] = tile.col - k;
		}

		for (var j = tile.col; j < tile.col + tile.width; j++) {
			this.grid[i][j] = j - tile.col - tile.width;
		}
	}

	this.printGrid();
 }

 // TODO: Do better
 Grid.prototype.fillRowsUpTo = function(row) {
 	for (var i = 0; i <= row; i++) {
 		this.grid[i] = this.grid[i] === undefined ? this.newRow() : this.grid[i];
 	}
 }

 Grid.prototype.positionTile = function(tile) {
 	var multiplier = (this.tileSide + this.gutter);
 	tile.setMarginTopLeft(tile.row * multiplier, tile.col * multiplier);
 }

 Grid.prototype.layoutTiles = function() {
 	for(id in this.tiles) {
 		var tile = this.tiles[id];
 		if (tile === undefined) {
 			error("[Mosaic] Error: Tile with id " + id + " was undefined.");
 			continue;
 		}

 		if (tile.row == -1 || tile.col == -1) {
 			this.findDefaultPosition(tile);
 		} else {
 			// TODO: Check if beyond scope of rows
 			this.fillRowsUpTo(tile.row + tile.height);
 			this.fillPosition(tile);
 		}
 			
 		this.positionTile(tile);
 	}
 }

 // DEBUG STUFF

 Grid.prototype.printTiles = function() {
 	for(tile in this.tiles) {
 		console.log(this.tiles[tile]);
 	}
 }

 Grid.prototype.printGrid = function() {
	for (var i = 0; i < this.grid.length; i++) {
		console.log(i + ": " + this.grid[i].join("\t"));
	}
	console.log("-------------------");
}
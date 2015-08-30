/*!
 * Mosaic [WIP]
 *
 * Licensing info here
 *
 * Copyright 2015 Arielle Chapin
 * github.com/ariellebryn
 */
(function($) {
    "use strict";
    /*		Helpers		*/
    function noop() {}

    var error = (typeof console === 'undefined') ? noop :
    function(msg) {
        console.error(msg);
    };

    //Includes 0
    var isPositiveInteger = function(str) {
        return /^(0|[1-9]\d*)$/.test(str);
    }

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
                        error("[Mosaic] Error: Element assigned to column " + this.col + ", but column maximum is " + colMax + ". Reassigned to default position.");
                        this.col = -1;
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

    // Calculates the number of rows and columns the tile takes up
    // KEEP COMMENTED OUT THINGS FOR LATER TESTING
    Tile.prototype.getSize = function(colSize, rowSize, gutter) {
        var width = $(this.element).outerWidth() + gutter;
        var colSpan = Math.round(width/colSize);
        //                if (colSpan != this.width)
        //                    error("ERROR: Calculated colSpan of " + colSpan + " but was actually " + this.width);

        var height = $(this.element).outerHeight() + gutter;
        var rowSpan = Math.round(height/rowSize);
        //                if (rowSpan != this.height)
        //                    error("ERROR: Calculated rowSpan of " + rowSpan + " but was actually " + this.height);

        this.width = colSpan;
        this.height = rowSpan;
    }

    // Gets specified positions, if any, from the data
    // attributes of the tile
    Tile.prototype.getPos = function(colMax) {
        var row = $(this.element).attr('data-mosaic-row');
        var col = $(this.element).attr('data-mosaic-col');

        if (row && isPositiveInteger(row))
            this.row = parseInt(row);

        if (col && isPositiveInteger(col)) {
            col = parseInt(col);

            // If assigned col = width is greater than column max, set to default
            this.col = ((col + this.width - 1) <= colMax) ? col : -1;
        }

    }

    // Sets the margin-top and margin-left of the element to the given values,
    // in percents 
    Tile.prototype.setMarginTopLeft = function(marginTop, marginLeft) {
        $(this.element).addClass('js-tile-style');
        $(this.element).css('margin-top', marginTop + "%"); // USING PERCENT
        $(this.element).css('margin-left', marginLeft+ "%"); // USING PERCENT
    }

    /*		Grid		*/
    // TODO: Make constructor more object-y, with defaults
    // ATM gutter will be in percent. TODO: Make it take px as well
    var Grid = function(container, options) {
        this.container = container;
        this.columns = options.columns;
        this.colMax = options.columns - 1;

        // Column and row sizes -- CURRENTLY ONLY PERCENTAGES & SQUARES
        this.setupSizes(options);

        // Tile id counter
        this.idCounter = 0;

        // 2D Array to store positions of all tiles,
        // default with first row
        this.grid = [this.newRow()];

        // Default position of a tile
        // The first empty slot in the grid
        this.defaultPos = {row: 0, col: 0};

        // Associative array of DOM Elements to their corresponding Tile
        this.defaultTiles = {}; // With no specified position
        this.assignedTiles = {};  // With a specified position
    }

    Grid.prototype.setupSizes = function(options) {
        this.layoutInPercent = options.layoutInPercent;

        if (options.tileModel && typeof options.tileModel === 'string') {
            this.getSizesFromModel(options.tileModel);
        }

        this.gutter = this.getGivenSize(options.gutter, 'width');

        if (options.colWidth) {
            this.colSize = getGivenSize(options.colWidth, 'width');
        } else {
            var max = 100; var multiplier = 1;
            if (!this.layoutInPercent) {
                max = window.getComputedStyle(this.container).getPropertyValue('width');
                multiplier = .01*max;
            }
            this.colSize = multiplier*((max - this.gutter)/this.columns);
        }

        this.rowSize = options.rowHeight ? getGivenSize(options.rowHeight, 'height', options.layoutInPercent) : this.colSize;
    }

    Grid.prototype.getSizesFromModel = function(modelStr) {
        var model = document.querySelector(modelStr);
        if (model) {
            this.colSize = model.width();
            this.rowSize = model.height();
        }
    }

    Grid.prototype.getGivenSize = function(value, property) {
        if (typeof value === 'string') {
            var el = document.querySelector(value);
            if (el) {
                var style = window.getComputedStyle(el);
                var result = style.getPropertyValue(property);
                console.log("getGivenStyle----- ");
                console.log(property + ": " + result);

                var containerSize = window.getComputedStyle(this.container).getPropertyValue(property);
                console.log("containerSize: " + containerSize);

                if (this.layoutInPercent && containerStyle)
                    result = result/containerSize;

                return result;
            } else {
                error("[Mosaic] ERROR: Element " + el + " doesn't exist.");
            }
        } else if (!isNaN(value)) {
            return value;
        } else {
            error("[Mosaic] ERROR: '" + value + "' should be a string or a number to calculate the right size.");
        }
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

    // Change the internal working and re-lay out for new columnsc
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
        return this.container.children;
    }

    // Reads in the children of the container and
    // makes them into tiles
    Grid.prototype.readTiles = function() {
        var children = this.getChildren();

        for (var i = 0; i < children.length; i++) {
            var el = children[i];
            var tile = new Tile(el, this.getNextId());
            //tile.parseElement(this.colMax);

            // TODO: Do better
            var containerWidth = window.getComputedStyle(this.container).getPropertyValue('width');
            containerWidth = parseFloat(containerWidth.split("px")[0]);
            console.log(containerWidth);
            var col = this.colSize*containerWidth*.01; // USING PERCENT
            var row = this.rowSize*containerWidth*.01;
            console.log("Colsize: " + this.colSize + ", rowsize: " + this.rowSize + "; " + "Col: " + col + ", row: " + row);
            tile.getSize(col, row, this.gutter);


            tile.getPos(this.colMax);

            // Separate tiles into appropriate arrays
            if (tile.row != -1 && tile.col != -1) {
                console.log("Tile assigned to " + tile.row + " and " + tile.col);
                this.assignedTiles[tile.id] = tile;
            } else
                this.defaultTiles[tile.id] = tile;
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
        }
        return row;
    }

    // Get a new default position when the current one is filled
    Grid.prototype.newDefaultPos = function() {
        // Find next default position
        var newCol =  this.defaultPos.col + (-1 * this.grid[this.defaultPos.row][this.defaultPos.col]);
        var defRowCol = this.checkNextPos(this.defaultPos.row, newCol);
        this.defaultPos.row = defRowCol.row;
        this.defaultPos.col = defRowCol.col;
    }

    // Finds the next free slot
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
                // Go to end of free space from initial start point
                col = leftCol + this.grid[topRow][leftCol];

                var rowCol = this.checkNextPos(topRow, col);

                // Reset positions
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
            this.newDefaultPos();
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
    }

    // Fills up default rows between the last row
    // and the given row number
    Grid.prototype.fillRowsUpTo = function(row) {
        for (var i = this.grid.length; i <= row; i++) {
            this.grid[i] = this.newRow();
        }
    }

    // Calculates and sets the actual position of the given tile
    Grid.prototype.positionTile = function(tile) {
        var multiplier = (this.colSize);
        tile.setMarginTopLeft(tile.row * multiplier + this.gutter, tile.col * multiplier + this.gutter);
    }

    // Lays out each tile
    Grid.prototype.layoutTiles = function() {
        var id;
        for(id in this.assignedTiles) {
            var tile = this.assignedTiles[id];

            // Fill up grid rows if necessary
            var lastRow = tile.row + tile.height;
            if (lastRow > this.grid.length)
                this.fillRowsUpTo(tile.row + tile.height);

            this.fillPosition(tile);

            // Check if default pos has been filled
            if (this.grid[this.defaultPos.row][this.defaultPos.col] < 0)
                this.newDefaultPos();

            this.positionTile(tile);
        }
        for(id in this.defaultTiles) {
            var tile = this.defaultTiles[id];
            this.findDefaultPosition(tile);
            this.positionTile(tile);
        }
    }

    // DEBUG STUFF

    Grid.prototype.printTiles = function() {
        for(tile in this.assignedTiles) {
            console.log(this.assignedTiles[tile]);
        }
        for(tile in this.defaultTiles) {
            console.log(this.defaultTiles[tile]);
        }
    }

    Grid.prototype.printGrid = function() {
        for (var i = 0; i < this.grid.length; i++) {
            console.log(i + ": " + this.grid[i].join("\t"));
        }
        console.log("-------------------");
    }

    /*      jQuery Plugin       */
    $.fn.mosaic = function(options) {
        var opts = $.extend({}, $.fn.mosaic.defaults, options);
        var grid =  new Grid(this[0], opts);
        grid.readTiles();
        grid.layoutTiles();

        return this;
    }

    $.fn.mosaic.defaults = {
        columns: 1,
        gutter: 0,
        colWidth: null,
        rowHeight: null,
        tileModel: null,
        layoutInPercent: true,
        rows: null,
        checkpoints: null
    };
}(jQuery));
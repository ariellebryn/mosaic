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

    var isPositiveInteger = function(val) {
        return (!isNaN(val) && val >= 0) ? true : false;
    }

    // Includes 0
    var stringIsPositiveInteger = function(str) {
        return /^(0|[1-9]\d*)$/.test(str);
    }

    // Gets a computed size and makes sure to return a number
    var getComputedSize = function(element, property) {
        var size = window.getComputedStyle(element).getPropertyValue(property);
        size = parseFloat(size.split("px")[0]);
        return size;
    }

    /*      Constants   */
    // TODO: Make a getStyleProperty thing (kangax)
    var TILE_STYLE = 'js-tile-style';
    var MARGIN_TOP = 'margin-top';
    var MARGIN_LEFT = 'margin-left';
    var WIDTH = 'width';
    var HEIGHT = 'height';
    var TILE_SELECTOR = 'mosaic-tile';


    /*		Tile		*/
    var Tile = function(element, id) {
        // Defaults (-1 means a default placement will be found)
        this.row = -1;
        this.col = -1;
        this.width = 1;
        this.height = 1;

        // Significant when the actual height/width
        // is greater than maxRows/maxCols, respectively
        this.effectiveHeight = 1;
        this.effectiveWidth = 1;

        // ID for easy reference if tile moves
        this.id = id;

        // DOM element
        this.element = element;
    }

    // Calculates the number of rows and columns the tile takes up
    Tile.prototype.getSize = function(colSize, rowSize, gutter, columns) {
        var width = $(this.element).outerWidth() + gutter;
        var colSpan = Math.min(Math.round(width/colSize), columns);

        var height = $(this.element).outerHeight() + gutter;
        var rowSpan = Math.round(height/rowSize);

        this.width = colSpan;
        this.height = rowSpan;
    }

    // Gets specified positions, if any, from the data
    // attributes of the tile
    // TODO: Expand to take in an object?
    Tile.prototype.getPos = function(colMax) {
        var row = $(this.element).attr('data-mosaic-row');
        var col = $(this.element).attr('data-mosaic-col');

        if (row && stringIsPositiveInteger(row))
            this.row = parseInt(row);

        if (col && stringIsPositiveInteger(col)) {
            col = parseInt(col);

            // If assigned col = width is greater than column max, set to default
            this.col = ((col + this.width - 1) <= colMax) ? col : -1;
        }

    }

    // Sets the margin-top and margin-left of the element to the given values
    Tile.prototype.setMarginTopLeft = function(marginTop, marginLeft, suffix) {
        $(this.element).addClass(TILE_STYLE);
        $(this.element).css(MARGIN_TOP, marginTop + suffix);
        $(this.element).css(MARGIN_LEFT, marginLeft + suffix);
    }

    /*		Grid		*/
    var Grid = function(container, options) {
        this.container = container;

        // Set up number of columns and rows in the grid
        this.columns = isPositiveInteger(options.columns) ? options.columns : 1;
        this.colMax = options.columns - 1;

        this.rows = options.rows;

        // Column and row sizeS
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

    /*------- helpers -------*/

    // Get children of container
    Grid.prototype.getChildren = function() {
        return this.container.children;
    }

    // Returns id and increments
    Grid.prototype.getNextId = function() {
        return this.idCounter++;
    }

    // Get a copy of a default row
    Grid.prototype.newRow = function() {
        var newRow = [];
        var i = this.columns;
        while (i--)
            newRow.push(i + 1);
        return newRow;
    }

    /*------- reset -------*/

    // Resets grid and empties out all tiles
    // TODO: Is this ever necessary?
    Grid.prototype.reset = function() {
        this.grid = [this.newRow()];
        this.defaultPos = {row: 0, col: 0};
        this.defaultTiles = {};
        this.assignedTiles = {};
        this.idCounter = 0;
    }

    // Resets grid layout, but keeps all tiles
    Grid.prototype.softReset = function() {
        this.grid = [this.newRow()];
        this.defaultPos = {row: 0, col: 0};
        this.idCounter = 0; // TODO: Is this useful?
    }

    /*------- setup -------*/

    // Sets up new layut at certain breakpoint
    Grid.prototype.setToBreakpoint = function(options) {
        if (options.columns && isPositiveInteger(options.columns)) {
            console.log("Setting columns to " + options.columns);
            this.columns = options.columns;
            this.colMax = this.columns - 1;
        }

        // TODO: Add in row thing

        this.reset();
        this.setupSizes(options);
        this.readTiles();
        this.layoutTiles();
    }

    // Sets up the row, col, and gutter sizes, as well as all
    // relevant info
    Grid.prototype.setupSizes = function(options) {
        this.layoutInPercent = options.layoutInPercent;
        this.heightSource = options.heightFromWidth ? WIDTH : HEIGHT;

        this.gutter = this.getGivenSize(options.gutter, WIDTH);

        // If there's a model, get width and height from it
        if (options.tileModel && typeof options.tileModel === 'string') {
            this.getSizesFromModel(options.tileModel);
        } else {
            // If a width is specified, use it
            if (options.colWidth) {
                this.colSize = this.getGivenSize(options.colWidth, WIDTH) + this.gutter;
            } else if (!options.tileModel) {
                // Else, figure it out based on the column number and container size
                var containerWidth = getComputedSize(this.container, WIDTH);
                var max = 100*this.layoutInPercent + containerWidth*!this.layoutInPercent;
                this.colSize = ((max - this.gutter)/this.columns);
            }

            // If a height is specified, use it, else use the column height
            this.rowSize = options.rowHeight ? (this.getGivenSize(options.rowHeight, HEIGHT)+this.gutter) : this.colSize;
        }
    }

    // Pulls height and width from a sizing model
    Grid.prototype.getSizesFromModel = function(modelStr) {
        var model = document.querySelector(modelStr);
        if (model) {
            var colMult = (100 / getComputedSize(this.container, WIDTH)) * this.layoutInPercent + !this.layoutInPercent;
            var rowMult = (100 / getComputedSize(this.container, this.heightSource)) * this.layoutInPercent + !this.layoutInPercent;
            this.colSize = (getComputedSize(model, WIDTH) * colMult) + this.gutter;
            this.rowSize = (getComputedSize(model, HEIGHT) * rowMult) + this.gutter;
        }
    }

    // Get the given size (width or height, depending on 'property') of element with
    // selector 'selector'
    Grid.prototype.getGivenSize = function(value, property) {
        if (typeof selector === 'string') {
            var el = document.querySelector(value);
            if (el) {
                var containerSize = getComputedSize(this.container, property);

                // TODO: Might need to check to make sure containerSize is available
                var multiplier = (1/containerSize)*this.layoutInPercent + 1*!this.layoutInPercent;

                var result = getComputedSize(el, property) * multiplier;

                return result;
            } else {
                error("[Mosaic] ERROR: Element " + el + " doesn't exist.");
            }
        } else if (!isNaN(value)) {
            return value;
        } else {
            error("[Mosaic] ERROR: '" + selector + "' should be a string or a number to calculate the right size.");
        }
    }

    /*------- read -------*/

    // Reads in the children of the container and
    // makes them into tiles
    Grid.prototype.readTiles = function() {
        var children = this.getChildren();

        // TODO: Abstract out these multipliers, since I use them so many times??
        // Gets an accurate reading of the column and row size if they should be in percentages
        var colMult = this.layoutInPercent * getComputedSize(this.container, WIDTH) * .01 + !this.layoutInPercent;
        var rowMult = this.layoutInPercent * getComputedSize(this.container, this.heightSource) * .01 + !this.layoutInPercent;
        var col = this.colSize * colMult;
        var row = this.rowSize * rowMult;
        console.log("Colsize: " + this.colSize + ", rowsize: " + this.rowSize + "; " + "Col: " + col + ", row: " + row);
        
        this.setupTiles(children, col, row);
    }

    // For every tile with the appropriate class, set up
    // the Tile, get its sizing and positioning,
    // and organize it into its appropriate object
    Grid.prototype.setupTiles = function(children, col, row) {
        for (var i = 0; i < children.length; i++) {
            var el = children[i];
            if ($(el).hasClass(TILE_SELECTOR)) {
                var tile = new Tile(el, this.getNextId());

                tile.getSize(col, row, this.gutter, this.columns);
                tile.getPos(this.colMax);

                // Separate tiles into appropriate object
                if (tile.row != -1 && tile.col != -1) {
                    console.log("Tile assigned to " + tile.row + " and " + tile.col);
                    this.assignedTiles[tile.id] = tile;
                } else
                    this.defaultTiles[tile.id] = tile;
            }
        }
    }

    /*------- position -------*/

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

            // Set the effective sizes (if size is larger than max, set to max)
            tile.effectiveHeight = (this.rows && tile.height > this.rows) ? this.rows : tile.height;
            tile.effectiveWidth = (tile.width > this.columns) ? this.columns : tile.width;

            this.findDefaultPosition(tile);
            this.positionTile(tile);
        }
    }

    // Get a new default position when the current one is filled
    Grid.prototype.newDefaultPos = function() {
        // Find next default position
        var newCol =  this.defaultPos.col + (-1 * this.grid[this.defaultPos.row][this.defaultPos.col]);
        var defRowCol = this.checkNextPos(this.defaultPos.row, newCol);
        this.defaultPos.row = defRowCol.row;
        this.defaultPos.col = defRowCol.col;
    }

    // Increment a row, adding a new row if necessary
    Grid.prototype.incrementRow = function(row) {
        row++;
        if (this.grid[row] == undefined) {
            this.grid[row] = this.newRow();
        }
        return row;
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
    // Finds the first position that fits the given tile
    Grid.prototype.findDefaultPosition = function(tile) {
        var row, topRow, col, leftCol;
        row = topRow = this.defaultPos.row;
        col = leftCol = this.defaultPos.col;

        // Loop through finding process until a slot is found
        while (row - topRow < tile.effectiveHeight) {
            // If the width of the tile doesn't fit,
            // find next possible position
            if (!(this.grid[row][col] - tile.effectiveWidth >= 0)) {
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

        // Set and fill
        tile.row = topRow;
        tile.col = leftCol;
        this.fillPosition(tile);

        // If the default pos is now taken, find a new one
        if (topRow == this.defaultPos.row && leftCol == this.defaultPos.col) {
            this.newDefaultPos();
        }

        return tile;
    }

    // Takes the given tile and fills the grid
    // TODO: So many nested things--double-check for a better way
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

    /*------- display -------*/

    // Calculates and sets the actual position of the given tile
    Grid.prototype.positionTile = function(tile) {
        var suffix = this.layoutInPercent ? '%' : 'px';
        tile.setMarginTopLeft((tile.row * this.rowSize) + this.gutter, (tile.col * this.colSize) + this.gutter, suffix);
    }


    /*------- debug -------*/

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

    var printObjectArray = function(a) {
        console.log("Printing array: ");
        for (var i = 0; i < a.length; i++) {
            console.log(a[i]);
        }
    }

    /*      jQuery Plugin       */
    var _breakpoints = [];
    var _lowerIndex = 0;

    // Make sure the breakpoints are in order by size from lowest to highest
    var sortBreakpoints = function(breakpoints) {
        _breakpoints = breakpoints.sort(function(a,b){return a.size - b.size;});
    }

    // Find the initial lower breakpoint
    var findLowerBreakpoint = function(size) {
        for (var i = 0; i < _breakpoints.length; i++) {
            if (size < _breakpoints[i].size) {
                return;
            } else {
                _lowerIndex = i;
            }
        }
    }

    // TODO: See if this can be optimized?
    // Try the breakpoints around the current one to see if a new breakpoint is
    // necessary, and if so, which one?
    var tryBreakpoints = function(size) {
        console.log("New size: " + size);
        var i;
        if (size > _breakpoints[_lowerIndex].size) {
            for (i = _lowerIndex+1 ; i < _breakpoints.length; i++) {
                if (size < _breakpoints[i].size) {
                    return;
                } else {
                    _lowerIndex = i;
                }
            }
        } else if (size < _breakpoints[_lowerIndex].size) {
            for (i = _lowerIndex-1 ; i >= 0; i--) {
                if (size >= _breakpoints[i].size) {
                    _lowerIndex = i;
                    return;
                }
            }
        }
    }

    $.fn.mosaic = function(options) {
        var opts = $.extend({}, $.fn.mosaic.defaults, options);

        if (opts.breakpoints) {
            if(!Array.isArray(opts.breakpoints))
                return this;

            var newOpts;
            var currBreakpoint; // Index of the current breakpoint
            opts.breakpoints.push({size:-1});

            sortBreakpoints(opts.breakpoints);
            printObjectArray(opts.breakpoints);

            // Figure out the current window size and assign options
            findLowerBreakpoint(window.innerWidth);
            currBreakpoint = _lowerIndex;

            var tempOpts = $.extend({}, opts);
            newOpts = $.extend(tempOpts, _breakpoints[_lowerIndex]);
            var grid =  new Grid(this[0], newOpts); // TODO: Make for each
            grid.readTiles();
            grid.layoutTiles();

            window.addEventListener('resize', 
                                    function() {
                tryBreakpoints(window.innerWidth);
                console.log("Index " + _lowerIndex + " for size " + _breakpoints[_lowerIndex].size);
                if (_lowerIndex != currBreakpoint) {
                    tempOpts = $.extend({}, opts);
                    newOpts = $.extend(tempOpts, _breakpoints[_lowerIndex]);
                    grid.setToBreakpoint(newOpts);
                    currBreakpoint = _lowerIndex;
                }

            });

            return this;
        }

        var grid =  new Grid(this[0], opts); // TODO: Make for each
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
        heightFromWidth: false, // If your height is actually padding-bottom, it depends on the width, not the height, of the parent
        rows: null, // TODO: Limit rows?
        breakpoints: null
    };
}(jQuery));
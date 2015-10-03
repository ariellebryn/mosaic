/*!
 * Mosaic v1
 *
 * MIT Licensed
 *
 * Copyright 2015 Arielle Chapin
 * github.com/ariellebryn
 * ariellechapin.me
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

    // Parses a string into an object
    // Original by DigitLimit, http://stackoverflow.com/questions/1086404/string-to-object-in-js
    var stringToObject = function(string) {
        var fields = string.split(', ');
        var fieldObject = {};

        if( typeof fields === 'object' ){
            $.each(fields, function(field) {
                var c = fields[field].split(':');
                fieldObject[c[0]] = c[1];
            });
        }

        return fieldObject;
    }

    /*      Constants   */
    var TILE_STYLE = 'js-tile-style';
    var MARGIN_TOP = 'margin-top';
    var MARGIN_LEFT = 'margin-left';
    var WIDTH = 'width';
    var HEIGHT = 'height';
    var TILE_SELECTOR = 'mosaic-tile';


    /*		Tile		*/
    /**
     * A Tile in the Grid
     *      <Element> element : the DOM element associated with this Tile
     *      <int> id : the unique id of this Tile
     */
    var Tile = function(element, id) {
        // If available, the position objects or numbers
        this.rowPosition = null;
        this.colPosition = null;

        // Defaults (-1 means a default placement will be found)
        this.row = -1;
        this.col = -1;
        this.width = 1;
        this.height = 1;

        // Significant when the actual width is greater than maxCols
        this.effectiveWidth = this.width;

        // ID for easy reference if tile moves
        this.id = id;

        // DOM element
        this.element = element;
    }

    // If assigned col + width is greater than column max, set to default
    Tile.prototype.fixWidth = function(colMax) {
        this.col = ((this.col + this.width - 1) <= colMax) ? this.col : -1;
    }

    /**
     * Calculates the number of rows and columns the tile takes up
     *      <double> colSize : the actual width of a column on the page
     *      <double> rowSize : the actual height of a row on the page
     *      <double> gutter : the gutter size
     *      <int> columns : the number of columns in the grid
     */
    Tile.prototype.getSize = function(colSize, rowSize, gutter, columns) {
        var width = $(this.element).outerWidth() + gutter;
        var colSpan = Math.min(Math.round(width/colSize), columns);

        var height = $(this.element).outerHeight() + gutter;
        var rowSpan = Math.round(height/rowSize);

        this.width = colSpan;
        this.effectiveWidth = this.width;
        this.height = rowSpan;
    }

    /**
     * Parses a position object to get the position for
     * the current size
     *      <Object> obj : the object that holds the positions
     */
    Tile.prototype.getPosFromObject = function(obj, breakpoints, currentBreakpoint) {
        var num = -1;
        var size = breakpoints[currentBreakpoint].size;
        var sizeIndex = (size == -1) ? 0 : size;
        num = obj[sizeIndex];
        if (!num)
            num = -1;

        return parseInt(num);
    }

    /**
     * Gets specified positions, if any, from the data
     * attributes of the tile
     *      <int> colMax : the maximum number of columns (0-indexed)
     *      <double[]> breakpoints : the grid's breakpoints
     *      <int> currentBreakpoint : the index of the current breakpoint
     */
    Tile.prototype.getPosInfo = function(colMax, breakpoints, currentBreakpoint) {
        var row = $(this.element).attr('data-mosaic-row');
        var col = $(this.element).attr('data-mosaic-col');
        var num; var obj;

        if (row) {
            if (stringIsPositiveInteger(row)) {
                num = parseInt(row);
                this.rowPosition = num; 
            } else {
                this.rowPosition = stringToObject(row);
                num = this.getPosFromObject(this.rowPosition, breakpoints, currentBreakpoint);
            }

            this.row = num;
        }


        if (col) {
            if (stringIsPositiveInteger(col)) {
                num = parseInt(col);
                this.colPosition = num;
            } else {
                this.colPosition = stringToObject(col);
                num = this.getPosFromObject(this.colPosition, breakpoints, currentBreakpoint);
            }

            this.col = num;
            this.fixWidth(colMax);
        }

    }

    /**
     * Get the appropriate position of the tile
     *      <int> colMax : max column index
     *      <double[]> breakpoints : the grid's breakpoints
     *      <int> currentBreakpoint : the index of the current breakpoint
     */
    Tile.prototype.getPos = function(colMax, breakpoints, currentBreakpoint) {
        if (this.colPosition) {
            if (isNaN(this.colPosition)) {
                this.col = this.getPosFromObject(this.colPosition, breakpoints, currentBreakpoint);
                this.fixWidth(colMax);
            }
        } else {
            this.col = -1;
        }

        if (this.rowPosition) {
            if (isNaN(this.rowPosition)) {
                this.row = this.getPosFromObject(this.rowPosition, breakpoints, currentBreakpoint);
            } else {
                this.row = -1;
            }
        }
    }

    /**
     * Sets the margin-top and margin-left of the element to the given values,
     * which is how the Tiles are positioned on the screen
     *      <double> marginTop : the number to set the Tile's margin-top to
     *      <double> marginLeft : the number to set the Tile's margin-left to
     *      <string> suffix : '%' or 'px'
     */
    Tile.prototype.setMarginTopLeft = function(marginTop, marginLeft, suffix) {
        $(this.element).addClass(TILE_STYLE);
        $(this.element).css(MARGIN_TOP, marginTop + suffix);
        $(this.element).css(MARGIN_LEFT, marginLeft + suffix);
    }

    // Destroy the tile
    Tile.prototype.destroy = function() {
        var el = $(this.element);
        el.removeClass(TILE_STYLE);
        el.css(MARGIN_TOP, '');
        el.css(MARGIN_LEFT, '');
    }

    /*		Grid		*/
    /**
     * The containing Grid
     *      <Element> container : The DOM element to contain the Grid
     *      <Object> options : All the various options and their settings
     */
    var Grid = function(container, breakpoints, currentBpoint, options) {
        this.container = container;
        
        // Breakpoints and current breakpoint
        this.breakpoints = breakpoints;
        this.currentBreakpoint = currentBpoint;

        // Set up number of columns and rows in the grid
        this.columns = isPositiveInteger(options.columns) ? options.columns : 1;
        this.colMax = options.columns - 1;

        this.rows = options.rows;
        this.rowMax = this.rows - 1;

        // Column and row sizeS
        this.setupSizes(options);

        // Tile id counter
        this.idCounter = 0;

        // 2D Array to store positions of all tiles,
        // default with first row
        this.grid = [this.newRow()];
        if (this.rows)
            this.fillRowsUpTo(this.rowMax);

        // Default position of a tile
        // The first empty slot in the grid
        this.defaultPos = {row: 0, col: 0};

        // Associative array of tile ids to their corresponding Tile
        this.tiles = {};
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
    Grid.prototype.reset = function() {
        this.grid = [this.newRow()];
        this.defaultPos = {row: 0, col: 0};
        $(this.container).find($('.' + TILE_SELECTOR)).removeClass(TILE_STYLE);
        this.defaultTiles = {};
        this.assignedTiles = {};
    }

    // Destroys all tiles
    Grid.prototype.destroy = function() {
        $('.' + TILE_SELECTOR).removeClass(TILE_STYLE);
        for (var i in this.tiles) {
            this.tiles[i].destroy();
        }
        this.defaultTiles = null;
        this.assignedTiles = null;
        this.tiles = null;
    }

    /*------- setup -------*/

    /**
     * Sets up new layout at certain breakpoint
     *      <Object> options : All the various options and their settings
     *      <double[]> breakpoints : the grid's breakpoints
     *      <int> currentBreakpoint : the index of the current breakpoint
     */
    Grid.prototype.setToBreakpoint = function(options, breakpoints, currentBpoint) {
        this.breakpoints = breakpoints;
        this.currentBreakpoint = currentBpoint;
        
        if (options.columns && isPositiveInteger(options.columns)) {
            this.columns = options.columns;
            this.colMax = this.columns - 1;
        }

        if (options.rows) {
            this.rows = options.rows;
            this.rowMax = this.rows - 1;
        }

        this.reset();
        this.setupSizes(options);
        this.readTiles();
        this.layoutTiles();
    }

    /**
     * Sets up the row, col, and gutter sizes, as well as all
     * relevant info
     *      <Object> options : All the various options and their settings
     */
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

            if (options.rowHeight) {
                // If a height is specified, use it
                this.rowSize = this.getGivenSize(options.rowHeight, HEIGHT) + this.gutter;
            } else if (this.rows) {
                // If rows is specified, compute size
                var containerHeight = getComputedSize(this.container, this.heightSource);
                var max = 100*this.layoutInPercent + containerHeight*!this.layoutInPercent;
                this.rowSize = ((max - this.gutter)/this.rows);
            } else {
                // If not other row specification, use column size
                this.rowSize = this.colSize;
            }
        }
    }

    /**
     * Pulls height and width from a sizing model
     *      <string> modelStr : the string to be used as a selector for the sizing model element
     */
    Grid.prototype.getSizesFromModel = function(modelStr) {
        var model = document.querySelector(modelStr);
        if (model) {
            var colMult = (100 / getComputedSize(this.container, WIDTH)) * this.layoutInPercent + !this.layoutInPercent;
            var rowMult = (100 / getComputedSize(this.container, this.heightSource)) * this.layoutInPercent + !this.layoutInPercent;
            this.colSize = (getComputedSize(model, WIDTH) * colMult) + this.gutter;
            this.rowSize = (getComputedSize(model, HEIGHT) * rowMult) + this.gutter;
        }
    }

    /**
     * Get the given size (width or height, depending on 'property') of element with
     * selector 'value'
     *      <string>||<double> value : either a selector for a DOM element or a number
     *      <string> property : the property being found from value
     */
    Grid.prototype.getGivenSize = function(value, property) {
        if (typeof value === 'string') {
            var el = document.querySelector(value);
            if (el) {
                var containerSize = getComputedSize(this.container, property);

                // Make sure containerSize is valid
                if (containerSize) {
                    error("[Mosaic] ERROR: '" + selector + "' Couldn't find " + property + " of container.");
                    return 0;
                }
                
                var multiplier = (1/containerSize)*this.layoutInPercent + !this.layoutInPercent;

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

    // Reads in the children of the container and makes them into tiles
    Grid.prototype.readTiles = function() {
        // Gets an accurate reading of the column and row size if they should be in percentages
        var colMult = this.layoutInPercent * getComputedSize(this.container, WIDTH) * .01 + !this.layoutInPercent;
        var rowMult = this.layoutInPercent * getComputedSize(this.container, this.heightSource) * .01 + !this.layoutInPercent;
        var col = this.colSize * colMult;
        var row = this.rowSize * rowMult;

        if (this.tiles)
            this.setupTiles(col, row);
        else
            this.recalibrateTiles(col, row);
    }

    /**
     * For every tile with the appropriate class, set up
     * the Tile, get its sizing and positioning,
     * and organize it into its appropriate object
     *      <Element[]> children : the children of the grid parent
     *      <int> col : the column width, in pixels
     *      <int> row : the row height, in pixels
     */
    Grid.prototype.setupTiles = function(col, row) {
        var children = this.getChildren();
        for (var i = 0; i < children.length; i++) {
            var el = children[i];
            if ($(el).hasClass(TILE_SELECTOR)) {
                var tile = new Tile(el, this.getNextId());

                tile.getSize(col, row, this.gutter, this.columns);
                tile.getPosInfo(this.colMax, this.breakpoints, this.currentBreakpoint);

                // Separate tiles into appropriate object
                this.organizeTile(tile);
                this.tiles[tile.id] = tile;
            }
        }
    }

    Grid.prototype.recalibrateTiles = function(col, row) {
        for (id in this.tiles) {
            tile.getSize(col, row, this.gutter, this.columns);
            tile[id].getPos(this.colMax, this.breakpoints, this.currentBreakpoint);
            this.organizeTile(tile);
        }
    }

    Grid.prototype.organizeTile = function(tile) {
        if (tile.row != -1 && tile.col != -1) {
            this.assignedTiles[tile.id] = tile;
        } else
            this.defaultTiles[tile.id] = tile;
    }

    /*------- position -------*/

    // Lays out each tile
    Grid.prototype.layoutTiles = function() {
        var id;
        for(id in this.assignedTiles) {
            var tile = this.assignedTiles[id];

            // Fill up grid rows if necessary
            var lastRow = tile.row + tile.height - 1;

            // Only proceed if under the row limit, if there is one
            if (!this.rows || lastRow <= this.rowMax) {
                if (lastRow >= this.grid.length)
                    this.fillRowsUpTo(tile.row + tile.height);

                this.fillPosition(tile);

                // Check if default pos has been filled
                if (this.grid[this.defaultPos.row][this.defaultPos.col] < 0)
                    this.newDefaultPos();

                this.positionTile(tile); 
            }
        }
        for(id in this.defaultTiles) {
            var tile = this.defaultTiles[id];

            // If the default position goes beyond an existing row limit, end layouting
            if (this.rows && this.defaultPos.row > this.rowMax)
                return;

            // If this tile is too tall, skip it
            if (this.rows && tile.height > this.rows)
                continue;

            // Set the effective sizes (if size is larger than max, set to max)
            tile.effectiveWidth = (tile.width > this.columns) ? this.columns : tile.width;

            var foundPos = this.findDefaultPosition(tile);

            if (foundPos)
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

    /** 
     * Increment a row, adding a new row if necessary
     *     <int> row : the current row
     */
    Grid.prototype.incrementRow = function(row) {
        row++;
        if (this.grid[row] == undefined) {
            this.grid[row] = this.newRow();
        }
        return row;
    }

    /**
     * Finds the next free slot
     *      <int> row : the current row
     *      <int> col : the current col
     */      
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

    /*
     * Finds the first position that fits the given tile;
     * if a valid position is found, return true, else false
     *      <Tile> tile : the tile to find the first available position for
     */     
    Grid.prototype.findDefaultPosition = function(tile) {
        var row, topRow, col, leftCol;
        row = topRow = this.defaultPos.row;
        col = leftCol = this.defaultPos.col;

        // Loop through finding process until a slot is found
        while (row - topRow < tile.height) {
            // Don't allow beyond row limit, if available
            if (this.rows && row > this.rowMax)
                return false;

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

        return true;
    }

    /**
     * Takes the given tile and fills the grid
     *      <Tile> tile : the tile to fill the position of
     */
    Grid.prototype.fillPosition = function(tile) {
        // Is true if when looking to the left of tile.col we've encountered no filled spaces
        var uninterrupted = true;
        // Returns true if the next space to the left of tile.col should be filled
        var spaceBeforeTile = function(col) { return (col >= 0 && uninterrupted); }
        // Returns true if the next space to the right of tile.col should be filled
        var spaceWithinTile = function(col) { return (col < tile.col + tile.effectiveWidth); }


        for (var i = tile.row; i < tile.row + tile.height; i++) {

            // Fills tile.col
            this.grid[i][tile.col] = -1 * tile.effectiveWidth;

            var bef, aft; uninterrupted = true;
            // Fills in spaces in both directions away from tile.col
            for (var j = 1; spaceBeforeTile(tile.col - j) || spaceWithinTile(tile.col + j); j++) {
                bef = tile.col - j; aft = tile.col + j;

                if (spaceBeforeTile(bef)) {
                    if (this.grid[i][bef] > 0) {
                        this.grid[i][bef] = j;
                    } else {
                        uninterrupted = false;
                    }
                }

                if (spaceWithinTile(aft))
                    this.grid[i][aft] = j - tile.effectiveWidth;
            }
        }
    }

    /**
     * Fills up default rows between the last row
     * and the given row number
     *      <int> row : the row to fill up to with default rows
     */
    Grid.prototype.fillRowsUpTo = function(row) {
        for (var i = this.grid.length; i <= row; i++) {
            this.grid[i] = this.newRow();
        }
    }

    /*------- display -------*/

    /**
     * Calculates and sets the actual position of the given tile
     *      <Tile> tile : the tile to set the position of
     */
    Grid.prototype.positionTile = function(tile) {
        var suffix = this.layoutInPercent ? '%' : 'px';
        tile.setMarginTopLeft((tile.row * this.rowSize) + this.gutter, (tile.col * this.colSize) + this.gutter, suffix);
    }

    /*      jQuery Plugin       */
    /**
     * Sorts breakpoints in order by size from lowest to highest
     *      <int[]> breakpoints : the array of breakpoints and their associated options
     */
    var sortBreakpoints = function(breakpoints) {
        return breakpoints.sort(function(a,b){return a.size - b.size;});
    }

    /**
     * Finds the max breakpoint, given a starting index
     *      <int> start : the initial index to start searching from
     *      <int> size : the browser width
     *      <Object[]> breakpoints : the breakpoints of the grid
     *      <int> currentIndex : the current breakpoint index
     */
    var searchBreakpointsIncreasing = function (start, size, breakpoints, currentIndex) {
        var lowerIndex = currentIndex;
        for (var i = start; i < breakpoints.length; i++) {
            if (size < breakpoints[i].size) {
                break;
            } else {
                lowerIndex = i;
            }
        }
        
        return lowerIndex;
    }

    /**
     * Find the initial lower breakpoint
     *      <int> size : the browser width
     *      <Object[]> breakpoints : the breakpoints of the grid
     *      <int> currentIndex : the current breakpoint index
     */
    var findLowerBreakpoint = function(size, breakpoints, currentIndex) {
        return searchBreakpointsIncreasing(0, size, breakpoints, currentIndex);
    }

    /**
     * Try the breakpoints around the current one to see if a new breakpoint is
     * necessary, and if so, find the appropriate breakpoint
     *      <int> size : the browser width
     *      <Object[]> breakpoints : the breakpoints of the grid
     *      <int> currentIndex : the current breakpoint index
     */
    var tryBreakpoints = function(size, breakpoints, currentIndex) {
        var i;
        if (size > breakpoints[currentIndex].size) {
            // If size is greater than current breakpoint size, look for greater breakpoints
            return searchBreakpointsIncreasing(currentIndex+1, size, breakpoints, currentIndex);
        } else if (size < breakpoints[currentIndex].size) {
            // If size is lower than current breakpoint size, look for lower breakpoints
            for (i = currentIndex-1 ; i >= 0; i--) {
                if (size >= breakpoints[i].size) {
                    currentIndex = i;
                    return currentIndex;
                }
            }
        }
        
        return currentIndex;
    }

    
    var breakpointHandler = function(opts, breakpoints, currentIndex, grids) {
        var tempOpts = $.extend({}, opts);
        var newOpts = $.extend(tempOpts, breakpoints[currentIndex]);

        for (var i in grids) {
            grids[i].setToBreakpoint(newOpts, breakpoints, currentIndex);
        }
    }

    // Read and layout tiles
    var startGrid = function(grid) {
        grid.readTiles();
        grid.layoutTiles();
    }

    $.fn.mosaic = function(options) {
        var opts = $.extend({}, $.fn.mosaic.defaults, options);
        var ret;
        var breakpoints = [];
        var lowerIndex = 0;
        var currBreakpoint; // Index of the current breakpoint
        var resizeHandler = function(){};
        var grids = [];

        if (opts.breakpoints) {
            if(!Array.isArray(opts.breakpoints))
                return this;

            var newOpts;
            opts.breakpoints.push({size:-1});

            breakpoints = sortBreakpoints(opts.breakpoints);

            // Figure out the current window size and assign options
            lowerIndex = findLowerBreakpoint(window.innerWidth, breakpoints, 0);
            currBreakpoint = lowerIndex;

            var tempOpts = $.extend({}, opts);
            newOpts = $.extend(tempOpts, breakpoints[lowerIndex]);            
            var curr;
            ret = this.each(function() {
                curr = new Grid(this, breakpoints, currBreakpoint, newOpts);
                grids.push(curr);
                startGrid(curr);
            });

            resizeHandler = function() {
                lowerIndex = tryBreakpoints(window.innerWidth, breakpoints, lowerIndex);
                if (lowerIndex != currBreakpoint) {
                    breakpointHandler(opts, breakpoints, lowerIndex, grids);
                    currBreakpoint = lowerIndex;
                }
            };
            window.addEventListener('resize', resizeHandler);

            return ret;
        }

        ret = this.each(function() {
            curr = new Grid(this, null, null, opts);
            grids.push(curr);
            startGrid(curr);
        });

        return ret;
    }

    $.fn.mosaic.defaults = {
        columns: 1,
        rows: null,
        gutter: 0,
        colWidth: null,
        rowHeight: null,
        tileModel: null,

        // If your layout is all in percentages
        layoutInPercent: true,

        // If your height is actually padding-bottom, it depends on the width, not the height, of the parent
        heightFromWidth: false, 

        // To be used if the grid layout should be changed with different browser widths
        breakpoints: null
    };

    // Destroy this instance
    $.fn.mosaic.destroy = function() {
        window.removeEventListener('resize', resizeHandler);
        for (var i in grids) {
            grids[i].destroy();
        }
        grids = [];
    };
}(jQuery));
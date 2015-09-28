**Table of Contents**

1. Intro and Description

    a. MosaicCSS
    
    b. MosaicJS
    
2. Documentation

    a. MosaicCSS
    
    b. MosaicJS
    
3. Demos



**MOSAIC**

Mosaic is a layout framework that allows you to position "tiles" easily in a premade grid and then auto-layout more tiles around them.

Inspired by Masonry, and similar to Packery (both by github.com/desandro), Mosaic is great for mixing dynamic and static content in the same layout.

Like Packery, you can specify tiles that you want to essentially keep the same position. Unlike Packery, your positioned tiles are positioned relative to the grid you're using, and so is already entirely integrated into your layout.

Mosaic comes with two libraries: a CSS library and a JS library.



**MosaicCSS** creates a grid framework based on columns and rows. The column width and row height will be the same, and this will be enforced using padding-bottom for the row height (meaning the height of the tiles will be a percentage of the width instead of the height of the container). A normal tile, then, will be a square spanning one column and one row, but it's easy to make the rowspan or column span different.



**MosaicJS** lays out the grid so that everything fits together, instead of stacking elements of odd heights and widths with gaps in between. In addition, allows you to specify positions for your tiles within the grid, and will make all the necessary calculations for you. Also allows for breakpoints and other options.



**Documentation**

**MosaicCSS**

The CSS for Mosaic provides a grid framework that works well with MosaicJS, although it doesn’t have to be used in conjunction. The files are in _.scss_, and should be compiled into CSS before use.


_Characteristics of MosaicCSS:_

Everything’s in percentages

The tiles are square, unless you change the column or row span

The height of the tiles is done with padding-bottom, so the height is based on width


_mosaic.scss_

The main stylesheet. Here you specify the number of columns and the gutter size as integers.

_mosaic.mobile.scss_

A stylesheet that will cover one mobile breakpoint at a time. Specify the breakpoint, column number, and gutter size as integers. Compile and add together as many as you want.


_**HTML**_


_**Using MosaicCSS With MosaicJS**_

To use MosaicCSS with MosaicJS, make sure the container you’re using for your grid is the one containing the mosaic tiles with the appropriate classes.

Check that the number of columns in the CSS matches the number of columns in the JS

Check that the gutter sizes in the CSS and JS are equal

No need to specify a tileModel, colWidth, or rowHeight

In the JS, _heightFromWidth: true_

In the JS, _layoutInPercent: true_ (this is set by default)
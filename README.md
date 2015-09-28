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

**MosaicCSS**
Creates a grid framework based on columns and rows. The column width and row height will be the same, and this will be enforced using padding-bottom for the row height (meaning the height of the tiles will be a percentage of the width instead of the height of the container). A normal tile, then, will be a square spanning one column and one row, but it's easy to make the rowspan or column span different.

**MosaicJS**
Lays out the grid so that everything fits together, instead of stacking elements of odd heights and widths with gaps in between. In addition, allows you to specify positions for your tiles within the grid, and will make all the necessary calculations for you. Also allows for breakpoints and other options.

**Documentation**


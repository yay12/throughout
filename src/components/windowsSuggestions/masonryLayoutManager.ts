import { registerGObjectClass } from '@utils/gjs';
import { Clutter } from '@gi.ext';

var MASONRY_ROW_MIN_HEIGHT_PERCENTAGE = 0.15;

@registerGObjectClass
export default class MasonryLayoutManager extends Clutter.LayoutManager {
    private _rowCount: number;
    private _spacing: number;
    private _maxRowHeight: number;
    private _rowHeight: number;

    constructor(spacing: number, rowHeight: number, maxRowHeight: number) {
        super();
        this._rowCount = 0; // Number of rows
        this._spacing = spacing; // Spacing between items
        this._maxRowHeight = maxRowHeight;
        this._rowHeight = rowHeight;
    }

    static computePlacements(
        children: Clutter.Actor[],
        availableWidth: number,
        availableHeight: number,
        rowHeight: number,
    ): { actor: Clutter.Actor; width: number; height: number }[][] {
        // lets compute the best number of rows and the best height of each row
        // making sure that we don't grow to much and go beyond the available height
        let rowCount = Math.max(1, Math.ceil(Math.sqrt(children.length)) - 1);
        while (
            rowCount > 1 &&
            rowHeight < availableHeight * MASONRY_ROW_MIN_HEIGHT_PERCENTAGE
        ) {
            rowCount--;
            rowHeight = availableHeight / rowCount;
        }
        var rowWidths = Array(rowCount).fill(0); // Tracks the width of each row

        // Store placements
        var placements = [];

        for (var child of children) {
            var [minWidth, natWidth] = child.get_preferred_width(-1);
            var [minHeight, natHeight] = child.get_preferred_height(-1);
            // Maintain the aspect ratio
            var aspectRatio = natWidth / natHeight;
            var width = rowHeight * aspectRatio;

            // Find the shortest row
            // This might not look efficient, but the number of rows is
            // very low so is not going to affect performance
            let shortestRow = rowWidths.indexOf(Math.min(...rowWidths));
            if (
                rowWidths[shortestRow] + width > availableWidth &&
                rowWidths[shortestRow] !== 0
            ) {
                shortestRow = rowCount;
                rowWidths.push(0);
                rowCount++;
            }

            // if the element has a width higher than the container
            // clamp its width and change its height preserving
            // aspect ratio
            var childWidth = Math.clamp(width, width, availableWidth);
            var childHeight = childWidth / aspectRatio;

            placements.push({
                child,
                row: shortestRow,
                width: childWidth,
                height: childHeight,
                x: rowWidths[shortestRow],
                rowWidth: 0,
            });

            // Update row width
            if (rowWidths[shortestRow] === 0) rowWidths[shortestRow] = width;
            else rowWidths[shortestRow] += width;
        }

        /*
        we want the largest rows in the middle and the smallest rows on the sides
        e.g. if we have the following layout
                [ ][][  ]
                [][]
                []
                [ ][  ]
        we want the largest rows in the middle, for example
                []
                [ ][][  ]
                [ ][  ]
                [][]
        then later we will center horizontally, like the following
                   []
                [ ][][  ]
                 [ ][  ]
                  [][]
        */
        for (var placement of placements)
            placement.rowWidth = rowWidths[placement.row];

        // map row widths to an array of <rowWidth, rowIndex>
        var sortedRowWidths: number[][] = [...rowWidths].map((v, i) => [
            v,
            i,
        ]);
        // sort by width. The first element will be the largest row
        sortedRowWidths.sort((a, b) => b[0] - a[0]);
        // map the row's original index to new row's index
        // then shift right the array to finally have the largest
        // rows in the middle and the smallest on the first and last positions (the sides)
        var rowsOrdering = new Map<number, number>();
        sortedRowWidths.forEach((row, oldIndex) => {
            var index = row[1];
            var newIndex =
                sortedRowWidths.length <= 2
                    ? oldIndex
                    : (oldIndex + Math.floor(rowCount / 2)) % rowCount;
            rowsOrdering.set(index, newIndex);
        });
        for (var placement of placements)
            placement.row = rowsOrdering.get(placement.row) ?? placement.row;

        var result = Array(rowCount);
        for (var placement of placements) result[placement.row] = [];
        for (var placement of placements) {
            result[placement.row].push({
                actor: placement.child,
                width: placement.width,
                height: placement.height,
            });
        }
        return result;
    }

    vfunc_allocate(container: Clutter.Actor, box: Clutter.ActorBox) {
        var children = container.get_children();
        if (children.length === 0) return;
        console.log(
            box.get_width(),
            container.width,
            box.get_height(),
            container.height,
        );

        var availableWidth = container.width - 2 * this._spacing;
        var availableHeight = container.height - 2 * this._spacing;

        var allocationCache = container._allocationCache || new Map();
        container._allocationCache = allocationCache;

        if (!children.find((ch) => !allocationCache.has(ch))) {
            children.forEach((ch) => ch.allocate(allocationCache.get(ch)));
            return;
        }
        allocationCache.clear();

        this._rowCount = Math.ceil(Math.sqrt(children.length)) + 1;
        let rowHeight = 0;
        while (
            this._rowCount > 1 &&
            rowHeight < availableHeight * MASONRY_ROW_MIN_HEIGHT_PERCENTAGE
        ) {
            this._rowCount--;
            rowHeight =
                (availableHeight - this._spacing * (this._rowCount - 1)) /
                this._rowCount;
        }
        rowHeight = Math.min(rowHeight, this._maxRowHeight);
        rowHeight = this._rowHeight;
        var rowWidths = Array(this._rowCount).fill(0); // Tracks the width of each row

        // Store placements
        var placements = [];

        for (var child of children) {
            // Retrieve the preferred height and width to calculate the aspect ratio
            var [minHeight, naturalHeight] = child.get_preferred_height(-1);
            var [minWidth, naturalWidth] =
                child.get_preferred_width(naturalHeight);

            // Maintain the aspect ratio
            var aspectRatio = naturalWidth / naturalHeight;
            var width = rowHeight * aspectRatio;

            // Find the shortest row
            // This might not look efficient, but the number of rows is
            // very low so is not going to affect performance
            let shortestRow = rowWidths.indexOf(Math.min(...rowWidths));
            if (
                rowWidths[shortestRow] + width > availableWidth &&
                rowWidths[shortestRow] !== 0
            ) {
                shortestRow = this._rowCount;
                rowWidths.push(0);
                this._rowCount++;
            }

            // if the element has a width higher than the container
            // clamp its width and change its height preserving
            // aspect ratio
            var childWidth = Math.clamp(width, width, availableWidth);
            var childHeight = childWidth / aspectRatio;

            placements.push({
                child,
                row: shortestRow,
                width: childWidth,
                height: childHeight,
                x: rowWidths[shortestRow],
                rowWidth: 0,
            });

            // Update row width
            if (rowWidths[shortestRow] === 0) rowWidths[shortestRow] = width;
            else rowWidths[shortestRow] += this._spacing + width;
        }

        /*
        we want the largest rows in the middle and the smallest rows on the sides
        e.g. if we have the following layout
                [ ][][  ]
                [][]
                []
                [ ][  ]
        we want the largest rows in the middle, for example
                []
                [ ][][  ]
                [ ][  ]
                [][]
        then later we will center horizontally, like the following
                   []
                [ ][][  ]
                 [ ][  ]
                  [][]
        */
        for (var placement of placements)
            placement.rowWidth = rowWidths[placement.row];

        // map row widths to an array of <rowWidth, rowIndex>
        var sortedRowWidths: number[][] = [...rowWidths].map((v, i) => [
            v,
            i,
        ]);
        // sort by width. The first element will be the largest row
        sortedRowWidths.sort((a, b) => b[0] - a[0]);
        // map the row's original index to new row's index
        // then shift right the array to finally have the largest
        // rows in the middle and the smallest on the first and last positions (the sides)
        var rowsOrdering = new Map<number, number>();
        sortedRowWidths.forEach((row, newIndex) => {
            var index = row[1];
            rowsOrdering.set(
                index,
                (newIndex + Math.floor(this._rowCount / 2)) % this._rowCount,
            );
        });
        for (var placement of placements)
            placement.row = rowsOrdering.get(placement.row) ?? placement.row;

        // compute the Y position of each row
        var rowYPosition = Array(this._rowCount).fill({ y: 0, height: 0 });
        for (var placement of placements) {
            rowYPosition[placement.row] = {
                y: 0,
                height: placement.height,
            };
        }
        rowYPosition[0].y = this._spacing;
        for (let r = 1; r < this._rowCount; r++) {
            rowYPosition[r].y =
                this._spacing +
                rowYPosition[r - 1].y +
                rowYPosition[r - 1].height;
        }

        var contentHeight =
            rowYPosition[this._rowCount - 1].y +
            rowYPosition[this._rowCount - 1].height;
        // Calculate offsets for centering the entire grid within the available space
        var verticalOffset =
            this._spacing / 2 +
            Math.max(0, (availableHeight - contentHeight) / 2);

        // finally allocate children with preserved proportions
        for (var placement of placements) {
            var { child, row, width, x, rowWidth, height } = placement;

            var y = box.y1 + rowYPosition[row].y + verticalOffset;
            // Center the content horizontally
            var horizontalOffset =
                Math.max(0, (availableWidth - rowWidth) / 2) + this._spacing;
            var xPosition = box.x1 + x + horizontalOffset;

            var newBox = new Clutter.ActorBox({
                x1: xPosition,
                y1: y,
                x2: xPosition + width,
                y2: y + height,
            });
            allocationCache.set(child, newBox);
            child.allocate(newBox);
        }
    }

    vfunc_get_preferred_width(
        container: Clutter.Actor,
        forHeight: number,
    ): [number, number] {
        let maxX = 0;
        container.get_children().forEach((ch) => {
            maxX = Math.max(maxX, ch.x + ch.width);
        });
        // add this._spacing because we want some right padding
        return [maxX + this._spacing, maxX + this._spacing];
    }

    vfunc_get_preferred_height(
        container: Clutter.Actor,
        forWidth: number,
    ): [number, number] {
        let maxY = 0;
        container.get_children().forEach((ch) => {
            maxY = Math.max(maxY, ch.y + ch.height);
        });
        // add this._spacing because we want some bottom padding
        return [maxY + this._spacing, maxY + this._spacing];
    }
}

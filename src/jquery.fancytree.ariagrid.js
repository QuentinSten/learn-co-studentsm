/*!
 * jquery.fancytree.ariagrid.js
 *
 * Support ARIA compliant markup and keyboard navigation for tree grids with
 * embedded input controls.
 * (Extension module for jquery.fancytree.js: https://github.com/mar10/fancytree/)
 *
 * @requires ext-table
 *
 * Copyright (c) 2008-2017, Martin Wendt (http://wwWendt.de)
 *
 * Released under the MIT license
 * https://github.com/mar10/fancytree/wiki/LicenseInfo
 *
 * @version @VERSION
 * @date @DATE
 */

;(function($, window, document, undefined) {

"use strict";

/*
  - References:
    - https://github.com/w3c/aria-practices/issues/132
    - https://rawgit.com/w3c/aria-practices/treegrid/examples/treegrid/treegrid-row-nav-primary-1.html
    - https://github.com/mar10/fancytree/issues/709

  TODO:

  - In strict mode, how can a user leave an embedded text input, if it is
    the only control in a row?

  - Use aria-expanded on the row except in the cellFocus=force case, in which
    case it should be on the title cell
    Make sure the aria-expanded is not present when the row has no children
    Mirror aria-expanded from each row to the cell with the expander
  
  - When a cell has a single focusable widget, the aria-activedescendant should 
    point to the widget instead of the parent
	Where should it point to in row mode?
   
  - If rows are hidden I suggest aria-hidden="true" on them (may be optional)
    aria-hidden currently not set (instead style="display: none")
    (needs to be added to ext-table)

  - enable treeOpts.aria by default
    (requires some benchmarks, confirm it does not affect performance too much)

  - make ext-ariagrid part of ext-table (enable behavior with treeOpts.aria option)
    (Requires stable specification)
*/


/*******************************************************************************
 * Private functions and variables
 */

// Allow these navigation keys even when input controls are focused

var FT = $.ui.fancytree,
	clsFancytreeActiveCell = "fancytree-active-cell",
	// TODO: define attribute- and class-names for better compression
	// Define which keys are handled by embedded control, and should *not* be 
	// passed to tree navigation handler:
	NAV_KEYS = {
		"text": ["left", "right", "home", "end", "backspace"],
		"number": ["up", "down", "left", "right", "home", "end", "backspace"],
		"checkbox": [],
		"link": [],
		"radiobutton": ["up", "down"],
		"select-one": ["up", "down"],
		"select-multiple": ["up", "down"]
	};


/* Calculate TD column index (considering colspans).*/
function getColIdx($tr, $td) {
	var colspan,
		td = $td.get(0),
		idx = 0;

	$tr.children().each(function () {
		if( this === td ) {
			return false;
		}
		colspan = $(this).prop("colspan");
		idx += colspan ? colspan : 1;
	});
	return idx;
}


/* Find TD at given column index (considering colspans).*/
function findTdAtColIdx($tr, colIdx) {
	var colspan,
		res = null,
		idx = 0;

	$tr.children().each(function () {
		if( idx >= colIdx ) {
			res = $(this);
			return false;
		}
		colspan = $(this).prop("colspan");
		idx += colspan ? colspan : 1;
	});
	return res;
}


/* Find adjacent cell for a given direction. Skip empty cells and consider merged cells */
function findNeighbourTd(tree, $target, keyCode){
	var $td = $target.closest("td"),
		$tr = $td.parent(),
		treeOpts = tree.options,
		colIdx = getColIdx($tr, $td),
		$tdNext = null;

	switch( keyCode ){
		case "left":
			$tdNext = treeOpts.rtl ? $td.next() : $td.prev();
			break;
		case "right":
			$tdNext = treeOpts.rtl ? $td.prev() : $td.next();
			break;
		case "up":
		case "down":
			while( true ) {
				$tr = keyCode === "up" ? $tr.prev() : $tr.next();
				if( !$tr.length ) {
					break;
				}
				// Skip hidden rows
				if( $tr.is(":hidden") ) {
					continue;
				}
				// Find adjacent cell in the same column
				$tdNext = findTdAtColIdx($tr, colIdx);
				// Skip cells that don't contain a focusable element
//				if( $tdNext && $tdNext.find(":input,a").length ) {
					break;
//				}
			}
			break;
		case "ctrl+home":
			$tdNext = findTdAtColIdx($tr.siblings().first(), colIdx);
			if( $tdNext.is(":hidden") ) {
				$tdNext = findNeighbourTd(tree, $tdNext.parent(), "down");
			}
			break;
		case "ctrl+end":
			$tdNext = findTdAtColIdx($tr.siblings().last(), colIdx);
			if( $tdNext.is(":hidden") ) {
				$tdNext = findNeighbourTd(tree, $tdNext.parent(), "up");
			}
			break;
		case "home":
			$tdNext = treeOpts.rtl ? $tr.children("td").last() : $tr.children("td").first();
			break;
		case "end":
			$tdNext = treeOpts.rtl ? $tr.children("td").first() : $tr.children("td").last();
			break;
	}
	return $tdNext.length ? $tdNext : null;
}

/**
 * [ext-ariagrid] Set active cell and activate cell-mode if needed. 
 * Pass $td=null to enter row-mode.
 *
 * See also FancytreeNode#setActive(flag, {cell: idx})
 *
 * @param {jQuery | Element | integer} [$td] 
 * @alias Fancytree#activateCell
 * @requires jquery.fancytree.ariagrid.js
 * @since 2.23
*/
$.ui.fancytree._FancytreeClass.prototype.activateCell = function($td) {
	var $input, $tr,
		treeOpts = this.options,
		opts = treeOpts.ariagrid,
		$prevTd = this.$activeTd || null,
		$prevTr = $prevTd ? $prevTd.closest("tr") : null;

	this.debug("activateCell: " + ($prevTd ? $prevTd.text() : "null") +
		" -> " + ($td ? $td.text() : "OFF"));
	// this.debug("activateCell2: activeNode" + this.activeNode);

	// TODO: make available as event
	// if( this._triggerNodeEvent("cellActivate", node, event, {activeTd: tree.$activeTd, colIdx: colIdx}) === false ) {
	// 	return false;
	// }

	if( $td ) {
		FT.assert($td.length, "Invalid active cell");
		this.$container.addClass("fancytree-cell-mode");
		$tr = $td.closest("tr");
		if( $prevTd ) {
			// cell-mode => cell-mode
			if( $prevTd.is($td) ) {
				return;
			}
			$prevTd
				.removeAttr("tabindex")
				.removeClass(clsFancytreeActiveCell);

			if( !$prevTr.is($tr) ) {
				// We are moving to a different row: only the inputs in the 
				// active row should be tabbable
				$tr.find(">td :input:enabled,a").attr("tabindex", "0");
				$prevTr.find(">td :input,a").attr("tabindex", "-1");
				FT.getNode($td).setActive();
			}
			// tree.$activeTd.find(":focus").blur();
		} else {

		}
		$td.addClass(clsFancytreeActiveCell);
		this.$activeTd = $td;

		$input = $td.find(":input:enabled,a");
		if( opts.autoFocusInput && $input.length ) {
			$input.focus();
		} else {
			$td.attr("tabindex", "-1").focus();
			// tree.$container.focus();
		}
	} else {
		// $td == null: switch back to row-mode
		this.$container.removeClass("fancytree-cell-mode");
		// console.log("activateCell: set row-mode for " + this.activeNode, $prevTd);
		if( $prevTd ) {
			// cell-mode => row-mode
			$prevTd
				.removeAttr("tabindex")
				.removeClass(clsFancytreeActiveCell);

			// In row-mode, only embedded inputs of the active row are tabbable
			$prevTr.find("td")
				.blur()  // we need to blur first, because otherwise the focus frame is not reliably removed(?)
				.removeAttr("tabindex");
			$prevTr.find(":input:enabled,a")
				.attr("tabindex", "-1");
			this.$activeTd = null;
			// $prevTr.find(">td :input,a").attr("tabindex", "-1");
			// The cell lost focus, but the tree still needs to capture keys:
			// this.setFocus();
			this.activeNode.setFocus();

			// FT.getNode($prevTr).setActive();
			// console.log("activateCell: after setFocus " + this.activeNode);
			// this.activeNode = FT.getNode($prevTr);
		} else {
			// row-mode => row-mode (nothing to do)
		}
	}
};


/*******************************************************************************
 * Extension code
 */
$.ui.fancytree.registerExtension({
	name: "ariagrid",
	version: "@VERSION",
	// Default options for this extension.
	options: {
		// Internal behavior flags, currently controlled via `extendedMode`
		autoFocusInput: true,  // true: user must hit Enter to focus control
		activateCellOnDoubelclick: true,
		enterToCellMode: false,
		// End of internal flags
		extendedMode: false,
		cellFocus: "allow",
		// TODO: document `defaultCellAction` event
		// TODO: use a global tree option `name` or `title` instead?:
		label: "Tree Grid"  // Added as `aria-label` attribute
	},

	treeInit: function(ctx){
		var tree = ctx.tree,
			treeOpts = ctx.options,
			opts = treeOpts.ariagrid;

		// ariagrid requires the table extension to be loaded before itself
		this._requireExtension("table", true, true);
		if( !treeOpts.aria ) { $.error("ext-ariagrid requires `aria: true`"); }

		if( opts.extendedMode ) {
			opts.autoFocusInput = false;
			opts.enterToCellMode = true;
			opts.activateCellOnDoubelclick = true;
		}

		this._superApply(arguments);

		this.$activeTd = null;

		this.$container
			.addClass("fancytree-ext-ariagrid")
			.attr("aria-label", "" + opts.label);
		this.$container.find("thead > tr > th")
			.attr("role", "columnheader");

		this.nodeColumnIdx = treeOpts.table.nodeColumnIdx;
		this.checkboxColumnIdx = treeOpts.table.checkboxColumnIdx;
		if( this.checkboxColumnIdx == null ) {
			this.checkboxColumnIdx = this.nodeColumnIdx;
		}

		// Activate node if embedded input gets focus (due to a click)
		this.$container.on("focusin", function(event){
			var node = FT.getNode(event.target),
				$td = $(event.target).closest("td");

			tree.debug("focusin: " + (node ? node.title : "null") +
				", target: " + ($td ? $td.text() : null) +
				", node was active: " + (node && node.isActive()) +
				", last cell: " + (tree.$activeTd ? tree.$activeTd.text() : null));
			tree.debug("focusin: target", event.target);
			if( node && !$td.is(tree.$activeTd) && $(event.target).is(":input") ) {
				node.debug("Activate cell on INPUT focus event");
				tree.activateCell($td);
			}

		}).on("fancytreefocustree", function(event, data){
			// Enforce cell-mode when container gets focus
			if( (opts.cellFocus === "start" || opts.cellFocus === "force") && !tree.activeTd ) {
				tree.debug("Enforce cell-mode on focusTree event");
				tree.getFirstChild().setActive(true, {cell: 0});
			}
		});
	},
	nodeClick: function(ctx) {
		var targetType = ctx.targetType,
			tree = ctx.tree,
			node = ctx.node,
			$td = $(event.target).closest("td");

		tree.debug("nodeClick: node: " + (node ? node.title : "null") +
			", targetType: " + targetType +
			", target: " + ($td.length ? $td.text() : null) +
			", node was active: " + (node && node.isActive()) +
			", last cell: " + (tree.$activeTd ? tree.$activeTd.text() : null));

		if( tree.$activeTd ) {
			// If already in cell-mode, activate new cell
			tree.activateCell($td);
			return false;
		}
		return this._superApply(arguments);
	},
	nodeDblclick: function(ctx) {
		var tree = ctx.tree,
			treeOpts = ctx.options,
			opts = treeOpts.ariagrid,
			$td = $(event.target).closest("td");

		// console.log("nodeDblclick", tree.$activeTd, ctx.options.ariagrid.cellFocus)
		if( opts.activateCellOnDoubelclick && !tree.$activeTd && opts.cellFocus === "allow" ) {
			// If in row-mode, activate new cell
			tree.activateCell($td);
			return false;
		}
		return this._superApply(arguments);
	},
	nodeRenderStatus: function(ctx) {
		// Set classes for current status
		var res,
			node = ctx.node,
			$tr = $(node.tr);

		res = this._super(ctx);

		if( node.parent ) {
			$tr
				.attr("aria-level", node.getLevel())
				.attr("aria-setsize", node.parent.children.length)
				.attr("aria-posinset", node.getIndex() + 1);

			if( $tr.is(":hidden") ) {
				$tr.attr("aria-hidden", true);
			} else {
				$tr.removeAttr("aria-hidden");
			}
			// this.debug("nodeRenderStatus: " + this.$activeTd + ", " + $tr.attr("aria-expanded"));
			// In cell-mode, move aria-expanded attribute from TR to its parent TD
			if( this.$activeTd && $tr.attr("aria-expanded") != null ) {
				$tr.remove("aria-expanded");
				$tr.find("td").eq(this.nodeColumnIdx).attr("aria-expanded", node.isExpanded());
			} else {
				$tr.find("td").eq(this.nodeColumnIdx).removeAttr("aria-expanded");
			}
		}
		return res;
	},
	nodeSetActive: function(ctx, flag, callOpts) {
		var $td,
			node = ctx.node,
			tree = ctx.tree,
			// treeOpts = ctx.options,
			// opts = treeOpts.ariagrid,
			$tr = $(node.tr);

		flag = (flag !== false);
		node.debug("nodeSetActive(" + flag + ")");
		// Support custom `cell` option
		if( flag && callOpts && callOpts.cell != null ) {
			// `cell` may be a col-index, <td>, or `$(td)`
			if( typeof callOpts.cell === "number" ) {
				$td = findTdAtColIdx($tr, callOpts.cell);
			} else {
				$td = $(callOpts.cell);
			}
			tree.activateCell($td);
			return;
		}
		tree.debug("nodeSetActive: activeNode" + this.activeNode);
		return this._superApply(arguments);
	},
	nodeKeydown: function(ctx) {
		var handleKeys, inputType, $td,
			tree = ctx.tree,
			node = ctx.node,
			treeOpts = ctx.options,
			opts = treeOpts.ariagrid,
			event = ctx.originalEvent,
			eventString = FT.eventToString(event),
			$target = $(event.target),
			$activeTd = this.$activeTd,
			$activeTr = $activeTd ? $activeTd.closest("tr") : null,
			colIdx = $activeTd ? getColIdx($activeTr, $activeTd) : -1;

		if( $target.is(":input:enabled") ) {
			inputType = $target.prop("type");
		} else if( $target.is("a") ) {
			inputType = "link";
		}
		ctx.tree.debug("nodeKeydown(" + eventString + "), activeTd: '" + 
			($activeTd && $activeTd.text()) + "', inputType: " + inputType +
			", node: ", node, event);

		if( inputType && eventString !== "esc" ){
			handleKeys = NAV_KEYS[inputType];
			if( handleKeys && $.inArray(eventString, handleKeys) >= 0 ){
				return;  // Let input control handle the key
			}
		}
		// if( ctx.options.cellFocus === "force" || ctx.options.cellFocus === "start" ) {
		// 	var $td = $(this.getFirstChild().tr).find(">td:first");
		// 	_activateCell(this, $td);
		// }

		switch( eventString ) {
		case "right":
			if( $activeTd ) {
				// Cell mode: move to neighbour
				$td = findNeighbourTd(tree, $activeTd, eventString);
				tree.activateCell($td);
			} else if ( node && !node.isExpanded() && node.hasChildren() !== false ) {
				// Row mode and current node can be expanded: 
				// default handling will expand.
				break;
			} else {
				// Row mode: switch to cell-mode
				$td = $(node.tr).find(">td:first");
				tree.activateCell($td);
			}
			return;  // no default handling

		case "left":
		case "home":
		case "end":
		case "ctrl+home":
		case "ctrl+end":
		case "up":
		case "down":
			if( $activeTd ) {
				// Cell mode: move to neighbour
				$td = findNeighbourTd(tree, $activeTd, eventString);
				// Note: $td may be null if we move outside bounds. In this case
				// we switch back to row-mode
				if( $td || opts.cellFocus !== "force" ) {
					tree.activateCell($td);
				}
				return false;
			}
			break;

		case "esc":
			if( opts.extendedMode && $activeTd && $target.is(":input") ) {
				// Extended mode: move focus from <input> to parent <td>
				$target.closest("td").focus();
				return false;
			} else if( opts.extendedMode && $activeTd && opts.cellFocus !== "force" ) {
				// Extended mode: switch back from cell-mode to row-mode
				tree.activateCell(null);
				return false;
			}
			break;

		case "return":
			// Let caller override the default action:
			if( tree._triggerNodeEvent("defaultCellAction", node, event, {activeTd: tree.$activeTd, colIdx: colIdx}) === false ) {
				return false;
			}
			if( $activeTd ) {
				// Apply 'default action' for embedded cell control
				if( colIdx === this.nodeColumnIdx ) {
					node.toggleExpanded();
					return false;
				} else if( colIdx === this.checkboxColumnIdx ) {
					node.toggleSelected();
					return false;
				} else if( $activeTd.find(":checkbox:enabled").length ) {
					// Embedded checkboxes are always toggled (ignoring `autoFocusInput`)
					$activeTd.find(":checkbox:enabled").click();
					return false;
				} else if( !opts.autoFocusInput && !inputType && $activeTd.find(":input:enabled").length ) {
					// autoFocusInput is off: 
					// If we don't focus embedded inputs on navigation by default, 
					// we do it as ENTER default action
					$target.find(":input:enabled").focus();
					return false;
				} else if( $activeTd.find("a").length ) {
					$activeTd.find("a")[0].click();
					return false;
				}
				return false;
			} else {
				// ENTER in row-mode
				if( opts.enterToCellMode ) {
					// Switch from row-mode to cell-mode
					$td = $(node.tr).find(">td:nth(" + this.nodeColumnIdx + ")");
					tree.activateCell($td);
					return;  // no default handling
				}
			}
			break;
		case "space":
			if( $activeTd && colIdx !== this.checkboxColumnIdx ) {
				// make sure we don't select whole row in cell-mode, unless the
				// checkbox cell is active
				return;  // no default handling
			}
			break;
		// default:
		}
		return this._superApply(arguments);
	}
});
}(jQuery, window, document));

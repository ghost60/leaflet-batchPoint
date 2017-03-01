L.CanvasOverlay = L.Layer.extend({
    initialize: function(options) {
        L.setOptions(this, options);
        L.stamp(this);
        this._layers = this._layers || {};
    },

    onAdd: function() {
        var container = this._container = document.createElement('canvas');
        this._ctx = container.getContext('2d');
        if (this._zoomAnimated) {
            L.DomUtil.addClass(this._container, 'leaflet-heatmap-layer leaflet-zoom-animated');
        }

        this.getPane().appendChild(this._container);
        this.adddata();
        this._update();
        // this.on('update', this._updatePaths, this);
    },

    onRemove: function() {
        L.DomUtil.remove(this._container);
        this.off('update', this._updatePaths, this);
    },

    getEvents: function() {
        var events = {
            viewreset: this._reset,
            moveend: this._update,
        };
        if (this._zoomAnimated) {
            events.zoomanim = this._onAnimZoom;
        }
        return events;
    },

    _onAnimZoom: function(ev) {
        this._updateTransform(ev.center, ev.zoom);
    },

    _updateTransform: function(center, zoom) {
        var scale = this._map.getZoomScale(zoom, this._zoom),
            position = L.DomUtil.getPosition(this._container),
            viewHalf = this._map.getSize().multiplyBy(0.5),
            currentCenterPoint = this._map.project(this._center, zoom),
            destCenterPoint = this._map.project(center, zoom),
            centerOffset = destCenterPoint.subtract(currentCenterPoint),

            topLeftOffset = viewHalf.multiplyBy(-scale).add(position).add(viewHalf).subtract(centerOffset);

        if (L.Browser.any3d) {
            L.DomUtil.setTransform(this._container, topLeftOffset, scale);
        } else {
            L.DomUtil.setPosition(this._container, topLeftOffset);
        }
    },

    _reset: function() {
        this._update();
        this._updateTransform(this._center, this._zoom);
    },

    _update: function() {
        var size = this._map.getSize();
        this._center = this._map.getCenter();
        this._zoom = this._map.getZoom();

        var container = this._container,
            m = L.Browser.retina ? 2 : 1;

        var topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(container, topLeft);

        container.width = m * size.x;
        container.height = m * size.y;
        container.style.width = size.x + 'px';
        container.style.height = size.y + 'px';

        if (L.Browser.retina) {
            this._ctx.scale(2, 2);
        }
        this.redraw();
    },
    redraw: function() {
        this.clear();
        this.updateGrid();
        this.getFillColorItems();
        this.setFillColorItems();
        this._draw();
        this.DrawLabel();
    },
    clear: function() {
        this._ctx.clearRect(0, 0, this._container.width, this._container.height);
    },
    adddata: function() {
        this.datasetGrid = {};
        this.datasetGrid.minvalue = data.minvalue;
        this.datasetGrid.maxvalue = data.maxvalue;
        this.datasetGrid.left = data.xmin;
        this.datasetGrid.right = data.xmax;
        this.datasetGrid.top = data.ymax;
        this.datasetGrid.bottom = data.ymin;
        this.datasetGrid.row = data.row;
        this.datasetGrid.col = data.col;
        this.datasetGrid.grid = data.data;
        this.noDataValue = -9999;
        this.alpha = 0.6;
    },
    updateGrid: function() {
        if (this.datasetGrid && this.datasetGrid.grid) {
            var pixelPointTopLeft = this._map.latLngToContainerPoint([this.datasetGrid.top, this.datasetGrid.left]);
            var pixelPointBottomRight = this._map.latLngToContainerPoint([this.datasetGrid.bottom, this.datasetGrid.right]);
            this.deltaX = Math.round((pixelPointBottomRight.x - pixelPointTopLeft.x) / (this.datasetGrid.col - 1));
            this.deltaY = Math.round((pixelPointBottomRight.y - pixelPointTopLeft.y) / (this.datasetGrid.row - 1));
            this.left = pixelPointTopLeft.x - Math.round(this.deltaX / 2);
            this.bottom = pixelPointBottomRight.y + Math.round(this.deltaY / 2);
            this.right = pixelPointBottomRight.x + Math.round(this.deltaX / 2);
            this.top = pixelPointTopLeft.y - Math.round(this.deltaY / 2);
        }
    },
    getFillColorItems: function() {
        this.items = setLegend(this.datasetGrid.minvalue, this.datasetGrid.maxvalue, heatMap_TempStyles);
    },
    _draw: function() {
        if (this.datasetGrid && this.datasetGrid.grid) {
            this._ctx.save();
            for (var i = 0; i < this.datasetGrid.row; i++) {
                for (var j = 0; j < this.datasetGrid.col; j++) {
                    this._ctx.beginPath();

                    if (this.datasetGrid.grid[i * j] == this.noDataValue) {
                        this._ctx.fillStyle = 'rgba(255,255,255,0)';
                    } else {
                        var rgb = this.convertValueToColor(this.datasetGrid.grid[i * j]);
                        this._ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + rgb.a + ')';
                    }
                    this._ctx.fillRect(this.left + this.deltaX * j, this.top + this.deltaY * i, this.deltaX, this.deltaY);
                    this._ctx.fill();
                }
            }
            this._ctx.clip();
            this._ctx.restore();

            // var deltaPixel = 3;
            // var noDataColor = {
            //     r: 0,
            //     g: 0,
            //     b: 0,
            //     a: 0
            // };

            // if (this.imgData == null || this.imgData.width != this.maxWidth || this.imgData.height != this.maxHeight)
            //     this.imgData = this._ctx.createImageData(this.maxWidth, this.maxHeight);
            // for (var i = top; i < bottom; i += deltaPixel) {
            //     for (var j = left; j < right; j += deltaPixel) {
            //         value = this.getValue(j, i);
            //         if (value == this.noDataValue)
            //             colorObj = noDataColor;
            //         else {
            //             if (hasTag) {
            //                 tag = this.getTag(j, i);
            //                 if (tag == this.datasetGrid.defaultTag)
            //                     colorObj = this.convertValueToColor(value);
            //                 else
            //                     colorObj = this.convertValueToColorWithTag(value, tag);
            //             } else
            //                 colorObj = this.convertValueToColor(value);
            //         }

            //         for (var r = 0; r < deltaPixel; r++) {
            //             var row = i + r;
            //             if (row >= maxHeight)
            //                 break;
            //             pixelIndexFullRow = row * maxWidth * 4;
            //             for (var c = 0; c < deltaPixel; c++) {
            //                 var col = j + c;
            //                 if (col >= maxWidth)
            //                     break;
            //                 pixelIndex = pixelIndexFullRow + col * 4;
            //                 this.imgData.data[pixelIndex] = colorObj.r;
            //                 this.imgData.data[pixelIndex + 1] = colorObj.g;
            //                 this.imgData.data[pixelIndex + 2] = colorObj.b;
            //                 this.imgData.data[pixelIndex + 3] = colorObj.a;
            //             }
            //         }
            //     }
            // }
            // this._ctx.clearRect(0, 0, this.maxWidth, this.maxHeight);
            // this._ctx.putImageData(this.imgData, 0, 0);
        }
    },
    DrawLabel: function() {
        var row = this.datasetGrid.row;
        var col = this.datasetGrid.col;
        var left = 0;
        var top = 0;
        var right = this._container.width;
        var bottom = this._container.height;

        var xIndexStart = left < this.left ? 0 : Math.floor((left - this.left) / this.deltaX);
        var yIndexStart = top < this.top ? 0 : Math.floor((top - this.top) / this.deltaY);

        var xIndexEnd = right > this.right ? col - 1 : Math.floor((right - this.left) / this.deltaX);
        var yIndexEnd = bottom > this.bottom ? row - 1 : Math.floor((bottom - this.top) / this.deltaY);

        if (xIndexStart > (col - 1) || yIndexStart > (row - 1) || xIndexEnd <= 0 || yIndexEnd <= 0 || xIndexStart == xIndexEnd || yIndexStart == yIndexEnd)
            return;

        var fontWidth = this._ctx.measureText("99.99").width;

        var intervalX = Math.round(fontWidth / this.deltaX) + 1;
        var intervalY = Math.round(fontWidth / this.deltaY) + 1;


        for (var i = yIndexStart; i <= yIndexEnd; i++) {

            if ((i - yIndexStart) % intervalY == 0) {

                for (var j = xIndexStart; j <= xIndexEnd; j++) {

                    if ((j - xIndexStart) % intervalX == 0) {

                        if (this.datasetGrid.grid[i * j] == this.noDataValue)
                            continue;
                        this._ctx.font = "normal normal normal 12px Arial";
                        this._ctx.textBaseline = 'middle';
                        this._ctx.fillStyle = 'rgba(0,0,0,1)';
                        this._ctx.fillText(this.datasetGrid.grid[i * j], this.left + Math.round(this.deltaX / 2) + this.deltaX * j, this.top + Math.round(this.deltaY / 2) + this.deltaY * i);
                    }
                }
            }
        }
    },
    setFillColorItems: function() {
        //计算itemsC，此处将items里面的权重计算到0-1范围内
        if (this.items && this.items.length > 1) {
            var len = this.items.length;
            this.itemsC = [];
            var min = this.items[0].start;
            var max = this.items[len - 1].end;
            //如果items里面的权重范围大，则以items里面的为准
            this.minWeight =
                this.minWeight = this.minWeight < min ? this.minWeight : min;
            this.maxWeight = this.maxWeight > max ? this.maxWeight : max;
            this.tempValue = this.maxWeight - this.minWeight;

            for (var i = 0; i < len; i++) {
                var start = (this.items[i].start - this.minWeight) / this.tempValue;
                var end = (this.items[i].end - this.minWeight) / this.tempValue;
                var item = {
                    start: start,
                    end: end,
                    startColor: this.items[i].startColor,
                    endColor: this.items[i].endColor
                };
                this.itemsC.push(item);
            }
        }
    },
    convertValueToColor: function(value) {
        var r = 255,
            g = 255,
            b = 255,
            a = 0,
            me = this;
        if (me.items) {
            var len = me.items.length;
            for (var i = 0; i < len; i++) {
                if (value >= me.items[i].start && value < me.items[i].end ||
                    i == (len - 1) && value >= me.items[i].start && value <= me.items[i].end ||
                    me.items[i].start == me.items[i].end && value == me.items[i].start) {
                    var startC = me.items[i].startColor;
                    if (typeof(me.items[i].visible) == "undefined" || me.items[i].visible) { //可见，typeof会不会影响效率
                        if (i == len - 1) //最大值
                        {
                            r = startC.red;
                            g = startC.green;
                            b = startC.blue;
                            a = me.alpha;
                        } else {
                            if (this.isSmooth && me.items[i].start != me.items[i].end) {
                                var endC = me.items[i + 1].startColor;
                                r = startC.red + (endC.red - startC.red) / (me.items[i + 1].start - me.items[i].start) * (value - me.items[i].start);
                                g = startC.green + (endC.green - startC.green) / (me.items[i + 1].start - me.items[i].start) * (value - me.items[i].start);
                                b = startC.blue + (endC.blue - startC.blue) / (me.items[i + 1].start - me.items[i].start) * (value - me.items[i].start);
                                a = me.alpha;
                            } else {
                                r = startC.red;
                                g = startC.green;
                                b = startC.blue;
                                a = me.alpha;
                            }
                        }
                    } else //隐藏
                    {
                        r = startC.red;
                        g = startC.green;
                        b = startC.blue;
                        a = 0;
                    }
                    break;
                }
            }
        }
        return {
            "r": r,
            "g": g,
            "b": b,
            "a": a
        };
    },
    getValue: function(xIndex, yIndex) {
        var result = this.noDataValue;
        var gridS = this.datasetGrid.grid;
        if (gridS == null || gridS.length == 0)
            return result;
        var xLeftTop = gridS[yIndex][xIndex].x;
        var yLeftTop = gridS[yIndex][xIndex].y;
        var zLeftTop = gridS[yIndex][xIndex].z;

        var xRightTop = gridS[yIndex][xIndex + 1].x;
        var yRightTop = gridS[yIndex][xIndex + 1].y;
        var zRightTop = gridS[yIndex][xIndex + 1].z;

        var xLeftBottom = gridS[yIndex + 1][xIndex].x;
        var yLeftBottom = gridS[yIndex + 1][xIndex].y;
        var zLeftBottom = gridS[yIndex + 1][xIndex].z;

        var xRightBottom = gridS[yIndex + 1][xIndex + 1].x;
        var yRightBottom = gridS[yIndex + 1][xIndex + 1].y;
        var zRightBottom = gridS[yIndex + 1][xIndex + 1].z;

        if (zLeftTop == this.noDataValue || zRightTop == this.noDataValue || zLeftBottom == this.noDataValue || zRightBottom == this.noDataValue)
            result = gridS[yIndex][xIndex].z;
        else
            result = Math.abs(yLeftBottom - y) / this.deltaY * (Math.abs(xRightTop - x) / this.deltaX * zLeftTop + Math.abs(xLeftTop - x) / this.deltaX * zRightTop) + Math.abs(yLeftTop - y) / this.deltaY * (Math.abs(xRightBottom - x) / this.deltaX * zLeftBottom + Math.abs(xLeftBottom - x) / this.deltaX * zRightBottom);
        result = Math.round(result * 10) / 10; //保留1位小数
        return result;


        // if (x < this.left || x > this.right || y < this.top || y > this.bottom)
        //     return result;

        // var xRelative = x - this.left;
        // var yRelative = y - this.top;

        // //        var deltaX = Math.abs(gridS[1][1].x - gridS[0][0].x);
        // //        var deltaY = Math.abs(gridS[1][1].y - gridS[0][0].y);
        // var xIndex = xRelative < 0 ? 0 : Math.floor(xRelative / this.deltaX); //列
        // var yIndex = yRelative < 0 ? 0 : Math.floor(yRelative / this.deltaY); //行

        // //左上
        // if (xIndex < 0 && yIndex < 0) {
        //     return gridS[0][0].z;
        // }

        // //左下
        // if (xIndex < 0 && yIndex >= gridS.length - 1) {
        //     return gridS[gridS.length - 1][0].z;
        // }

        // //右下
        // if (xIndex >= gridS[0].length - 1 && yIndex >= gridS.length - 1) {
        //     return gridS[gridS.length - 1][gridS[0].length - 1].z;
        // }

        // //右上
        // if (xIndex >= gridS[0].length - 1 && yIndex < 0) {
        //     return gridS[0][gridS[0].length - 1].z;
        // }


        //if(!this.isSmooth || this.map.getResolution() < 0.003)
        // if (!this.isSmooth || this.map.getResolution() < 0.003 && !this.isAlwaySmooth) {
        //     result = gridS[yIndex][xIndex].z;
        // } else //进行双线性插值
        // {
        //     //左、右边缘
        //     if (xIndex < 0 || xIndex >= gridS[0].length - 1) {
        //         var yTop = gridS[yIndex][xIndex < 0 ? 0 : gridS[yIndex].length - 1].y;
        //         var zTop = gridS[yIndex][xIndex < 0 ? 0 : gridS[yIndex].length - 1].z;
        //         var yBottom = gridS[yIndex + 1][xIndex < 0 ? 0 : gridS[yIndex].length - 1].y;
        //         var zBottom = gridS[yIndex + 1][xIndex < 0 ? 0 : gridS[yIndex].length - 1].z;
        //         result = Math.abs(yBottom - y) / this.deltaY * zTop + Math.abs(yTop - y) / this.deltaY * zBottom;
        //         result = Math.round(result * 10) / 10; //保留1位小数
        //         return result;
        //     }

        //     //上、下边缘
        //     if (yIndex < 0 || yIndex >= gridS.length - 1) {
        //         var xLeft = gridS[yIndex < 0 ? 0 : gridS.length - 1][xIndex].x;
        //         var zLeft = gridS[yIndex < 0 ? 0 : gridS.length - 1][xIndex].z;
        //         var xRight = gridS[yIndex < 0 ? 0 : gridS.length - 1][xIndex + 1].x;
        //         var zRight = gridS[yIndex < 0 ? 0 : gridS.length - 1][xIndex + 1].z;
        //         result = Math.abs(xRight - x) / this.deltaX * zLeft + Math.abs(xLeft - x) / this.deltaX * zRight;
        //         result = Math.round(result * 10) / 10; //保留1位小数
        //         return result;
        //     }

        //     var xLeftTop = gridS[yIndex][xIndex].x;
        //     var yLeftTop = gridS[yIndex][xIndex].y;
        //     var zLeftTop = gridS[yIndex][xIndex].z;

        //     var xRightTop = gridS[yIndex][xIndex + 1].x;
        //     var yRightTop = gridS[yIndex][xIndex + 1].y;
        //     var zRightTop = gridS[yIndex][xIndex + 1].z;

        //     var xLeftBottom = gridS[yIndex + 1][xIndex].x;
        //     var yLeftBottom = gridS[yIndex + 1][xIndex].y;
        //     var zLeftBottom = gridS[yIndex + 1][xIndex].z;

        //     var xRightBottom = gridS[yIndex + 1][xIndex + 1].x;
        //     var yRightBottom = gridS[yIndex + 1][xIndex + 1].y;
        //     var zRightBottom = gridS[yIndex + 1][xIndex + 1].z;

        //     if (zLeftTop == this.noDataValue || zRightTop == this.noDataValue || zLeftBottom == this.noDataValue || zRightBottom == this.noDataValue)
        //         result = gridS[yIndex][xIndex].z;
        //     else
        //         result = Math.abs(yLeftBottom - y) / this.deltaY * (Math.abs(xRightTop - x) / this.deltaX * zLeftTop + Math.abs(xLeftTop - x) / this.deltaX * zRightTop) + Math.abs(yLeftTop - y) / this.deltaY * (Math.abs(xRightBottom - x) / this.deltaX * zLeftBottom + Math.abs(xLeftBottom - x) / this.deltaX * zRightBottom);
        // }
        // result = Math.round(result * 10) / 10; //保留1位小数
        // return result;
    },
});

L.canvasOverlay = function(userDrawFunc, options) {
    return new L.CanvasOverlay(userDrawFunc, options);
};
L.BatchPoint = L.Layer.extend({
  initialize: function (data, options) {
    L.setOptions(this, options)
    L.stamp(this)
    this._layers = this._layers || {}
    this.data = data
  },

  onAdd: function () {
    var container = this._container = document.createElement('canvas')
    this._ctx = container.getContext('2d')
    if (this._zoomAnimated) {
      L.DomUtil.addClass(this._container, 'leaflet-batchpoint-layer leaflet-zoom-animated')
    }

    // L.DomEvent
    //         // .on(container, 'mousemove', console.log('aaa'), this)
    //         .on(container, 'click dblclick mousedown mouseup contextmenu', console.log('bbb'), this)
    //         // .on(container, 'mouseout', console.log('ccc'), this)

    this.getPane().appendChild(this._container)
    this._update()
        // this.on('update', this._updatePaths, this);
  },

  onRemove: function () {
    L.DomUtil.remove(this._container)
        // this.off('update', this._updatePaths, this);
  },

  getEvents: function () {
    var events = {
      viewreset: this._reset,
      moveend: this._update,
      click: this.clickHandle,
      mousemove: this.onMousemove
    }
    if (this._zoomAnimated) {
      events.zoomanim = this._onAnimZoom
    }
    return events
  },

  clickHandle: function () {
    this.select = false
    var e = window.event || e
    // var mouseX = e.clientX - this._container.left // 获取鼠标在canvsa中的坐标
    // var mouseY = e.clientY - this._container.top
    var mouseX = e.clientX
    var mouseY = e.clientY
    for (var i = this.inbounddata.length - 1; i >= 0; --i) { // 检查每一个圆，看鼠标是否落在其中
      var circleX = this.inbounddata[i].latlng.x
      var circleY = this.inbounddata[i].latlng.y
      var radius = this.options.radius + 10
      // 到圆心的距离是否小于半径
      if ((Math.pow(mouseX - circleX, 2) + Math.pow(mouseY - circleY, 2)) < Math.pow(radius, 2)) {
        this.select = this.inbounddata[i].id
        var ll = this._map.containerPointToLatLng(this.inbounddata[i].latlng)
        var popup = L.popup()
        .setLatLng(ll)
        .setContent('<p>属性:' + this.inbounddata[i].atr + '<br />' + '坐标:X:' + ll.lng + ', Y:' + ll.lat + '</p>')
        .openOn(this._map)
        this.clear()
        this._highLight()
        break
      }
    }
  },

  onMousemove: function () {
    if (L.DomUtil.hasClass(this._container, 'leaflet-interactive')) {
      L.DomUtil.removeClass(this._container, 'leaflet-interactive')
    }
    var e = window.event || e
    // var mouseX = e.clientX - this._container.left // 获取鼠标在canvsa中的坐标
    // var mouseY = e.clientY - this._container.top
    var mouseX = e.clientX
    var mouseY = e.clientY
    for (var i = this.inbounddata.length - 1; i >= 0; --i) { // 检查每一个圆，看鼠标是否落在其中
      var circleX = this.inbounddata[i].latlng.x
      var circleY = this.inbounddata[i].latlng.y
      var radius = this.options.radius + 8
      // 到圆心的距离是否小于半径
      if ((Math.pow(mouseX - circleX, 2) + Math.pow(mouseY - circleY, 2)) < Math.pow(radius, 2)) {
        L.DomUtil.addClass(this._container, 'leaflet-interactive')
        break
      }
    }
  },

    // canvasBound: function() {
        // var pixelPointTopLeft = this._map.latLngToContainerPoint([this.datasetGrid.top, this.datasetGrid.left]);
        // var pixelPointBottomRight = this._map.latLngToContainerPoint([this.datasetGrid.bottom, this.datasetGrid.right]);
        // this.left = 0;
        // this.bottom = 0;
        // this.right = 0;
        // this.top = 0;
    // },

  _onAnimZoom: function (ev) {
    this._updateTransform(ev.center, ev.zoom)
  },

  _updateTransform: function (center, zoom) {
    var scale = this._map.getZoomScale(zoom, this._zoom),
      position = L.DomUtil.getPosition(this._container),
      viewHalf = this._map.getSize().multiplyBy(0.5),
      currentCenterPoint = this._map.project(this._center, zoom),
      destCenterPoint = this._map.project(center, zoom),
      centerOffset = destCenterPoint.subtract(currentCenterPoint),
      topLeftOffset = viewHalf.multiplyBy(-scale).add(position).add(viewHalf).subtract(centerOffset)

    if (L.Browser.any3d) {
      L.DomUtil.setTransform(this._container, topLeftOffset, scale)
    } else {
      L.DomUtil.setPosition(this._container, topLeftOffset)
    }
  },

  _reset: function () {
    this._update()
    this._updateTransform(this._center, this._zoom)
  },

  _update: function () {
    var size = this._map.getSize()
    this._center = this._map.getCenter()
    this._zoom = this._map.getZoom()

    var container = this._container,
      m = L.Browser.retina ? 2 : 1

    var topLeft = this._map.containerPointToLayerPoint([0, 0])
    L.DomUtil.setPosition(container, topLeft)

    container.width = m * size.x
    container.height = m * size.y
    container.style.width = size.x + 'px'
    container.style.height = size.y + 'px'

    if (L.Browser.retina) {
      this._ctx.scale(2, 2)
    }
    this.redraw()
  },
  redraw: function () {
    this.clear()
    this._draw()
  },
  clear: function () {
    this._ctx.clearRect(0, 0, this._container.width, this._container.height)
  },
  _draw: function () {
    var b = new Date()
    if (this.data !== 'undefined' && Array.isArray(this.data.geo)) {
      let data = this.data.geo
      this.inbounddata = []
      this._ctx.save()
      bbb:
      for (var i = data.length - 1; i >= 0; --i) {
        var point = this._map.latLngToContainerPoint([data[i].latlng[0], data[i].latlng[1]])
        if (point.x < 0 || point.x > this._container.width || point.y < 0 || point.y > this._container.height) {
          continue
        }
        for (var j = this.inbounddata.length - 1; j >= 0; --j) {
          if (Math.abs(this.inbounddata[j].latlng.x - point.x) < 10 && Math.abs(this.inbounddata[j].latlng.y - point.y) < 10) {
            continue bbb
          }
        }
        let drawed = {id: data[i].id, latlng: point, atr: data[i].atr}
        this.inbounddata.push(drawed)

        let color = this.options.color
        let radius = this.options.radius
        if (this.select) {
          if (data[i].id === this.select) {
            color = 'red'
            radius += 2
          }
        }

        this._ctx.beginPath()
        this._ctx.arc(point.x, point.y, radius, 0, 360, false)
        this._ctx.fillStyle = color// 填充颜色,默认是黑色
        this._ctx.fill()// 画实心圆
        this._ctx.closePath()
      }
      this._ctx.restore()
    }
    var e = new Date()
    console.log('循环绘制' + (e - b))
  },

  _highLight: function () {
    if (this.select) {
      this._ctx.save()
      for (var i = this.inbounddata.length - 1; i >= 0; --i) {
        let color = this.options.color
        let radius = this.options.radius
        if (this.inbounddata[i].id === this.select) {
          color = 'red'
          radius += 2
        }
        this._ctx.beginPath()
        this._ctx.arc(this.inbounddata[i].latlng.x, this.inbounddata[i].latlng.y, radius, 0, 360, false)
        this._ctx.fillStyle = color // 填充颜色,默认是黑色
        this._ctx.fill()// 画实心圆
        this._ctx.closePath()
      }
      this._ctx.restore()
    }
  }
})

L.batchPoint = function (data, options) {
  return new L.BatchPoint(data, options)
}

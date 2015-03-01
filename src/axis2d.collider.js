Axis2D.Collider = function(axisWorld, x, y, width, height) {
  Axis2D.typeCheck(axisWorld, 'axisWorld', Axis2D.World);
  Axis2D.typeCheck(x, 'x', 'Number');
  Axis2D.typeCheck(y, 'y', 'Number');
  Axis2D.typeCheck(width, 'width', 'Number');
  Axis2D.typeCheck(height, 'height', 'Number');

  this._axisWorld = axisWorld;

  this._AABB = new intersect.AABB({},{});
  this._AABB.pos.x = x || 0;
  this._AABB.pos.y = y || 0;
  this._AABB.half.x = (Math.abs(width) || axisWorld._cellSize - 1) / 2;
  this._AABB.half.y = (Math.abs(height) || axisWorld._cellSize - 1) / 2;

  this._delta = new intersect.Point(0, 0);

  this._collisionType = 'slide';

  this._isTouching = {
    top: false,
    left: false,
    right: false,
    bottom: false
  };

  this._lastHitPosition = new intersect.Point(x, y);

  this._responseName = '';
  this._responseFilters = [];

  this._positionInGridKeys = [];
  this._hits = [];

  this.userData = undefined;
  this._collisionCallback = undefined;

  this._isDynamic = false;

  this._axisWorld._placeColliderInGrid(this);
  this._axisWorld._colliders.push(this);

  // find collisions on create
  this._setAsDynamic();
};

Axis2D.Collider.prototype = {
  moveTo: function(x, y) {
    var hW = this._AABB.half.x,
        hH = this._AABB.half.y,
        posX = this._AABB.pos.x,
        posY = this._AABB.pos.y;

    this._delta.x = x - posX;
    this._delta.y = y - posY;

    if(this._delta.x || this._delta.y) {
      // To find out the grid the collider has to sweep:
      // 1. move collider to the middle/center position
      // 2. make the collider take upp all the space it moved in
      // 3. place collider in the grid
      // 4. resize collider back and place it in the new coords

      this._AABB.pos.x = (posX + x) / 2;
      this._AABB.pos.y = (posY + y) / 2;

      this._AABB.half.x = Math.abs(this._delta.x) / 2 + hW;
      this._AABB.half.y = Math.abs(this._delta.y) / 2 + hH;

      this._axisWorld._placeColliderInGrid(this);

      this._AABB.pos.x = posX;
      this._AABB.pos.y = posY;
      this._AABB.half.x = hW;
      this._AABB.half.y = hH;

      this._setAsDynamic();
    }
  },
  resize: function(width, height) {
    this._AABB.half.x = width/2;
    this._AABB.half.y = height/2;

    if(!this._delta.x || !this._delta.y) {
      this._axisWorld._placeColliderInGrid(this);
    }

    this._setAsDynamic();
  },
  setResponseName: function(name) {
    Axis2D.typeCheck(name, 'name', 'String');
    this._responseName = name;
  },
  setResponseFilters: function(names) {
    Axis2D.typeCheck(names, 'names', 'Array');
    this._responseFilters = names;
  },
  setCollisionType: function(type) {
    Axis2D.typeCheck(type, 'type', 'String');
    this._collisionType = type;
  },
  getCollisionType: function() {
    return this._collisionType;
  },
  setCollisionCallback: function(callback) {
    Axis2D.typeCheck(callback, 'callback', 'Function');
    this._collisionCallback = callback;
  },
  getPosition: function() {
    return this._AABB.pos;
  },
  getWidth: function() {
    return this._AABB.half.x * 2;
  },
  getHeight: function() {
    return this._AABB.half.y * 2;
  },
  getHits: function() {
    return this._hits;
  },
  getTouches: function() {
    return this._isTouching;
  },
  getLastHitPosition: function() {
    return this._lastHitPosition;
  },
  _calculateTouches: function() {
    // TODO: do not calculate firstHits

    this._hits.forEach(function(hit){
      var oc = hit.collider,
          rf = this._responseFilters,
          notInFilter = rf.indexOf(oc._responseName) === -1,
          tct = this._collisionType,
          oct = oc._collisionType;

      if(tct !== 'sensor' && oct !== 'sensor' && notInFilter) {
        if(hit.normal.x > 0) {
          this._isTouching.left = true;
        }
        else if(hit.normal.x < 0) {
          this._isTouching.right = true;
        }
        if(hit.normal.y > 0) {
          this._isTouching.top = true;
        }
        else if(hit.normal.y < 0) {
          this._isTouching.bottom = true;
        }
      }
    }, this);
  },
  _setAsDynamic: function() {
    if(!this._isDynamic) {
      this._isDynamic = true;

      this._isTouching.top = false;
      this._isTouching.left = false;
      this._isTouching.right = false;
      this._isTouching.bottom = false;

      // remove this collider hit from other colliders
      this._hits.forEach(function(hit){
        var oc = hit.collider;

        oc._hits.forEach(function(oh, idx) {
          var sweep;
          if(oh.collider === this) {
            // check if next step hits same collider
            sweep = oc._AABB.sweepAABB(this._AABB, this._delta);
            if(!sweep.hit) {
              oc._isTouching.top = false;
              oc._isTouching.left = false;
              oc._isTouching.right = false;
              oc._isTouching.bottom = false;
              oc._hits.splice(idx, 1);
              oc._calculateTouches();
            }
            return;
          }
        }, this);
      }, this);

      this._hits = [];

      this._axisWorld._dynamicColliders.push(this);
    }
  },
  _addHit: function(hit) {
    for(var i = 0; i < this._hits.length; i++) {
      // prevent from adding another hit that contains same collider
      if(hit.collider === this._hits[i].collider) {
        return;
      }
    }
    this._hits.push(hit);
  }
};

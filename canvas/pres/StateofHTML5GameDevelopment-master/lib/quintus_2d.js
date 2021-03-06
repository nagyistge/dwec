/*global Quintus:false */

Quintus["2D"] = function(Q) {

  Q.component('viewport',{
    added: function() {
      this.entity.on('predraw',this,'predraw');
      this.entity.on('draw',this,'postdraw');
      this.x = 0;
      this.y = 0;
      this.offsetX = 0;
      this.offsetY = 0;
      this.centerX = Q.width/2;
      this.centerY = Q.height/2;
      this.scale = 1;
    },

    extend: {
      follow: function(sprite,directions) {
        this.off('step',this.viewport,'follow');
        this.viewport.directions = directions || { x: true, y: true };
        this.viewport.following = sprite;
        this.on('step',this.viewport,'follow');
        this.viewport.follow();
      },

      unfollow: function() {
        this.off('step',this.viewport,'follow');
      },

      centerOn: function(x,y) {
        this.viewport.centerOn(x,y);
      },

      moveTo: function(x,y) {
        return this.viewport.moveTo(x,y);
      }
    },

    follow: function() {
      this.centerOn(
                    this.directions.x ? 
                      this.following.p.x + this.following.p.w/2 - this.offsetX :
                      undefined,
                    this.directions.y ?
                     this.following.p.y + this.following.p.h/2 - this.offsetY :
                     undefined
                  );
    },

    offset: function(x,y) {
      this.offsetX = x;
      this.offsetY = y;
    },

    centerOn: function(x,y) {
      if(x !== void 0) {
        this.x = x - Q.width / 2 / this.scale;
      }
      if(y !== void 0) { 
        this.y = y - Q.height / 2 / this.scale;
      }

    },

    moveTo: function(x,y) {
      if(x !== void 0) {
        this.x = x;
      }
      if(y !== void 0) { 
        this.y = y;
      }
      return this.entity;

    },

    predraw: function() {
      this.centerX = this.x + Q.width / 2 /this.scale;
      this.centerY = this.y + Q.height / 2 /this.scale;
      Q.ctx.save();
      Q.ctx.translate(Math.floor(Q.width/2),Math.floor(Q.height/2));
      Q.ctx.scale(this.scale,this.scale);
      Q.ctx.translate(-Math.floor(this.centerX), -Math.floor(this.centerY));
    },

    postdraw: function() {
      Q.ctx.restore();
    }
  });


 Q.TileLayer = Q.Sprite.extend({

    init: function(props) {
      this._super(props,{
        tileW: 32,
        tileH: 32,
        blockTileW: 10,
        blockTileH: 10,
        type: 1
      });
      if(this.p.dataAsset) {
        this.load(this.p.dataAsset);
      }
      this.blocks = [];
      this.p.blockW = this.p.tileW * this.p.blockTileW;
      this.p.blockH = this.p.tileH * this.p.blockTileH;
      this.colBounds = {}; 
      this.directions = [ 'top','left','right','bottom'];

      this.collisionObject = { 
        p: {
          w: this.p.tileW,
          h: this.p.tileH,
          cx: this.p.tileW/2,
          cy: this.p.tileH/2
        }
      };

      this.collisionNormal = { separate: []};
    },

    load: function(dataAsset) {
      var data = Q._isString(dataAsset) ?  Q.asset(dataAsset) : dataAsset;
      this.p.tiles = data;
      this.p.rows = data.length;
      this.p.cols = data[0].length;
      this.p.w = this.p.rows * this.p.tileH;
      this.p.h = this.p.cols * this.p.tileW;
    },

    getTile: function(tileX,tileY) {
      return this.p.tiles[tileY] && this.p.tiles[tileY][tileX];
    },

    setTile: function(x,y,tile) {
      var p = this.p,
          blockX = Math.floor(x/p.blockTileW),
          blockY = Math.floor(y/p.blockTileH);

      if(blockX >= 0 && blockY >= 0 &&
         blockX < this.p.cols &&
         blockY <  this.p.cols) {
        this.p.tiles[y][x] = tile;
        if(this.blocks[blockY]) {
          this.blocks[blockY][blockX] = null;
        }
      }
    },

    tilePresent: function(tileX,tileY) {
      return this.p.tiles[tileY] && this.p.tiles[tileY][tileX] > 0;
    },

    collide: function(obj) {
      var p = this.p,
          tileStartX = Math.floor((obj.p.x - p.x) / p.tileW),
          tileStartY = Math.floor((obj.p.y - p.y) / p.tileH),
          tileEndX =  Math.floor((obj.p.x + obj.p.w - p.x) / p.tileW),
          tileEndY =  Math.floor((obj.p.y + obj.p.h - p.y) / p.tileH),
          colObj = this.collisionObject,
          normal = this.collisionNormal,
          col;
  
      normal.collided = false;

      for(var tileY = tileStartY; tileY<=tileEndY; tileY++) {
        for(var tileX = tileStartX; tileX<=tileEndX; tileX++) {
          if(this.tilePresent(tileX,tileY)) {
            colObj.p.x = tileX * p.tileW + p.x;
            colObj.p.y = tileY * p.tileH + p.y;
            
            col = Q.collision(obj,colObj);
            if(col && col.magnitude > 0 && 
               (!normal.collided || normal.magnitude < col.magnitude )) {
                 normal.collided = true;
                 normal.separate[0] = col.separate[0];
                 normal.separate[1] = col.separate[1];
                 normal.magnitude = col.magnitude;
                 normal.distance = col.distance;
                 normal.normalX = col.normalX;
                 normal.normalY = col.normalY;
                 normal.tileX = tileX;
                 normal.tileY = tileY;
                 normal.tile = this.getTile(tileX,tileY);
            }
          }
        }
      }

      return normal.collided ? normal : false;
    },

    prerenderBlock: function(blockX,blockY) {
      var p = this.p,
          tiles = p.tiles,
          sheet = this.sheet(),
          blockOffsetX = blockX*p.blockTileW,
          blockOffsetY = blockY*p.blockTileH;

      if(blockOffsetX < 0 || blockOffsetX >= this.p.cols ||
         blockOffsetY < 0 || blockOffsetY >= this.p.rows) {
           return;
      }

      var canvas = document.createElement('canvas'),
          ctx = canvas.getContext('2d');

      canvas.width = p.blockW;
      canvas.height= p.blockH;
      this.blocks[blockY] = this.blocks[blockY] || {};
      this.blocks[blockY][blockX] = canvas;

      for(var y=0;y<p.blockTileH;y++) {
        if(tiles[y+blockOffsetY]) {
          for(var x=0;x<p.blockTileW;x++) {
            if(tiles[y+blockOffsetY][x+blockOffsetX]) {
              sheet.draw(ctx,
                         x*p.tileW,
                         y*p.tileH,
                         tiles[y+blockOffsetY][x+blockOffsetX]);
            }
          }
        }
      }
    },

    drawBlock: function(ctx, blockX, blockY) {
      var p = this.p,
          startX = Math.floor(blockX * p.blockW + p.x),
          startY = Math.floor(blockY * p.blockH + p.y);

      if(!this.blocks[blockY] || !this.blocks[blockY][blockX]) {
        this.prerenderBlock(blockX,blockY);
      }

      if(this.blocks[blockY]  && this.blocks[blockY][blockX]) {
        ctx.drawImage(this.blocks[blockY][blockX],startX,startY);
      }
    },

    draw: function(ctx) {
      var p = this.p,
          viewport = this.parent.viewport,
          scale = viewport ? viewport.scale : 1,
          x = viewport ? viewport.x : 0,
          y = viewport ? viewport.y : 0,
          viewW = Q.width / scale,
          viewH = Q.height / scale,
          startBlockX = Math.floor((x - p.x) / p.blockW),
          startBlockY = Math.floor((y - p.y) / p.blockH),
          endBlockX = Math.floor((x + viewW - p.x) / p.blockW),
          endBlockY = Math.floor((y + viewH - p.y) / p.blockH);

      for(var y=startBlockY;y<=endBlockY;y++) {
        for(var x=startBlockX;x<=endBlockX;x++) {
          this.drawBlock(ctx,x,y);
        }
      }
    }
  });

  Q.gravityY = 9.8*100;
  Q.gravityX = 0;
  Q.dx = 0.05;

  Q.component('2d',{
    added: function() {
      var entity = this.entity;
      Q._defaults(entity.p,{
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        gravity: 1,
        collisionMask: Q.SPRITE_DEFAULT
      });
      entity.on('step',this,"step");
      entity.on('hit',this,'collision');
    },

    collision: function(col) {
      var entity = this.entity,
          p = entity.p,
          magnitude = 0;

      // Top collision
      if(col.normalY < -0.3 && p.vy > 0) { 
        col.impact = p.vy;
        p.vy = 0; 
        entity.trigger("bump.bottom",col);
      }
      if(col.normalY > 0.3 && p.vy < 0) {
        col.impact = Math.abs(p.vy);
        p.vy = 0; 
        entity.trigger("bump.top",col);
      }

      if(col.normalX < -0.3 && p.vx > 0) { 
        col.impact = p.vx;
        p.vx = 0; 
        entity.trigger("bump.right",col);
      }
      if(col.normalX > 0.3 && p.vx < 0) { 
        col.impact = Math.abs(p.vx);
        p.vx = 0; 
        entity.trigger("bump.left",col);
      }

      p.x -= col.separate[0];
      p.y -= col.separate[1];

    },

    step: function(dt) {
      var p = this.entity.p,
          dtStep = dt;
      // TODO: check the entity's magnitude of vx and vy,
      // reduce the max dtStep if necessary to prevent 
      // skipping through objects.
      while(dtStep > 0) {
        dt = Math.min(1/30,dtStep);
        // Updated based on the velocity and acceleration
        p.vx += p.ax * dt + Q.gravityX * dt * p.gravity;
        p.vy += p.ay * dt + Q.gravityY * dt * p.gravity;

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        this.entity.parent.collide(this.entity);
        dtStep -= 1/30;
      }
    }
  });

  Q.component('aiBounce', {
    added: function() {
      this.entity.on("bump.right",this,"goLeft");
      this.entity.on("bump.left",this,"goRight");
    },

    goLeft: function(col) {
      this.entity.p.vx = -col.impact;
    },

    goRight: function(col) {
      this.entity.p.vx = col.impact;
    }
  });

};


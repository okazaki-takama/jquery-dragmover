;(function($){

  var config = {
    scroll_speed: 14,
    drag_item: "li"
  };

  var exec_fn = function(fn, arg){
    if(typeof fn=="function") fn(arg);
  };

  var get_frame_data = function(){
    var $window = $(window);

    return {
      top: $window.scrollTop(),
      right: $window.scrollLeft() + $window.width(),
      bottom: $window.scrollTop() + window.innerHeight,
      left: $window.scrollLeft(),
      width: $window.width(),
      height: window.innerHeight,
      scrollX: function(val){ return $window.scrollLeft(val); },
      scrollY: function(val){ return $window.scrollTop(val); }
    };
  };

  $.dragmover = function(field, conf){ return new DragMover(field, conf); };

  var DragMover = function(field, conf){
    if(typeof conf==="object") $.extend(config, conf);

    this.is_touch = navigator.userAgent.match(/i(phone|pod|pad)|android/i);
    this.dragged = false;
    this.touch_time_id = null;
    this.scroll_time_id = null;
    this.clone_item = null;
    this.current = {
      id: 0,
      x: 0,
      y: 0,
      position: {
        top: 0,
        left: 0,
        center: {
          x: 0,
          y: 0
        }
      }
    };

    this.document_size = {
      width: $(document).width(),
      height: $(document).height()
    };
    this.item_pos = [];

    this.drag_field = field;
    this.scroll_speed = config.scroll_speed;
    this.drag_item = config.drag_item;

    this._init();

    return this;
  };
  DragMover.prototype = {
    _init: function(){
      var _this = this;
      var $item = _this.drag_field.find(_this.drag_item);

      _this.drag_field.css({position: "relative", overflow: "visible"});
      _this.drag_field.append('<div style="height:0;font-size:0;visibility:hidden;clear:both;"></div>');

      $item.addClass("mover-item")
        .addClass("orig-mover")
        .addClass("static-mover");

      _this._set_item_position_data();

      _this.addDragListener();

      $(window).on("resize", function(){
        _this._set_item_position_data();
        _this.document_size.width = $(document).width();
        _this.document_size.height = $(document).height();
      });
    },

    _set_center_coord: function($item){
      var _this = this;

      _this.current.position.center.x = _this.current.position.left + ($item.outerWidth() / 2);
      _this.current.position.center.y = _this.current.position.top + ($item.outerHeight() / 2);
    },

    _set_current_data: function(i, e){
      var _this = this;

      _this.current.x = _this.is_touch ? e.changedTouches[0].clientX : e.clientX;
      _this.current.y = _this.is_touch ? e.changedTouches[0].clientY : e.clientY;

      $.extend(_this.current.position, _this.item_pos[i]);
    },

    _set_item: function($item, arg){
      var _this = this;

      $item.css({
        top: _this.current.position.top,
        left: _this.current.position.left
      });

      if(arg && typeof arg == "object"){
        $.each(arg, function(method, arg){
          $item[method] && typeof $item[method]=="function" && $item[method](arg);
        });
      }
    },

    _set_item_position_data: function(){
      var _this = this;

      _this.item_pos = [];

      _this.drag_field.find(".static-mover").each(function(i){
        _this.item_pos.push({
          top: $(this).position().top,
          right: $(this).position().left + $(this).outerWidth(),
          bottom: $(this).position().top + $(this).outerHeight(),
          left: $(this).position().left
        });

        _this.item_pos[i].center = {
          x: _this.item_pos[i].left + ($(this).outerWidth() / 2),
          y: _this.item_pos[i].top + ($(this).outerHeight() / 2)
        };
      });
    },

    _set_active_item: function($item, e){
      var _this = this;

      _this._set_current_data($item.index(), e);
      _this._set_center_coord($item);

      _this.clone_item = $item.clone()
        .removeClass("orig-mover")
        .addClass("clone-mover")
        .css({width: $item.outerWidth(), height: $item.outerHeight()});

      _this._set_item($item, {
        addClass: "active-mover",
        removeClass: "static-mover",
        after: _this.clone_item.html("")
      });
    },

    _replace_position: function(){
      var _this = this;

      if(!_this.dragged) return;
      var current = _this.current.position;

      $.each(_this.item_pos, function(i, pos){
        if(current.center.y>pos.top && current.center.y<pos.bottom){
          if(current.center.x>pos.left && current.center.x<pos.right){
            if(current.center.x>pos.center.x){
              _this.clone_item.insertAfter(_this.drag_field.find(".orig-mover").eq(i));
              _this._set_item_position_data();

            }else if(current.center.x<pos.center.x){
              _this.clone_item.insertBefore(_this.drag_field.find(".orig-mover").eq(i));
              _this._set_item_position_data();
            }
          }
        }
      });
    },

    _to_terminus: function($item){
      var _this = this;

      _this.clone_item.replaceWith($item);
      $item.removeClass("active-mover").addClass("static-mover")
        .css({top: "auto", left: "auto"});
    },

    _pc_scroll: function(frame, x, y){
      var _this = this;

      if(y+frame.top<frame.top && frame.top>0){
        frame.scrollY(frame.top - _this.scroll_speed);
        _this.current.position.top -= _this.scroll_speed;

      }else if(y+frame.top>frame.bottom && frame.bottom<_this.document_size.height){
        frame.scrollY(frame.top + _this.scroll_speed);
        _this.current.position.top += _this.scroll_speed;

      }else if(x+frame.left<frame.left && frame.left>0){
        frame.scrollX(frame.left - _this.scroll_speed);
        _this.current.position.left -= _this.scroll_speed;

      }else if(x+frame.left>frame.right && frame.right<_this.document_size.width){
        frame.scrollX(frame.left + _this.scroll_speed);
        _this.current.position.left += _this.scroll_speed;
      }
    },

    _touch_scroll: function(frame, x, y){
      var _this = this;
      var space = 100;
      var after_pos = 0;

      if(Math.abs(_this.current.x-x)>5 || Math.abs(_this.current.y-y)>5) return;

      if(y+frame.top-space<frame.top && frame.top>0){
        clearTimeout(_this.scroll_time_id);
        _this.scroll_time_id = setTimeout(function(){
          after_pos = Math.min(frame.top, (frame.height + space));

          $("html, body").animate({scrollTop: frame.top - after_pos}, 100);
          _this.current.position.top -= after_pos;

          _this.scroll_time_id = null;
        }, 600);

      }else if(y+frame.top+space>frame.bottom && frame.bottom<_this.document_size.height){
        clearTimeout(_this.scroll_time_id);
        _this.scroll_time_id = setTimeout(function(){

          after_pos = Math.min((_this.document_size.height - frame.bottom), (frame.height - space));

          $("html, body").animate({scrollTop: frame.top + after_pos}, 100);
          _this.current.position.top += after_pos;

          _this.scroll_time_id = null;
        }, 600);

      }else if(x+frame.left-space<frame.left && frame.left>0){
        clearTimeout(_this.scroll_time_id);
        _this.scroll_time_id = setTimeout(function(){
          after_pos = Math.min(frame.left, (frame.width + space));

          $("html, body").animate({scrollLeft: frame.left - after_pos}, 100);
          _this.current.position.left -= after_pos;

          _this.scroll_time_id = null;
        }, 600);

      }else if(x+frame.left+space>frame.right && frame.right<_this.document_size.width){
        clearTimeout(_this.scroll_time_id);
        _this.scroll_time_id = setTimeout(function(){
          after_pos = Math.min((_this.document_size.width - frame.right), (frame.width - space));

          $("html, body").animate({scrollLeft: frame.left + after_pos}, 100);
          _this.current.position.left += after_pos;

          _this.scroll_time_id = null;
        }, 600);

      }else{
        clearTimeout(_this.scroll_time_id);
        _this.scroll_time_id = null;
      }
    },

    _drag_scroll: function(x, y){
      var _this = this;
      var frame = get_frame_data();

      if(!_this.is_touch)
        _this._pc_scroll(frame, x, y);

      else
        _this._touch_scroll(frame, x, y);
    },

    dragstart: function(){
      var _this = this;

      return function(e){
        if(_this.dragged) return;

        var $item = $(this);
        var evt = _this.is_touch ? event : e;

        if(!_this.is_touch){
          _this.dragged = true;
          e.preventDefault();
          _this._set_active_item($item, evt);

        }else{
          if(evt.type!=="touchstart") return;

          _this.current.x = evt.changedTouches[0].clientX;
          _this.current.y = evt.changedTouches[0].clientY;

          _this.touch_time_id = setTimeout(function(){
            _this.dragged = true;
            _this._set_active_item($item, evt);
            _this.touch_time_id = null;
          }, 500);
        }
      };
    },

    dragmove: function(e){
      var _this = this;

      return function(e){
        var $item = _this.drag_field.find(".active-mover");

        if(_this.is_touch && event.type==="mousemove") return;

        var x = _this.is_touch ? event.changedTouches[0].clientX : e.clientX;
        var y = _this.is_touch ? event.changedTouches[0].clientY : e.clientY;

        var diff_x = _this.current.x - x;
        var diff_y = _this.current.y - y;

        if(_this.is_touch && (Math.abs(diff_x)>5||Math.abs(diff_y)>5)){
          clearTimeout(_this.touch_time_id);
        }
        if(!_this.dragged || !$item.length) return;

        e.preventDefault();

        _this.current.position.top -= diff_y;
        _this.current.position.left -= diff_x;

        _this._drag_scroll(x, y);
        _this._set_item($item);
        _this._set_center_coord($item);
        _this._replace_position();

        _this.current.x = x;
        _this.current.y = y;
      };
    },

    dragend: function(){
      var _this = this;

      return function(e){
        var $item = _this.drag_field.find(".active-mover");

        if(_this.is_touch) clearTimeout(_this.touch_time_id);
        if(!_this.dragged || !$item.length) return;

        _this._replace_position();
        _this._to_terminus($item);

        _this.clone_item = null;
        _this.dragged = false;
      };
    },

    addDragListener: function(){
      var _this = this;

      $(document).on("mousedown touchstart", ".mover-item", _this.dragstart())
        .on("mousemove touchmove", _this.dragmove())
        .on("mouseup touchend", _this.dragend());
    }
  };
})(jQuery);

/**
 * ercircle 圆形比例组件
 * 使用示例：
 * $('#test').ercircle({value:10,total:100,size:100,formater:function(options,percent){return percent + '%'}})
 * 外面再加容器er-flexcenterbox多环居中自适应 只兼容IE10及以上
 * */

(function(win, $, doc) {
	var tools = {
		isIE: function() {
			return(window.ActiveXObject || "ActiveXObject" in window) != false
		}(),
		colorRgb: function(str, opacity) {
			var sColor = str.toLowerCase();
			if(sColor) {
				if(sColor.length === 4) {
					var sColorNew = "#";
					for(var i = 1; i < 4; i += 1) {
						sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
					}
					sColor = sColorNew;
				}
				//处理六位的颜色值
				var sColorChange = [];
				for(var i = 1; i < 7; i += 2) {
					sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
				}
				return "rgba(" + sColorChange.join(",") + "," + opacity + ")";
			} else {
				return sColor;
			}
		},
		getRadius: function(options) {
			return 50 - options.strokeWidth / 2;
		},
		getPathString: function(options) {
			var radius = tools.getRadius(options);
			return 'M 50,50 m 0,-' + radius +
				' a ' + radius + ',' + radius + ' 0 1 1 0,' + (2 * radius) +
				' a ' + radius + ',' + radius + ' 0 1 1 0,-' + (2 * radius);
		},
		getLen: function(options) {
			var radius = tools.getRadius(options);
			return Math.PI * 2 * radius;
		},
		getPathStyle: function(options, percent) {
			var len = tools.getLen(options);
			return 'stroke-dasharray: ' + len + 'px ' + len + 'px;' +
				'stroke-dashoffset: ' + ((100 - percent) / 100 * len) + 'px;' +
				'transition: stroke-dashoffset 0.6s ease 0s, stroke 0.6s ease';
			return {
				'stroke-dasharray': '' + len + 'px ' + len + 'px',
				'stroke-dashoffset': '' + ((100 - percent) / 100 * len) + 'px',
				'transition': 'stroke-dashoffset 0.6s ease 0s, stroke 0.6s ease'
			};
		},
	}

	function _resizeSvg() {
		var svgs = $('.er-circle-container svg');
		$.each(svgs, function(i, item) {
			var w = $(this).parent('.er-circle-container').width();
			$(this).css({
				width: w,
				height: w
			});
		})
		$('.er-circle-container').parent('.er-flexcenterbox').css('overflow', 'hidden');
	}

	function _create(jq) {
		var _this = $(jq),
			options = $.data(jq, "ercircle").options;
		_this.addClass('er-circle-container');
		_this.empty();
		_this.circle = $('<svg viewBox="0 0 100 100"></svg>').appendTo(_this);
		//IE不支持flex时阴影，高度无法自动与宽相同
		if(!options.boxShadow) {
			var rgbColor = tools.colorRgb(options.strokeColor, .2);
			_this.circle.css({
				'border-radius': '50%',
				'box-shadow': '5px 10px 25px ' + rgbColor
			});
		};
		var pathString = tools.getPathString(options),
			trailColor = options.trailColor,
			trailWidth = options.trailWidth,
			strokeColor = options.strokeColor;
		var path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path1.setAttribute('d', pathString);
		path1.setAttribute('stroke', trailColor);
		path1.setAttribute('stroke-width', trailWidth);
		path1.setAttribute('fill-opacity', '0');
		_this.circle.append(path1);
		var path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path2.setAttribute('d', pathString);
		path2.setAttribute('stroke', options.strokeColor);
		path2.setAttribute('stroke-width', trailWidth);
		path2.setAttribute('fill-opacity', '0');
		path2.setAttribute('stroke-linecap', options.strokeLinecap);
		path2.setAttribute('style', tools.getPathStyle(options, 0));
		_this.circle.append(path2);
		$('<div class="er-circle-inner"></div>').appendTo(_this);
	}

	function _renderCircle(jq) {
		var _this = $(jq),
			options = $.data(jq, "ercircle").options,
			pct = options.total == 0 ? 0 : options.value * 100 / options.total,
			color = options.color;
		if(_this.loading) return;
		_this.loading = true;
		var percent = pct > 100 ? 100 : pct;
		var path2 = $('svg path:eq(1)', _this)[0];
		path2.setAttribute('style', tools.getPathStyle(options, percent));
		var pct_txt = percent;
		if(options.formatter)
			pct_txt = options.formatter.call(jq, options, percent);
		$('.er-circle-inner', _this).html(pct_txt);
		_this.loading = false;
	}

	function _loadData(jq) {
		var _this = $(jq),
			options = $.data(jq, "ercircle").options;
		_this.css({
			width: options.size,
		});
		_renderCircle(jq);
		if(tools.isIE) {
			_resizeSvg();
			$(window).on('resize', _resizeSvg);
		}
	}
	$.fn.ercircle = function(options) {
		if(Object.prototype.toString.call(options) !== '[object Object]')
			return false;
		options = options || {};
		return this.each(function() {
			var data = $.data(this, "ercircle");
			if(data) {
				$.extend(data.options, options);
				_create(this, 'ercircle');
			} else {
				data = $.data(this, "ercircle", {
					options: $.extend({},
						$.fn.ercircle.defaults, options)
				});
				_create(this, 'ercircle');
			}
			_loadData(this, data.options);
		});
	}
	$.fn.ercircle.defaults = {
		value: 0, //值，必填
		total: 100, //总值，默认按百分比100
		size: 200, //圆直径，默认200px
		strokeColor: '#2db7f5', //百分比所在路径边框颜色
		strokeLinecap: 'round', //百分比所在路径两端形状
		trailWidth: 5, //默认圆环边框宽度
		trailColor: '#eaeef2', //默认圆环边框底色
		strokeWidth: 5, //内部边距,正常应与trailWidth相同，带阴影的时候不要改它
		formatter: function(options, percent) { //格式化中间的显示文字，percent为实时计算后的百分比，默认两位小数
			return percent.toFixed(2) + '%';
		}
	}
}(window, jQuery, document));
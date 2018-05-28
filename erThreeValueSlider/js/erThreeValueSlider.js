/**
 * ErThreeValueSlider 三段滑块拖动组件
 * 使用示例：
 * var slider = new ErThreeValueSlider({
 *		container: '#er-three-slider',
 *		value1: 30,
 *		value2: 50,
 *		value3: 20,
 *		totalValue: 100
 *	}); //初始0-30,30-80，80-100，格式为三段分别对应的值，三段加起来必须等于totalValue
 * 取值slider.getValues();返回格式为三段分别对应的值{value1: 23, value2: 30, value3: 47, totalValue: 100}
 * 外面再加容器er-flexcenterbox等居中自适应，或者给滑块所在容器直接定义固定宽度 只兼容IE10及以上
 * */
(function(window, $, doc) {
	'use strict';

	var _class, _temp, _class2, _temp2;

	var _createClass = function() {
		function defineProperties(target, props) {
			for(var i = 0; i < props.length; i++) {
				var descriptor = props[i];
				descriptor.enumerable = descriptor.enumerable || false;
				descriptor.configurable = true;
				if("value" in descriptor) descriptor.writable = true;
				Object.defineProperty(target, descriptor.key, descriptor);
			}
		}
		return function(Constructor, protoProps, staticProps) {
			if(protoProps) defineProperties(Constructor.prototype, protoProps);
			if(staticProps) defineProperties(Constructor, staticProps);
			return Constructor;
		};
	}();

	function _possibleConstructorReturn(self, call) {
		if(!self) {
			throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
		}
		return call && (typeof call === "object" || typeof call === "function") ? call : self;
	}

	function _inherits(subClass, superClass) {
		if(typeof superClass !== "function" && superClass !== null) {
			throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
		}
		subClass.prototype = Object.create(superClass && superClass.prototype, {
			constructor: {
				value: subClass,
				enumerable: false,
				writable: true,
				configurable: true
			}
		});
		if(superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
	}

	function _classCallCheck(instance, Constructor) {
		if(!(instance instanceof Constructor)) {
			throw new TypeError("Cannot call a class as a function");
		}
	}

	var SliderWidget = (_temp = _class = function() {
		function SliderWidget(elem, widgetType) {
			_classCallCheck(this, SliderWidget);

			this.elem = elem;
			this.widgetType = widgetType;
			this.totalWidth;
			this.elemWidth;
		}

		_createClass(SliderWidget, [{
			key: 'setElemWidth',
			value: function setElemWidth(width) {
				var elem = this.elem;

				this.elemWidth = width;
				elem.style.width = width + 'px';
			}
		}, {
			key: 'getElemWidth',
			value: function getElemWidth() {
				return this.elemWidth;
			}
		}, {
			key: 'getElemWidthFromCss',
			value: function getElemWidthFromCss() {
				return parseFloat(this.elem.offsetWidth);
			}
		}]);

		return SliderWidget;
	}(), _class.WIDGET_TYPE = {
		HANDLE: 1,
		BAR: 2
	}, _temp);
	var SliderHandle = (_temp2 = _class2 = function(_SliderWidget) {
		_inherits(SliderHandle, _SliderWidget);

		function SliderHandle(elem, handleType) {
			_classCallCheck(this, SliderHandle);

			var _this = _possibleConstructorReturn(this, (SliderHandle.__proto__ || Object.getPrototypeOf(SliderHandle)).call(this, elem, SliderWidget.WIDGET_TYPE.HANDLE));

			_this.elemWidth = _this.getElemWidthFromCss();
			_this.handleType = handleType;
			_this.curPos;

			_this.bindEvents();
			return _this;
		}

		_createClass(SliderHandle, [{
			key: 'setPosition',
			value: function setPosition(x) {
				var elem = this.elem,
					handleType = this.handleType;

				this.curPos = x;
				if(handleType === SliderHandle.HANDLE_TYPE.RIGHT) {
					elem.style.transform = 'translate3d(-' + x + 'px, 0, 0)';
				} else {
					elem.style.transform = 'translate3d(' + x + 'px, 0, 0)';
				}
			}
		}, {
			key: 'getPosition',
			value: function getPosition() {
				return this.curPos;
			}
		}, {
			key: 'bindEvents',
			value: function bindEvents() {
				var _this2 = this;

				var elem = this.elem,
					bindEventHelper = this.bindEventHelper;

				var eventHelper = function eventHelper(e) {
					e.preventDefault();
					// We want the object with screenX property
					if(e.touches) {
						// Handle touch events
						return e.touches[e.touches.length - 1];
					}
					return e;
				};

				elem.addEventListener('touchstart', function(e) {
					return _this2.onPointerDown(eventHelper(e));
				});
				elem.addEventListener('mousedown', function(e) {
					return _this2.onPointerDown(eventHelper(e));
				});

				window.addEventListener('touchmove', function(e) {
					return _this2.onPointerMove(eventHelper(e));
				});
				window.addEventListener('mousemove', function(e) {
					return _this2.onPointerMove(eventHelper(e));
				});

				window.addEventListener('touchend', function(e) {
					return _this2.onPointerUp(eventHelper(e));
				});
				window.addEventListener('mouseup', function(e) {
					return _this2.onPointerUp(eventHelper(e));
				});
			}
		}, {
			key: 'onPointerDown',
			value: function onPointerDown(e) {
				//console.log('wrong poitner down');
			}
		}, {
			key: 'onPointerMove',
			value: function onPointerMove(e) {
				//console.log('wrong poitner move');
			}
		}, {
			key: 'onPointerUp',
			value: function onPointerUp(e) {
				//console.log('wrong poitner up');
			}
		}]);

		return SliderHandle;
	}(SliderWidget), _class2.HANDLE_TYPE = {
		RIGHT: 1,
		LEFT: 2
	}, _temp2);

	var SliderBar = function(_SliderWidget2) {
		_inherits(SliderBar, _SliderWidget2);

		function SliderBar(elem) {
			_classCallCheck(this, SliderBar);

			return _possibleConstructorReturn(this, (SliderBar.__proto__ || Object.getPrototypeOf(SliderBar)).call(this, elem, SliderWidget.WIDGET_TYPE.BAR));
		}

		return SliderBar;
	}(SliderWidget);

	var ErThreeValueSlider = function() {
		function ErThreeValueSlider(options) {
			_classCallCheck(this, ErThreeValueSlider);
			if(!options.container) return false;
			options = typeof options == 'object' ? options : {
				container: '#er-three-slider',
				value1: 30,
				value2: 50,
				value3: 20,
				totalValue: 100
			};
			var $this = $(options.container);
			if(!$this.length) return false;

			$this.addClass('er-three-slider');

			var val1 = options.value1,
				val2 = options.value2,
				val3 = options.value3,
				totalVal = options.totalValue;

			this.sliderElem = $this[0];

			$this.empty().addClass("er-three-slider");

			var startHandleElem = $('<span class="er-three-slider-handle er-handle-start"><i>0</i></span>').appendTo($this)[0];
			this.startHandle = new SliderHandle(startHandleElem, SliderHandle.HANDLE_TYPE.START);
			var endHandleElem = $('<span class="er-three-slider-handle er-handle-end"><i>' + totalVal + '</i></span>').appendTo($this)[0];
			this.enHandle = new SliderHandle(endHandleElem, SliderHandle.HANDLE_TYPE.END);

			var leftHandleElem = $('<span class="er-three-slider-handle er-handle-left"><i>20</i></span>').appendTo($this)[0];
			this.leftHandle = new SliderHandle(leftHandleElem, SliderHandle.HANDLE_TYPE.LEFT);
			var rightHandleElem = $('<span class="er-three-slider-handle er-handle-right"><i>50</i></span>').appendTo($this)[0];
			this.rightHandle = new SliderHandle(rightHandleElem, SliderHandle.HANDLE_TYPE.RIGHT);

			var leftBarElem = $('<span class="er-three-slider-bar er-bar-left"><i>拒绝</i></span>').appendTo($this)[0];
			this.leftBar = new SliderBar(leftBarElem);
			var middleBarElem = $('<span class="er-three-slider-bar er-bar-middle"><i>人工审核</i></span>').appendTo($this)[0];
			this.middleBar = new SliderBar(middleBarElem);
			var rightBarElem = $('<span class="er-three-slider-bar er-bar-right"><i>通过</i></span>').appendTo($this)[0];
			this.rightBar = new SliderBar(rightBarElem);

			this.value1 = val1;
			this.value2 = val2;
			this.value3 = val3;
			this.totalValue = totalVal;
			this.totalWidth = this.getTotalWidth();

			this.leftBar.setElemWidth(this.getWidthByValue(this.value1));
			this.middleBar.setElemWidth(this.getWidthByValue(this.value2));
			this.rightBar.setElemWidth(this.getWidthByValue(this.value3));

			// Placing handles at the right position
			this.leftHandle.setPosition(this.leftBar.getElemWidth());
			this.rightHandle.setPosition(this.rightBar.getElemWidth());

			this.bindEvents();
			this.trackLeftHandle();
			this.trackRightHandle();

			this.updateValues(val1, val2, val3);
		}

		_createClass(ErThreeValueSlider, [{
			key: 'trackRightHandle',
			value: function trackRightHandle() {
				var _this4 = this;

				var rightHandle = this.rightHandle,
					leftBar = this.leftBar,
					rightBar = this.rightBar,
					middleBar = this.middleBar;

				var tracker = {
					pointerDown: false,
					startX: 0,
					rightBarStartWidth: 0,
					middleBarStartWidth: 0,
					handleStartPos: 0
				};

				var updateValues = function updateValues() {
					var totalValue = _this4.totalValue,
						value1 = _this4.value1;
					// Value calculated based on rightBar delta

					var newValue3 = _this4.getValueByWidth(rightBar.getElemWidth());
					var newValue2 = totalValue - newValue3 - value1;

					_this4.value3 = newValue3;
					_this4.value2 = newValue2;

					$('i', rightHandle.elem).text(_this4.value1 + _this4.value2);
				};

				rightHandle.onPointerDown = function(e) {
					//console.log('rightHanlde on pointer down', e);
					tracker.startX = e.screenX;
					tracker.rightBarStartWidth = rightBar.getElemWidth();
					tracker.middleBarStartWidth = middleBar.getElemWidth();
					tracker.handleStartPos = rightHandle.getPosition();
					tracker.pointerDown = true;
				};

				rightHandle.onPointerMove = function(e) {
					if(!tracker.pointerDown) return;

					var currentX = e.screenX;
					var delta = tracker.startX - currentX;

					var middleBarWidth = tracker.middleBarStartWidth - delta;
					var rightBarWidth = tracker.rightBarStartWidth + delta;
					if(middleBarWidth < 0) {
						// right handle is next to the left handle
						if(middleBar.getElemWidth() > 0) {
							rightHandle.setPosition(_this4.totalWidth - leftBar.getElemWidth());
							middleBar.setElemWidth(0);
							rightBar.setElemWidth(_this4.totalWidth - leftBar.getElemWidth());

							updateValues();
						}
					} else if(rightBarWidth < 0) {
						// Right handle is at the very right
						if(rightHandle.getPosition() > 0) {
							rightHandle.setPosition(0);
							rightBar.setElemWidth(0);
							middleBar.setElemWidth(_this4.totalWidth - leftBar.getElemWidth());

							updateValues();
						}
					} else {
						rightHandle.setPosition(tracker.handleStartPos + delta);
						rightBar.setElemWidth(tracker.rightBarStartWidth + delta);
						middleBar.setElemWidth(tracker.middleBarStartWidth - delta);

						updateValues();
					}
					//console.log('values: ', leftBar.value, middleBar.value, rightBar.value);
				};

				rightHandle.onPointerUp = function(e) {
					//console.log('rightHanlde on pointer up', e);
					tracker.pointerDown = false;
				};
			}
		}, {
			key: 'trackLeftHandle',
			value: function trackLeftHandle() {
				var _this5 = this;

				var leftHandle = this.leftHandle,
					leftBar = this.leftBar,
					middleBar = this.middleBar,
					rightBar = this.rightBar;

				var tracker = {
					pointerDown: false,
					startX: 0,
					leftBarStartWidth: 0,
					middleBarStartWidth: 0,
					handleStartPos: 0
				};

				var updateValues = function updateValues() {
					var totalValue = _this5.totalValue,
						value3 = _this5.value3;
					// Value calculated based on leftBar delta

					var newValue1 = _this5.getValueByWidth(leftBar.getElemWidth());
					var newValue2 = totalValue - newValue1 - value3;

					_this5.value1 = newValue1;
					_this5.value2 = newValue2;

					$('i', leftHandle.elem).text(_this5.value1);
				};

				leftHandle.onPointerDown = function(e) {
					//console.log('leftHandle on pointer down', e);
					tracker.startX = e.screenX;
					tracker.leftBarStartWidth = leftBar.getElemWidth();
					tracker.middleBarStartWidth = middleBar.getElemWidth();
					tracker.handleStartPos = leftHandle.getPosition();
					tracker.pointerDown = true;
					//console.log('tracker ', tracker);
				};

				leftHandle.onPointerMove = function(e) {
					if(!tracker.pointerDown) return;

					var currentX = e.screenX;
					var delta = currentX - tracker.startX;

					var middleBarWidth = tracker.middleBarStartWidth - delta;
					var leftBarWidth = tracker.leftBarStartWidth + delta;
					if(middleBarWidth < 0) {
						// Left handle is next to the right handle
						if(middleBar.getElemWidth() > 0) {
							leftHandle.setPosition(_this5.totalWidth - rightBar.getElemWidth());
							middleBar.setElemWidth(0);
							leftBar.setElemWidth(_this5.totalWidth - rightBar.getElemWidth());

							updateValues();
						}
					} else if(leftBarWidth < 0) {
						// Left handle is at the very left
						if(leftHandle.getPosition() > 0) {
							leftHandle.setPosition(0);
							leftBar.setElemWidth(0);
							middleBar.setElemWidth(_this5.totalWidth - rightBar.getElemWidth());

							updateValues();
						}
					} else {
						leftHandle.setPosition(tracker.handleStartPos + delta);
						leftBar.setElemWidth(tracker.leftBarStartWidth + delta);
						middleBar.setElemWidth(tracker.middleBarStartWidth - delta);

						updateValues();
					}

					//console.log('values: ', leftBar.value, middleBar.value, rightBar.value);
				};

				leftHandle.onPointerUp = function(e) {
					//console.log('leftHandle on pointer up', e);
					tracker.pointerDown = false;
				};
			}
		}, {
			key: 'bindEvents',
			value: function bindEvents() {
				var _this6 = this;

				var leftHandle = this.leftHandle,
					rightHandle = this.rightHandle,
					leftBar = this.leftBar,
					middleBar = this.middleBar,
					rightBar = this.rightBar;

				var updateWidth = function() {
					var value1 = _this6.value1,
						value2 = _this6.value2,
						value3 = _this6.value3;

					_this6.totalWidth = _this6.getTotalWidth();
					leftBar.setElemWidth(_this6.getWidthByValue(value1));
					middleBar.setElemWidth(_this6.getWidthByValue(value2));
					rightBar.setElemWidth(_this6.getWidthByValue(value3));

					leftHandle.setPosition(leftBar.getElemWidth());
					rightHandle.setPosition(rightBar.getElemWidth());
					//console.log('update width to: ', _this6.totalWidth);
				};
				window.addEventListener('resize', updateWidth);
			}
		}, {
			key: 'getWidthByValue',
			value: function getWidthByValue(value) {
				var totalValue = this.totalValue,
					totalWidth = this.totalWidth;

				return value / totalValue * totalWidth;
			}
		}, {
			key: 'getValueByWidth',
			value: function getValueByWidth(width) {
				var totalValue = this.totalValue,
					totalWidth = this.totalWidth;

				return Math.round(width / totalWidth * totalValue);
			}
		}, {
			key: 'getTotalWidth',
			value: function getTotalWidth() {
				var sliderElem = this.sliderElem,
					leftHandle = this.leftHandle;

				var sliderWidth = parseFloat(sliderElem.offsetWidth);
				var handleWidth = leftHandle.getElemWidth();

				// Exclude padding widths
				var totalWidth = sliderWidth - 2 * handleWidth;
				if(totalWidth < 0) totalWidth = 2 * handleWidth;

				return totalWidth;
			}
		}, {
			key: 'updateValues',
			value: function updateValues(val1, val2, val3) {
				//console.log(this)
				$('i', this.leftHandle.elem).text(val1);
				$('i', this.rightHandle.elem).text(val1 + val2);
				return {
					value1: this.value1,
					value2: this.value2,
					value3: this.value3,
					totalValue: this.totalValue
				};
			}
		}, {
			key: 'getValues',
			value: function getValues() {
				return {
					value1: this.value1,
					value2: this.value2,
					value3: this.value3,
					totalValue: this.totalValue
				};
			}
		}]);

		return ErThreeValueSlider;
	}();
	window.ErThreeValueSlider = ErThreeValueSlider;
}(window, jQuery, document));
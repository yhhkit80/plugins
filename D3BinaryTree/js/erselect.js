/**
 * ercircle 圆形比例组件
 * 使用示例：
 * $('#test').ercircle({
 * 	multiple: true,//是否多选
 * 	readonly: true,//是否只读
 * 	disabled: false,//是否禁用
 * 	valueField: "value",//值字段名称
 * 	textField: "text",//描述字段名称
 * 	data:[]//数据
 * })
 * */

(function(win, $, doc) {

	//页面点击时隐藏下拉框
	$(document).on('click', function(e) {
		var target = $(e.target); //e.target获取触发事件的元素  
		if(target.closest(".er-select-head").length == 0) {
			//进入if则表明点击的不是下拉框元素 
			$('.er-select .er-menu').stop().slideUp();
		};
		e.stopPropagation();
	});

	function _validate(jq) {
		var t = $(jq);
		t.not('.disabled').trigger('mouseenter');
		setTimeout(function() {
			t.trigger('mouseleave');
		}, 1000);
	};

	function _isValid(jq) {
		var t = $(jq);
		t.trigger('mouseenter').trigger('mouseleave');
		var valid = t.hasClass("validatebox-invalid");
		return valid == false;
	};

	function _getValues(jq) {
		var values = [];
		$(jq).find(".er-menu-item.er-selected").each(function() {
			values.push($(this).attr('data-item'));
		});
		return values;
	};

	function _getValue(jq) {
		var values = [];
		var multiple = $.data(jq, 'erselect').options.multiple;
		var target = $(jq);
		target.find(".item-selected").each(function() {
			values.push($(this).attr('data-item'));
		});
		return multiple ? values : (values[0] || '')
	};

	function bindEvents(jq, type) {
		var box = $(jq);
		var opts = $.data(box[0], type).options;
		if(opts.required) {
			box.tooltip({
				position: 'right',
				content: '<span style="color:#fff">该输入项为必选项</span>',
				onShow: function() {
					$(this).tooltip("tip").css({
						backgroundColor: "#ff7e00",
						border: "1px solid #ff7e00",
						color: "#fff"
					});
				}
			})
			box.unbind("mouseenter").bind("mouseenter", function() {
				if(box.hasClass('disabled'))
					return false;
				var val = box[type]('getValue');
				if(!(val && val.length)) {
					box.addClass('validatebox-invalid').removeClass('validatebox-valid');
					box.tooltip('show');
				} else {
					box.addClass('validatebox-valid').removeClass('validatebox-invalid');
					box.tooltip('hide');
				}
			}).unbind("mouseleave").bind("mouseleave", function() {
				if(box.hasClass('disabled'))
					return false;
				var val = box[type]('getValue');
				if(!(val && val.length)) {
					box.addClass('validatebox-invalid').removeClass('validatebox-valid');
				} else {
					box.addClass('validatebox-valid').removeClass('validatebox-invalid');
				}
				box.tooltip('hide');
			});
		} else {
			box.removeClass('validatebox-invalid');
			box.unbind("mouseenter").unbind("mouseleave");
		}
	};

	function _select(jq, value) {
		var type = $(jq).hasClass('easyui-checkbox') ? 'checkbox' : 'radio';
		var opts = $.data(jq, type).options;
		var data = $.data(jq, type).data;
		if(opts.multiple) {
			var values = $(jq).checkbox("getValues");
			for(var i = 0; i < values.length; i++) {
				if(values[i] == value) {
					return;
				}
			}
			values.push(value);
			_setValues(jq, values);
		} else {
			_setValues(jq, [value]);
		}
		for(var i = 0; i < data.length; i++) {
			if(data[i][opts.valueField] == value) {
				opts.onSelect.call(jq, data[i]);
				return;
			}
		}
	};

	function _unselect(jq, value) {
		var type = $(jq).hasClass('easyui-checkbox') ? 'checkbox' : 'radio';
		var opts = $.data(jq, type).options;
		var data = $.data(jq, type).data;
		var values = _getValues(jq);
		for(var i = 0; i < values.length; i++) {
			if(values[i] == value) {
				values.splice(i, 1);
				_setValues(jq, values);
				break;
			}
		}
		for(var i = 0; i < data.length; i++) {
			if(data[i][opts.valueField] == value) {
				opts.onUnselect.call(jq, data[i]);
				return;
			}
		}
	};

	function _setValues(jq, values) {
		if(!values) return;
		if(typeof values == 'string')
			values = [values];
		values = values ? values : '';
		var type = 'erselect';
		var opts = $.data(jq, type).options;
		var data = $.data(jq, type).data;
		var nowValues = _getValues(jq); //获取当前值数组
		var tmp = [];
		for(var i = 0; i < nowValues.length; i++) {
			tmp[i] = nowValues[i];
		}
		var panel = $(jq);
		panel.find(".er-menu-item.er-selected").removeClass("er-selected");
		panel.find("input").val("");
		var vv = [],
			ss = [];
		for(var i = 0; i < values.length; i++) {
			var v = values[i];
			var s = v;
			for(var j = 0; j < data.length; j++) {
				if(data[j][opts.valueField] == v) {
					s = data[j][opts.textField];
					break;
				}
			}
			vv.push(v);
			ss.push(s);
			panel.find(".er-menu-item[data-item=\"" + v + "\"]").addClass("er-selected");
		}
		panel.find('.er-form-control').val(ss);
		panel.find('input[type=hidden]').val(vv);
		var aa = [];
		for(var i = 0; i < values.length; i++) {
			for(var j = 0; j < tmp.length; j++) {
				if(values[i] == tmp[j]) {
					aa.push(values[i]);
					tmp.splice(j, 1);
					break;
				}
			}
		}
		if(opts.multiple) {
			opts.onChange.call(jq, values, nowValues);
		} else {
			opts.onChange.call(jq, values[0], nowValues[0]);
		}
		_validate(jq);
	};

	function _loadData(jq, data) {
		var options = $.data(jq, 'erselect').options;
		var inputName = $(jq).attr('name');
		var panel = $(jq);
		if(options.loadFilter && typeof options.loadFilter == 'function') {
			data = options.loadFilter(data);
		}
		$.data(jq, 'erselect').data = data;
		var values = _getValues(jq);
		panel.empty();
		if(options.disabled) {
			panel.addClass('disabled');
		} else {
			panel.removeClass('disabled');
		}
		if(options.readonly) {
			panel.addClass('readonly');
		} else {
			panel.removeClass('readonly');
		}
		var placeholder = options.placeholder === undefined ? '请选择' : options.placeholder;
		var inputhead = $('<div class="er-select-head"><input type="text" class="er-form-control" readonly="readonly" value="" placeholder="' + placeholder + '"><input type="hidden" name="' + inputName + '" value=""><span class="er-select-icon">▼</span></div>').appendTo(panel);

		var menubox = $('<ul class="er-menu" style=""></ul>').appendTo(panel);
		for(var i = 0; i < data.length; i++) {
			var v = (typeof data[i] == "string") ? data[i] : data[i][options.valueField];
			var s = (typeof data[i] == "string") ? data[i] : data[i][options.textField];
			if(options.formatter) {
				s = options.formatter.call(jq, data[i]);
			}
			var item = $('<li class="er-menu-item" data-item="' + v + '">' + s + '</li>').appendTo(menubox);
			//绑定菜单选项点击事件
			item.on('click', function() {
				input = inputhead.children('.er-form-control');
				var multiple = options.multiple;
				if(!multiple) {
					$(this).addClass('er-selected').siblings('.er-menu-item').removeClass('er-selected');
					var val = $(this).attr('data-item'),
						txt = $(this).text();
					input.val($.trim(txt));
					input.siblings('input[type=hidden]').val($.trim(val));
					return; //用return 允许后续事件，单选后隐藏下拉框
				}
				//多选的时候
				$(this).toggleClass('er-selected');
				var arr = [],
					arrtext = [];
				$.each(menubox.children('.er-menu-item.er-selected'), function(i, item) {
					var val = $(item).attr('data-item'),
						txt = $(item).text();
					arr.push($.trim(val));
					arrtext.push($.trim(txt));
				})
				input.val(arrtext.join(','));
				input.siblings('input[type=hidden]').val(arr.join(','));
				return false; //用return false阻止后续事件，多选时不隐藏下拉框
			})
			if(data[i]["selected"]) {
				(function() {
					for(var i = 0; i < values.length; i++) {
						if(v == values[i]) {
							return;
						}
					}
					values.push(v);
				})();
			}
		}
		inputhead.on('click', function(e) {
			$('.er-select .er-menu').stop().slideUp(100);
			var readonly = options.readonly;
			var disabled = options.disabled;
			if(readonly || disabled) return false;
			menubox.stop().slideToggle();
		});
		if(options.multiple) {
			_setValues(jq, values);
		} else {
			if(values.length) {
				_setValues(jq, [values[values.length - 1]]);
			} else {
				_setValues(jq, []);
			}
		}
		options.onLoadSuccess.call(jq, data);
	};

	function _reload(jq, url, paramData) {
		var options = $.data(jq, 'erselect').options;
		if(url) {
			options.url = url;
		}
		paramData = paramData || {};
		paramData = $.extend(true, {}, paramData, options.queryParams);
		if(options.onBeforeLoad.call(jq, paramData) == false) {
			return;
		}
		options.loader.call(jq, paramData, function(data) {
			_loadData(jq, data);
		}, function() {
			options.onLoadError.apply(this, arguments);
		});
	};

	function create(jq, type) {
		var options = $.data(jq, type).options;
		$(jq).addClass("er-select");
	};

	$.fn.erselect = function(options, parm) {
		if(typeof options == "string") {
			var fn = $.fn.erselect.methods[options];
			if(fn) {
				return fn(this, parm);
			} else {
				return false;
			}
		}
		options = options || {};
		return this.each(function() {
			var data = $.data(this, "erselect");
			if(data) {
				$.extend(data.options, options);
				create(this, 'erselect');
			} else {
				data = $.data(this, "erselect", {
					options: $.extend({},
						$.fn.erselect.defaults, options)
				});
				create(this, 'erselect');
			}
			if(data.options.url) {
				_reload(this);
			} else if(data.options.dict) {
				//_loadData(this, RESTon.dictList(data.options.dict));
			} else if(data.options.data) {
				_loadData(this, data.options.data);
			}
		});
	};

	$.fn.erselect.methods = {
		options: function(jq) {
			var options = $.data(jq[0], "erselect").options;
			return options;
		},
		getData: function(jq) {
			return $.data(jq[0], "erselect").data;
		},
		getValues: function(jq) {
			return _getValues(jq);
		},
		getValue: function(jq) {
			return _getValues(jq);
		},
		setValues: function(jq, values) {
			return jq.each(function() {
				_setValues(this, values);
			});
		},
		setValue: function(jq, value) {
			return jq.each(function() {
				_setValues(this, value);
			});
		},
		clear: function(jq) {
			return jq.each(function() {
				$(this).find(".er-menu-item.er-selected").removeClass("er-selected");
				$(this).find("input").val("");
			});
		},
	}
	$.fn.erselect.defaults = {
		multiple: true,
		readonly: false,
		disabled: false,
		valueField: "value",
		textField: "text",
		data: null,
		//以下功能尚未开发
		method: "post",
		url: null,
		dict: undefined,
		loadFilter: function(data) {
			return data;
		},
		queryParams: {},
		formatter: function(row) {
			var options = $(this)['erselect']("options");
			return typeof row == "string" ? row : row[options.textField];
		},
		loader: function(param, success, error) {
			var options = $(this)['erselect']("options");
			if(!options.url) {
				return false;
			}
			$.ajax({
				type: options.method,
				url: options.url,
				data: param,
				dataType: "json",
				success: function(data) {
					success(data);
				},
				error: function() {
					error.apply(this, arguments);
				}
			});
		},
		onBeforeLoad: function(param) {},
		onLoadSuccess: function() {},
		onLoadError: function() {},
		onSelect: function(row) {},
		onUnselect: function(row) {},
		onChange: function(newValues, oldValues) {}
	};
}(window, jQuery, document));
(function(win, $, doc) {
	//扩展表单取值为json形式的方法
	$.fn.serializeObject = function() {
		var i = {};
		var n = this.serializeArray();
		$.each(n, function() {
			if(i[this.name] !== undefined) {
				if(!i[this.name].push) {
					i[this.name] = [i[this.name]]
				}
				i[this.name].push($.trim(this.value) || "")
			} else {
				i[this.name] = $.trim(this.value) || ""
			}
		});
		return i
	};
	//工具集
	var Tool = {
		//对象判断
		isObj: function(obj) {
			return Object.prototype.toString.call(obj) === "[object Object]";
		},
		//函数判断
		isFunction: function(obj) {
			return Object.prototype.toString.call(obj) === "[object Function]";
		},
		//数组判断
		isArray: function(obj) {
			return Object.prototype.toString.call(obj) === "[object Array]";
		},
	}
	var terminalDict = {
		'HIGH': '高风险',
		'MIDDLE': '中风险',
		'LOW': '低风险'
	}
	// 构造BinaryTree
	function BinaryTree(options) {
		options = options || {};
		this.container = $(options.container);
		if(this.container.length === 0)
			throw Error("未指定二叉树容器");
		this.options = $.extend(true, {}, {
			container: null, //容器
			nodeWidth: 100, //节点最小外宽度
			nodes: [], //生成的节点
			data: [], //数据
			originalData: [], //初次加载时的原始数据
		}, options);
		this.init.call(this);
	};
	//原型
	var fn = BinaryTree.prototype;

	//添加放小缩小按钮和事件
	function addZoomDom() {
		var _this = this;
		var floatBtn = $('<span class="er-float-btn"></span>').appendTo(_this.container.parent());
		$('<a class="er-icon er-icon-zoom" href="javascript:;"></a>').on('click', function() {
			fn.changeZoom.call(_this, 1);
		}).appendTo(floatBtn);

		$('<a class="er-icon er-icon-zoom-in" href="javascript:;"></a>').on('click', function() {
			if(_this.options.zoom < 1.5)
				fn.changeZoom.call(_this, _this.options.zoom + .1);
		}).appendTo(floatBtn);

		$('<a class="er-icon er-icon-zoom-out" href="javascript:;"></a>').on('click', function() {
			if(_this.options.zoom > .6)
				fn.changeZoom.call(_this, _this.options.zoom - .1);
		}).appendTo(floatBtn);

		$('<a href="javascript:;" class="button" style="top: 40px;">清空</a>').on('click', function() {
			fn.clear.call(_this);
		}).appendTo(floatBtn);
	}
	//添加节点右键操作菜单
	function addMenuDom() {
		this.menu = $('<ul class="er-menu er-menu-right"><li class="er-menu-item" data-item="1"><i class="fa fa-files-o" data-item="1"></i>&nbsp; 編輯</li><li class="er-menu-item" data-item="2"><i class="fa fa-trash" data-item="2"></i>&nbsp; 删除</li></ul>').appendTo(win.document.body);
	}

	//初始化二叉树
	fn.init = function() {
		this.container.empty();
		this.container.addClass('er-container');
		this.canvasdom = $('<canvas class="er-canvas"></canvas>').appendTo(this.container);
		this.rootdom = $('<div class="er-tree-container"></div>').appendTo(this.container);
		this.rootNode = $('<div class="er-node-item er-node-empty" data-pid="0" data-branch="hit" style="width:' + (this.options.nodeWidth - 10) + 'px;"></div>').appendTo(this.rootdom);

		this.options.initId = 0; //自动ID生成计数
		this.options.zoom = 1;
		this.options.originalData = JSON.parse(JSON.stringify(this.options.data));
		addZoomDom.call(this); //添加放小缩小按钮
		addMenuDom.call(this); //添加节点右键操作菜单
		fn.resize.call(this);
		fn.render.call(this);
	};
	//清空所有规则
	fn.clear = function() {
		this.options.data = [];
		fn.render.call(this);
		this.rootdom.css({width:'200',height:'auto'});
		fn.resize.call(this);
	}
	//检验二叉树结果是否全部选择结束
	fn.isBinaryTreeCompleted = function() {
		var data = this.options.data;
		if(!data.length) return false;
		var res = true;
		for(var i = 0, l = data.length; i < l; i++) {
			if(data[i].attachData.relation.hitBranch == null || data[i].attachData.relation.unHitBranch == null) {
				res = false;
			}
		}
		return res;
	}
	//放大缩小图表
	fn.changeZoom = function(toscale) {
		var _this = this,
			zoom = _this.options.zoom || 1,
			start = zoom;
		if(zoom == toscale) return;
		var gap = zoom > toscale ? zoom - toscale : toscale - zoom;
		var tms = 400; //共计时间
		var stepms = 20; //间隔时间
		var step = gap / (400 / 20); //根据执行次数计算步数;
		if(t) clearInterval(t);

		function todo() {
			if(((zoom > toscale) && (start <= toscale)) || ((zoom < toscale) && (start >= toscale))) {
				_this.options.zoom = start;
				clearInterval(t);
				return;
			}
			start = (zoom > toscale) ? (start - step) : (start + step);
			_this.options.zoom = start;
			$('.er-container').css({
				zoom: start
			});
		}
		var t = setInterval(function() {
			todo();
		}, stepms)
		_this.options.zoom = toscale;
	}
	//调整row宽度，小于两倍最小节点外宽时向上拓宽调整
	fn.adjustRowWidth = function(row) {
		var nodeWidth = this.options.nodeWidth;
		var pdom = row.parent(); //.er-tree-container容器或者是'.er-col-50'
		pdom.width(row.children('.er-col-50').eq(0).outerWidth() + row.children('.er-col-50').eq(1).outerWidth());
		var prow = pdom.parent('.er-row');
		if(prow.length) {

			var cl = prow.children('.er-col-50').eq(0).outerWidth(),
				cr = prow.children('.er-col-50').eq(1).outerWidth(),
				cw = Math.ceil(cl + cr),
				colw = nodeWidth; //设置的节点最小外宽，100为小一点的
			prow.width(cw);

			var lt = prow.children('.er-col-50').eq(0).children('.er-node-item')[0].offsetLeft,
				rt = prow.children('.er-col-50').eq(1).children('.er-node-item')[0].offsetLeft + cl;
			var ml = 0;
			if(cl > cr) {
				ml = (cl / 2) + (cw / 4) - colw / 2;
			} else if(cl < cr) {
				ml = (cl / 2) + (cw / 4) - colw / 2;
			} else {
				ml = (cw / 2) - colw / 2;
			}
			prow.siblings('.er-node-item').css({
				marginLeft: ml + 'px'
			})
			fn.adjustRowWidth.call(this, prow);
		}
	}
	//更新容器大小
	fn.resize = function(row) {
		var opt = this.options;
		//有row时代表要先根据row来调整宽高
		if(row && row.length) {
			var minW = opt.nodeWidth * 2; //200  er-row最小宽度为节点最小外宽的双倍
			var w = parseInt(row.outerWidth());
			if(w < minW) {
				row.width(minW);
				fn.adjustRowWidth.call(this, row);
			}
			//重新计算row的平级er-node-item的marginleft
			var target = row.siblings('.er-node-item');
			var lt = row.children('.er-col-50').eq(0).children('.er-node-item')[0].offsetLeft - row[0].offsetLeft,
				rt = row.children('.er-col-50').eq(1).children('.er-node-item')[0].offsetLeft - row[0].offsetLeft;
			var ml = lt + (rt - lt) / 2;
			target.css({
				'margin-left': ml + 'px'
			});
		}
		//调整完后将二叉树容器宽高已定，赋值到options之中
		opt.width = this.rootdom.outerWidth();
		opt.height = this.rootdom.outerHeight();
		var boxsize = {
			width: opt.width,
			height: opt.height
		}
		console.log(boxsize)
		//最外层容器定义宽高
		this.container.css(boxsize);
		//画布和画布样式都要定义宽高
		var canvas = this.canvasdom[0];
		this.canvasdom.css(boxsize);
		canvas.width = opt.width;
		canvas.height = opt.height;
	}
	//两点之间画带箭头的直线
	fn.drawEdge = function(fromX, fromY, toX, toY, color) {
		var canvas = this.canvasdom[0];
		var ctx = canvas.getContext("2d");
		ctx.beginPath()
		var theta = 30,
			headlen = 10,
			width = 2;
		color = color || "#08e";
		fromY = fromY + 5; //因为有padding，起点高度要下去一点
		toY = toY - 5; //因为有padding，终点要向上去一点
		// 计算各角度和对应的P2,P3坐标 
		var angle = Math.atan2(fromY - toY, fromX - toX) * 180 / Math.PI,
			angle1 = (angle + theta) * Math.PI / 180,
			angle2 = (angle - theta) * Math.PI / 180,
			topX = headlen * Math.cos(angle1),
			topY = headlen * Math.sin(angle1),
			botX = headlen * Math.cos(angle2),
			botY = headlen * Math.sin(angle2);
		var arrowX = fromX - topX,
			arrowY = fromY - topY;
		ctx.moveTo(arrowX, arrowY);
		ctx.moveTo(fromX, fromY);
		ctx.lineTo(toX, toY);
		arrowX = toX + topX;
		arrowY = toY + topY;
		ctx.moveTo(arrowX, arrowY);
		ctx.lineTo(toX, toY);
		arrowX = toX + botX;
		arrowY = toY + botY;
		ctx.lineTo(arrowX, arrowY);
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.stroke();
		ctx.restore();
	}
	//清除画布
	fn.clearCanvas = function() {
		var canvas = this.canvasdom[0];
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
	//获取节点的顶部中心点坐标
	fn.getNodeDot = function(target) {
		var type = $(target).parent('.er-col-50').attr('data-branch');
		return {
			l: target.offsetLeft + (this.options.nodeWidth - 10) / 2, //45
			t: target.offsetTop,
			color: type == 'unhit' ? '#f00' : '#08e'
		}
	}
	//绘制所有箭头连线
	fn.drawEdges = function() {
		var _this = this;
		var box = this.rootdom;
		var dots = [];
		//遍历所有节点，获取带子节点时对应箭头的坐标
		$.each(_this.options.nodes, function(i, node) {
			var startid = $(node.target).attr('data-id');
			var childnodes = box.find('.er-node-item[data-pid=' + startid + ']');
			if(childnodes.length == 0) return;
			var startDot = fn.getNodeDot.call(_this, node.target[0])
			$.each(childnodes, function(j, childnode) {
				var endDot = fn.getNodeDot.call(_this, childnode);
				dots.push({
					sl: startDot.l, //起点left
					st: startDot.t, //起点top
					el: endDot.l, //终点left
					et: endDot.t, //终点top
					color: endDot.color //终点中的颜色根据终点父元素er-col-50的类型获取的
				})
			})
		})
		//清除画布内容
		fn.clearCanvas.call(_this);
		//遍历所有箭头坐标，开始绘制
		$.each(dots, function(di, dot) {
			fn.drawEdge.call(_this, dot.sl, dot.st, dot.el, dot.et, dot.color);
		})
	}
	//放出去的单个节点添加事件
	fn.pushNode = function(obj) {
		fn.appendNode.call(this, obj);
		fn.drawEdges.call(this);
	}
	//拖拽事件
	fn.todoNodeDrop = function(dragRule, nodetarget) { //nodetarget为父节点dom元素
		var _this = this;
		//获取节点落下时的父节点autiId
		dragRule.pid = nodetarget.attr('data-pid');
		var autoId = "-1";
		if(dragRule.type != 'TERMINAL') {
			_this.options.initId = _this.options.initId + 1;
			autoId = "" + _this.options.initId;
		}
		var isHit = nodetarget.attr('data-branch') == 'hit',
			nodes = _this.options.nodes,
			pnode = _this.findNode(dragRule.pid);
		if(pnode) {
			var pobj = pnode.data;
			//拽拽到的父节点中已经有数据时不再添加
			if(pobj.attachData.relation[isHit ? 'hitBranch' : 'unHitBranch']) return false;
			var hassamepath = _this.pathSameCheck(dragRule.ruleClass, pobj); //true为有重复
			if(hassamepath) {
				return layer.alert('该路径下已有相同规则，请重新选择');
			}
		}
		var newNodeData = {
			ruleTitle: dragRule.ruleTitle,
			ruleClass: dragRule.ruleClass,
			enable: true,
			argument: null, //逻辑初始为空
			attachData: {
				autoId: autoId,
				isHit: isHit,
				type: dragRule.type,
				weight: 10,
				relation: {
					parent: {
						value: dragRule.pid,
						type: "RULE"
					},
					hitBranch: null,
					unHitBranch: null,
				}
			}
		};
		if(dragRule.type == 'TERMINAL') {
			_this.pushNode(newNodeData); //直接添加规则结果
			if(pnode) pobj.attachData.relation[isHit ? 'hitBranch' : 'unHitBranch'] = {
				value: dragRule.ruleClass, //拖拽是结果时父节点的value是HIGH等值
				type: dragRule.type
			}
		} else {
			_this.editNode(newNodeData); //新规则初次编辑
		}
	}
	//取消浏览器默认右键菜单
	win.oncontextmenu = function() {
		return false
	};

	//添加新数据或修改的节点数据，并更新视图
	fn.pushData = function(saveData) {
		//如果数据中已有，则修改，没有则新增
		var oldData = this.findData(saveData.attachData.autoId);
		if(oldData) {
			oldData.attachData = saveData.attachData;
			oldData.argument = saveData.argument;
		} else if(saveData.attachData.type != 'TERMINAL') {
			this.options.data.push(saveData);
		}
		//获取父节点数据并修改父节点中对应分支的数据
		var isHit = saveData.attachData.isHit;
		var pobj = this.findData(saveData.attachData.relation.parent.value);
		if(pobj) pobj.attachData.relation[isHit ? 'hitBranch' : 'unHitBranch'] = {
			"value": saveData.attachData.autoId,
			"class": saveData.attachData.type != "TERMINAL" ? saveData.ruleClass : undefined,
			"type": saveData.attachData.type
		}
		this.render(this.options.data);
	}
	//查找数据
	fn.findData = function(autoId) {
		if(autoId == -1) return false;
		var nodes = this.options.data;
		var going = true,
			node = undefined;
		for(var i = 0, l = nodes.length; i < l; i++) {
			if(going == true && (nodes[i].attachData.autoId == autoId)) {
				node = nodes[i];
				going = false;
			}
		}
		return node;
	}
	//查找规则节点
	fn.findNode = function(autoId) {
		if(autoId == -1) return false;
		var nodes = this.options.nodes;
		var going = true,
			node = undefined;
		for(var i = 0, l = nodes.length; i < l; i++) {
			if(going == true && (nodes[i].data.attachData.autoId == autoId)) {
				node = nodes[i];
				going = false;
			}
		}
		return node;
	}
	//获取节点索引
	fn.getNodeIndex = function(autoId) {
		var nodes = this.options.nodes;
		for(var i = 0; i < nodes.length; i++) {
			if(nodes[i].data.attachData.autoId == autoId) return i;
		}
		return -1;
	};
	//检测添加的路径中节点规则是否有重复，true为有重复
	fn.pathSameCheck = function(ruleClass, pdata) {
		if(ruleClass == pdata.ruleClass) return true;
		else {
			var npid = parseInt(pdata.attachData.relation.parent.value);
			if(npid < 1) return false;
			var npdata = this.findData(npid);
			if(!npdata) return false;
			return fn.pathSameCheck.call(this, ruleClass, npdata);
		}
	}
	//删除节点
	fn.deleteNode = function(nodeData) {
		var BinaryTree = this;
		BinaryTree.menu.hide();
		var isHit = nodeData.attachData.isHit;
		var parentBranch = isHit ? 'hitBranch' : 'unHitBranch';
		if(nodeData.attachData.relation.hitBranch != null || nodeData.attachData.relation.unHitBranch != null) {
			layer.open({
				content: '请先删除该节点下的子节点',
				title: '提示'
			})
			return;
		}
		//询问框
		layer.confirm('确认删除该节点？', {
			btn: ['确认', '取消'] //按钮
		}, function() {
			var pid = nodeData.attachData.relation.parent.value;
			var pdata = fn.findData.call(BinaryTree, pid);
			if(pdata)
				pdata.attachData.relation[parentBranch] = null;
			var index = fn.getNodeIndex.call(BinaryTree, nodeData.attachData.autoId);
			if(index > -1)
				BinaryTree.options.data.splice(index, 1);
			layer.msg('已删除', {
				icon: 1,
				time: 1000
			});
			fn.render.call(BinaryTree, BinaryTree.options.data);
		}, function() {
			layer.closeAll();
		});
	}
	//打开弹窗编辑规则节点
	fn.editNode = function(nodeData) {
		this.menu.hide();
		if(typeof this.options.beforeFormOpen == 'function')
			this.options.beforeFormOpen(nodeData); //执行表单参数修改事件,参数为节点数据
		var editContainer = $(this.options.editContainer);
		//改变layForm表单中的可选参数和值
		layer.open({
			type: 1,
			title: '编辑规则',
			closeBtn: 1,
			shadeClose: true,
			anim: 2,
			area: ['600px', 'auto'], //['500px','400px']一个字符串参数时为宽，数组时为宽高
			skin: 'lay-window',
			content: editContainer
		});
	}
	//根据节点信息创建新节点--框架已存在，添加具体的er-node-title内容和子节点框架，如果是终端结点的话则结束
	function Node(BinaryTree, obj) {
		this.autoId = obj.attachData.autoId;
		BinaryTree.options.initId = Math.max(BinaryTree.options.initId, obj.attachData.autoId);
		var pid = '' + obj.attachData.relation.parent.value;
		//找到所在空节点
		this.target = $('.er-node-item[data-pid="' + (pid || '') + '"][data-branch="' + (obj.attachData.isHit ? 'hit' : 'unhit') + '"]', this.container).removeClass('er-node-empty');
		this.data = obj;
		this.target.attr('data-id', obj.attachData.autoId);
		this.target.attr('data-nodetype', obj.attachData.type);
		//添加节点内容
		this.target.append('<div class="er-node-title">' + obj.ruleTitle + '</div>');

		var nodeWidth = BinaryTree.options.nodeWidth;
		//节点是规则时添时其下虚框
		if(obj.attachData.type !== 'TERMINAL') {
			this.row = $('<div data-pid="' + pid + '" class="er-row"><div data-branch="hit" class="er-col-50"style="width:' + nodeWidth + 'px;"><div data-branch="hit" class="er-node-item er-node-empty" data-pid="' + obj.attachData.autoId + '" style="width:' + (nodeWidth - 10) + 'px;"></div></div><div data-branch="unhit" class="er-col-50"style="width:' + nodeWidth + 'px;"><div data-branch="unhit" class="er-node-item er-node-empty" data-pid="' + obj.attachData.autoId + '" style="width:' + (nodeWidth - 10) + 'px;"></div></div></div>');
		}
		//根据类型获取挂载父节点下的对应col
		var edgetype = obj.attachData.isHit ? 'hit' : 'unhit';
		this.parentNode = $('.er-node-item[data-id="' + pid + '"]', BinaryTree.container);
		//节点右击事件绑定
		if(!BinaryTree.menu) return;
		var node = this;
		$(document).on('mousedown', function(e) {
			if($(e.target).closest(".er-node-title").length == 0 && $(e.target).closest(".er-menu").length == 0)
				BinaryTree.menu.hide();
			e.stopPropagation();
		});
		var editBtn = $("li[data-item=1]", BinaryTree.menu);
		var deleleBtn = $("li[data-item=2]", BinaryTree.menu);
		//节点右键菜单事件
		$('.er-node-title', this.target).off('mousedown').on('mousedown', function(j) {
			if(j.which === 3) { //右击
				if(obj.attachData.type == 'TERMINAL') {
					//不是规则的话隐藏编辑按钮
					editBtn.off('click').on('click', function() {
						return false;
					}).hide();
				} else {
					//是规则的时候弹窗编辑
					editBtn.off('click').on('click', function() {
						fn.editNode.call(BinaryTree, node.data);
					}).show();
				}
				//删除
				deleleBtn.off('click').on('click', function() {
					fn.deleteNode.call(BinaryTree, node.data);
				})
				BinaryTree.menu.css({
					"display": "block",
					"top": j.pageY + "px",
					"left": j.pageX + "px"
				})
			}
		});
	}
	//创建并添加节点元素
	fn.appendNode = function(obj) {
		var opt = this.options;
		var node = new Node(this, obj);
		if(!node.target.length) {
			layer.alert('找不到父节点');
			return;
		}
		if(obj.attachData.type != "TERMINAL") {
			opt.nodes.push(node);
		}
		if(node.row) node.target.parent().append(node.row);
		fn.resize.call(this, node.row);
		//如果子节点是结果，继续执行添加结果结点元素
		if(obj.attachData.relation.hitBranch && obj.attachData.relation.hitBranch.type == 'TERMINAL') {
			fn.appendNode.call(this, {
				ruleTitle: terminalDict[obj.attachData.relation.hitBranch.value],
				attachData: {
					autoId: -1,
					isHit: true,
					type: 'TERMINAL',
					relation: {
						parent: {
							value: obj.attachData.autoId,
							type: "RULE"
						},
						hitBranch: null,
						unHitBranch: null
					}
				}
			})
		}
		if(obj.attachData.relation.unHitBranch && obj.attachData.relation.unHitBranch.type == 'TERMINAL') {
			fn.appendNode.call(this, {
				ruleTitle: terminalDict[obj.attachData.relation.unHitBranch.value],
				attachData: {
					autoId: -1,
					isHit: false,
					type: 'TERMINAL',
					relation: {
						parent: {
							value: obj.attachData.autoId,
							type: "RULE"
						},
						hitBranch: null,
						unHitBranch: null
					}
				}
			})
		}
	}
	//还原初始状态
	fn.restore = function(data) {
		this.options.data = JSON.parse(JSON.stringify(this.options.originalData));
		fn.render.call(this);
	}

	//渲染二叉树
	fn.render = function(newData) {
		var _this = this,
			opt = this.options,
			data = newData || opt.data;
		opt.nodes = [];
		$(_this.rootdom).html('<div class="er-node-item er-node-empty" data-pid="0" data-branch="hit" style="width:' + (this.options.nodeWidth - 10) + 'px;"></div>');
		$.each(data, function(i, item) {
			if(i === 0) item.attachData.isHit = true;
			fn.appendNode.call(_this, item)
		})
		fn.drawEdges.call(this);
	}
	//全局构造器
	win.BinaryTree = BinaryTree;

}(window, jQuery, document));
(function(win, $, doc) {
	//扩展d3方法
	d3.selection.prototype.moveToFront = function() {
		return this.each(function() {
			this.parentNode.appendChild(this);
		});
	};
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
	};

	//创建新的斜线生成器  生成一个二维贝塞尔连接器, 用于节点连接图.
	var diagonal = d3.svg.diagonal()
		.projection(function(d) {
			return [d.y, d.x];
		});

	//获取节点对象到根节点的所有路径id
	function getEdges(d) {
		var edges = [];

		function todo(d) {
			if(d.parent && d.parent.id) {
				edges.push(d.parent.id + "_" + d.id);
				todo(d.parent);
			}
		}
		todo(d);
		return edges;
	}
	//计算字符串字节大小
	function getByteLen(val) { //传入一个字符串
		var len = 0;
		for(var i = 0; i < val.length; i++) {
			len += val[i].match(/[^\x00-\xff]/ig) != null ? 2 : 1
			//如果是全角，占用两个字节  如果mysql中某字段是text, 如果设置编码为utf-8,那么一个中文是占3个字节, gbk是两个字节 //半角占用一个字节
		}
		return len;
	}
	//格式化文字串换行带逗号
	function formatterText(txt, countInLine) {
		var name = txt || '',
			str = '',
			arr = [],
			count = 0,
			countInLine = countInLine || 16; //换行，每行8个全角或16个字节
		//var countInLine = Math.floor(nodeWidth / textSize) * 2; //根据节点宽度和字体大小计算多少个字换行
		for(var i = 0; i < name.length; i++) {
			if(count >= countInLine && !(/^[a-zA-Z]$/.test(name[i]))) {
				//str += "\r\n" + name[i];
				str += "," + name[i]; //以逗号分隔换行
				count = getByteLen(name[i]);
			} else {
				str += name[i];
				count += getByteLen(name[i]);
			}
		}
		return str;
	}

	// 构造D3BinaryTree
	function D3BinaryTree(options) {
		options = options || {};
		this.container = $(options.container);
		if(this.container.length === 0)
			throw Error("未指定二叉树容器");
		this.options = $.extend(true, {}, {
			container: '#svgContainer', //画布父容器
			editContainer: '#layForm', //编辑弹窗中内容的容器
			svgBtnContainer: '.svgBtnContainer', //操作按钮容器
			fit: true, //是否自适应父容器宽高，true的话没有滚动条，全靠鼠标缩放，false的话有滚动条
			nodeWidth: 80, //节点宽度
			nodeHeight: 32, //节点高度
			textSize: 10, //字体大小
			gap: 20, //画布四边间距(其实只有左间距能看出来)
			duration: 500, //过渡延迟时间
			originalData: [], //初次加载时的原始数据，可以无或者空数组，数组有值时格式就必须正确
			terminalDict: {
				'HIGH': '高风险',
				'MIDDLE': '中风险',
				'LOW': '低风险'
			}, //风险等级字典
			operBtn: [{
				text: '1:1',
				func: function() {
					_this.resize();
				}
			}],
		}, options);
		this.treeData = []; //tree数据;
		this.init();
	};
	//原型
	var fn = D3BinaryTree.prototype;

	//初始化二叉树
	fn.init = function() {
		var container = this.options.container;
		$(container).addClass('er-btsvg-container').empty();
		var opt = this.options,
			gap = opt.gap,
			nodeWidth = opt.nodeWidth,
			width = $(container).width(),
			height = $(container).height();
		this.width = width,
			this.height = height;
		// 创建zoom操作
		this.zoom = d3
			.behavior.zoom()
			.scaleExtent([0.5, 10]) // 设置缩放区域
			.on("zoom", () => {
				var tx = d3.event.translate[0],
					ty = d3.event.translate[1];
				this.view.attr(
					"transform",
					"translate(" +
					(tx + gap + nodeWidth / 2) +
					"," +
					(ty + gap) +
					") scale(" +
					d3.event.scale +
					")"
				);
			});
		//声明与定义画布属性，如果在渲染时改成100%自适应高度的话，这里不设也没关系
		this.svg = d3.select(container).append("svg")
			.attr("width", width)
			.attr("height", height)
			.call(this.zoom); // svg层绑定zoom事件
		// 子group元素存为view变量
		this.view = this.svg.append("g")
			.attr("transform", "translate(" + (gap + nodeWidth / 2) + "," + gap + ")");
		this.initId = 0; //自动ID生成计数
		this.tree = d3.layout.tree() //创建一个树布局
			.size([height, width]);
		this.options.originalData = JSON.parse(JSON.stringify(this.options.originalData)); //保存原始数据
		this.treeData = this.convertToTreeData(this.options.originalData); //转化后的tree格式数据
		this.addOperBtnDom(); //添加放小缩小按钮
		this.addMenuDom(); //添加节点右键操作菜单
		this.render(); //渲染
	};

	//添加左上角按钮和事件
	fn.addOperBtnDom = function() {
		var _this = this,
			operBtn = _this.options.operBtn,
			svgBtnContainer = $(_this.options.svgBtnContainer);
		$.each(operBtn, function(i, item) {
			if(item.text && Tool.isFunction(item.func)) {
				var btn = $('<span class="button">' + item.text + '</span>').on('click', item.func);
				svgBtnContainer.append(btn)
			}
		});
	}
	//添加节点右键操作菜单
	fn.addMenuDom = function() {
		var _this = this,
			container = _this.options.container;
		// 定义右键菜单选项，使用时为双数组[[{},{}]]形式
		var editMenu = {
				text: "编辑",
				func: function() {
					var id = Number(d3.select(this).attr("data-id"));
					_this.editNode(id);
				}
			},
			deleteMenu = {
				text: "删除",
				func: function() {
					var id = Number(d3.select(this).attr("data-id"));
					_this.deleteNode(id);
				}
			}
		// 事件监听方式添加节点右键事件绑定
		$(container).smartMenu([
			[deleteMenu]
		], {
			name: "chatRightControl1",
			container: "g.node.TERMINAL" //绑定风险节点右键删除
		});
		$(container).smartMenu([
			[editMenu, deleteMenu]
		], {
			name: "chatRightControl2", //绑定多种右键菜单时，name不能重名
			container: "g.node.RULE" //绑定规则节点右键编辑和删除
		});
	}

	//转换原始模型数据为tree所需数据格式对象
	fn.convertToTreeData = function(oldData) {
		var terminalDict = this.options.terminalDict;
		var nodes = JSON.parse(JSON.stringify(oldData || [])); //没传原值的话代表清空
		//初始根节点，如为空的话需要加空对象用来渲染
		var originObj = nodes[0] || {
			attachData: {
				relation: {}
			}
		};
		//转换后的新节点，只有一个根节点，子节点嵌套在其中，根节点有数据时需要带入其值
		var obj = originObj.ruleTitle ? {
			name: originObj.ruleTitle,
			parent: null,
			type: "RULE",
			nodeData: originObj,
			children: [{
				hitBranch: true
			}, {
				hitBranch: false
			}]
		} : {
			parent: null
		}
		//根据attachData中的autoId，找到原始数据
		function findData(autoId) {
			if(autoId <= -1) return false;
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
		//风险节点格式
		function creatTerminalData(val, parentName, hitBranch) {
			return {
				name: terminalDict[val] || val,
				type: "TERMINAL",
				nodeData: {
					type: "TERMINAL",
					ruleTitle: terminalDict[val] || val,
					ruleClass: val
				},
				parent: parentName,
				hitBranch: hitBranch
			}
		}
		//规则节点格式
		function creatRuleData(branchData, parentName, hitBranch) {
			return {
				name: branchData.ruleTitle,
				type: "RULE",
				parent: parentName,
				hitBranch: hitBranch,
				nodeData: branchData,
				children: [{
					hitBranch: true
				}, {
					hitBranch: false
				}]
			}
		}
		//从根节点开始查找所有子节点，将其转成tree格式数据
		function todo(originObj, obj) {
			var hitBranch = originObj.attachData.relation.hitBranch;
			var unHitBranch = originObj.attachData.relation.unHitBranch;
			if(hitBranch && hitBranch.type == "TERMINAL") {
				obj.children[0] = creatTerminalData(hitBranch.value, originObj.ruleTitle, true);
			} else if(hitBranch && hitBranch.type == "RULE") {
				var hitData = findData(hitBranch.value);
				if(hitData) {
					obj.children[0] = creatRuleData(hitData, originObj.ruleTitle, true);
					todo(hitData, obj.children[0])
				}
			}
			if(unHitBranch && unHitBranch.type == "TERMINAL") {
				obj.children[1] = creatTerminalData(unHitBranch.value, originObj.ruleTitle, false);
			} else if(unHitBranch && unHitBranch.type == "RULE") {
				var unhitData = findData(unHitBranch.value);
				if(unhitData) {
					obj.children[1] = creatRuleData(unhitData, originObj.ruleTitle, false);
					todo(unhitData, obj.children[1])
				}
			}
		}
		todo(originObj, obj); //从根节点开始转换
		return [obj];
	}

	//将tree格式数据转换为模型格式数据
	fn.convertToModalData = function(treeData) {
		if(!treeData || !treeData.length) return false;
		var root = treeData[0],
			arr = [];

		function todo(d) {
			if(d.nodeData && d.type == "RULE") {
				var obj = {
					ruleTitle: d.nodeData.ruleTitle,
					ruleClass: d.nodeData.ruleClass,
					enable: true,
					argument: d.nodeData.argument,
					attachData: {
						"autoId": d.id, //d.id, 节点id
						"isHit": d.hitBranch === false ? false : true, //hitBranch的值，根节点默认为true
						"type": d.type,
						"weight": d.nodeData.attachData.weight,
						"relation": {
							"parent": null,
							"hitBranch": null,
							"unHitBranch": null
						}
					}
				}
				if(d.parent) {
					obj.attachData.relation.parent = {
						"value": d.parent.id, //根节点没有parent
						"type": d.parent.type
					}
				}
				var children = d.children || d._children;
				if(children[0].type) {
					obj.attachData.relation.hitBranch = {
						"value": children[0].type == "RULE" ? children[0].id : children[0].nodeData.ruleClass, //是规则的话取id，是风险的话取ruleClass
						"type": children[0].type,
						"class": children[0].type == "RULE" ? children[0].nodeData.ruleClass : undefined, //规则要存ruleClass
					}
				}
				if(children[1].type) {
					obj.attachData.relation.unHitBranch = {
						"value": children[1].type == "RULE" ? children[1].id : children[1].nodeData.ruleClass, //是规则的话取id，是风险的话取ruleClass
						"type": children[1].type,
						"class": children[1].type == "RULE" ? children[1].nodeData.ruleClass : undefined, //规则要存ruleClass
					}
				}
				arr.push(obj);
				if(children[0].type == "RULE") todo(children[0]);
				if(children[1].type == "RULE") todo(children[1]);
			}
		}
		todo(root);
		return arr;
	}

	//检验二叉树结果是否全部选择结束
	fn.isD3BinaryTreeCompleted = function() {
		var data = this.convertToModalData(this.treeData);
		//console.log("转换后的模型格式数据", data);
		if(!data.length) return false;
		var res = true;
		for(var i = 0, l = data.length; i < l; i++) {
			if(data[i].attachData.relation.hitBranch == null || data[i].attachData.relation.unHitBranch == null) {
				res = false;
			}
		}
		return res;
	}

	//返回当前tree格式数据
	fn.getTreeData = function() {
		return this.treeData;
	}
	//返回当前tree格式数据转换为模型格式数据
	fn.getModalData = function() {
		return this.convertToModalData(this.treeData);
	}
	//清空所有规则
	fn.clear = function() {
		this.initId = 0;
		this.treeData = this.convertToTreeData(); //清空时不传值
		this.render();
		this.resize();
	}
	//还原初始数据
	fn.restore = function(data) {
		this.treeData = this.convertToTreeData(this.options.originalData);
		this.render();
		this.resize();
	}
	//还原初始1:1大小
	fn.resize = function() {
		this.zoom.translate([0, 0])
			.scale(1);
		this.view.attr(
			"transform",
			"translate(" +
			(this.options.gap + this.options.nodeWidth / 2) + "," + this.options.gap +
			") scale(1)"
		);
	}

	//主方法：渲染更新tree
	fn.update = function(source) {
		var _this = this,
			svg = this.svg,
			view = this.view,
			tree = this.tree,
			root = this.root,
			width = this.width,
			height = this.height,
			opt = this.options,
			container = opt.container,
			gap = opt.gap,
			duration = opt.duration,
			nodeWidth = opt.nodeWidth,
			nodeHeight = opt.nodeHeight,
			textSize = opt.textSize,
			countInLine = Math.floor(nodeWidth / textSize) * 2; //根据节点宽度和字体大小计算多少个字换行;

		var maxDepth = 0;
		// 计算新树图的布局
		var nodes = tree.nodes(root).reverse();
		// 求出深度
		nodes.forEach(function(d) {
			maxDepth = Math.max(maxDepth, d.depth);
			_this.initId = Math.max(_this.initId, d.id || 0);
		});
		var calcHeight = 100 + maxDepth * nodeHeight * 2.5; //暂时按深度扩充高度
		//根据高度重新定义树布局的大小
		tree = d3.layout.tree()
			.size([calcHeight, width]);
		//重新定义树图布局的节点位置			
		var nodes = tree.nodes(root).reverse(),
			links = tree.links(nodes);
		//重新取最大宽度，重新设置y坐标点，每层占节点宽双倍，留线的距离
		var calcWidth = 0;
		nodes.forEach(function(d) {
			d.y = d.depth * nodeWidth * 2;
			calcWidth = Math.max(calcWidth, d.y + nodeWidth);
		});

		function unlighterEdgesColor() {
			view.selectAll('.link')
				//.transition()
				//.duration(200)
				.style('stroke-width', '1px')
				.style('stroke', '#ccc');
		}

		function lighterEdgesColor(d) {
			var edges = getEdges(d);
			edges.forEach(function(item, i) {
				view.select('.link[data-id="' + item + '"]').moveToFront()
				//不能带动画，带动画线的位置就不对了
				view.select('.link[data-id="' + item + '"]')
					//.transition()
					//.duration(200)
					.style('stroke-width', '2px')
					.style('stroke', '#08e')
			});
		}

		// Update the nodes…每个node对应一个group
		var node = view.selectAll("g.node")
			.data(nodes, function(d) {
				if(d.id) return d.id;
				_this.initId += 1;
				return(d.id = _this.initId);
			}); //data()：绑定一个数组到选择集上，数组的各项值分别与选择集的各元素绑定

		// Enter any new nodes at the parent's previous position.新增节点数据集，设置位置
		var nodeEnter = node.enter().append("g") //在 svg 中添加一个g，g是 svg 中的一个属性，是 group 的意思，它表示一组什么东西，如一组 lines ， rects ，circles 其实坐标轴就是由这些东西构成的。
			.attr("class", "node") //attr设置html属性，style设置css属性
			.classed("RULE", function(d) {
				return d.type == "RULE" ? true : false
			})
			.classed("TERMINAL", function(d) {
				return d.type == "TERMINAL" ? true : false
			})
			.attr("transform", function(d) {
				return "translate(" + source.y0 + "," + source.x0 + ")";
			})
			.attr("data-id", function(d) {
				return d.id
			})
			.attr("data-pid", function(d) {
				return d.parent ? d.parent.id : ""
			})
			.on("click", function(d) {
				//将某节点折叠的方法
				if(d.children) {
					d._children = d.children;
					d.children = null;
				} else {
					d.children = d._children;
					d._children = null;
				}
				_this.update(d);
			})
			.on("mouseover", lighterEdgesColor)
			.on("mouseout", unlighterEdgesColor)

		nodeEnter.append("rect")
			.attr("x", -nodeWidth / 2)
			.attr("y", -nodeHeight / 2)
			.attr("width", nodeWidth)
			.attr("height", nodeHeight)
			.attr("class", "node-rect")
			.style("fill", function(d) {
				return d.type == "RULE" ? "#124164" : "#f6f6f6";
			})
		//.attr("rx", 10)  //radius

		//添加标签
		nodeEnter.append("text")
			.attr("x", function(d) {
				return d.children || d._children ? 0 : 0;
			})
			.style('font-size', textSize + 'px')
			.attr("y", function(d) {
				var strs = formatterText(d.name || '', countInLine).split(',')
				return -strs.length * textSize / 2
				return strs.length <= 1 ? 0 : (-(strs.length - 1) * 5)
			})
			.attr("text-anchor", "middle")
			.style("fill", function(d) { //改成有子节点时是白色，无子节点是灰色
				//添加换行文字
				var strs = formatterText(d.name || '', countInLine).split(',')
				var _this = d3.select(this)
				d3.select(this).selectAll("tspan").remove();
				d3.select(this).selectAll("tspan")
					.data(strs)
					.enter()
					.append("tspan")
					.attr("x", _this.attr("x"))
					.attr("dy", "1em")
					.text(function(d) {
						return d;
					});
				return d.type == "RULE" ? "#fff" : "#333";
				return d.children || d._children ? "#333" : "#aaa";
			})
		//node就是保留的数据集，为原来数据的图形添加过渡动画。首先是整个组的位置
		var nodeUpdate = node.classed("RULE", function(d) {
				return d.type == "RULE" ? true : false
			})
			.attr("data-pid", function(d) {
				return d.parent ? d.parent.id : ""
			})
			.classed("TERMINAL", function(d) {
				return d.type == "TERMINAL" ? true : false
			})
			.on("mouseover", lighterEdgesColor)
			.on("mouseout", unlighterEdgesColor)
			.transition() //开始一个动画过渡
			.duration(duration) //过渡延迟时间,此处主要设置的是圆圈节点随斜线的过渡延迟
			.attr("transform", function(d) {
				return "translate(" + d.y + "," + d.x + ")";
			})

		nodeUpdate.select("rect")
			.attr("x", -nodeWidth / 2)
			.attr("y", -nodeHeight / 2)
			.attr("width", nodeWidth)
			.attr("height", nodeHeight)
			.style("fill", function(d) {
				return d.type == "RULE" ? "#124164" : "#f6f6f6"
			})
		nodeUpdate.select("text")
			.attr("x", function(d) {
				return d.children || d._children ? 0 : 0;
			})
			.style('font-size', textSize + 'px')
			.attr("y", function(d) {
				var strs = formatterText(d.name || '', countInLine).split(',')
				return -strs.length * textSize / 2
				return strs.length <= 1 ? 0 : (-(strs.length - 1) * 5)
			})
			.style("fill", function(d) { //改成有子节点时是白色，无子节点是灰色
				var strs = formatterText(d.name || '', countInLine).split(',')
				var _this = d3.select(this)
				d3.select(this).selectAll("tspan").remove(); //可能空节点加了新数据，需要重新添加文字
				d3.select(this).selectAll("tspan")
					.data(strs)
					.enter()
					.append("tspan")
					.attr("x", _this.attr("x"))
					.attr("dy", "1em")
					.text(function(d) {
						return d;
					});
				return d.type == "RULE" ? "#fff" : "#333";
				return d.children || d._children ? "#333" : "#aaa";
			});

		// Transition exiting nodes to the parent's new position.过渡现有的节点到父母的新位置。
		//最后处理消失的数据，添加消失动画
		var nodeExit = node.exit().transition()
			.duration(duration)
			.attr("transform", function(d) {
				return "translate(" + source.y + "," + source.x + ")";
			})
			.remove();

		nodeExit.select("rect")
			.attr("x", -nodeWidth / 2)
			.attr("y", -nodeHeight / 2)
			.attr("width", nodeWidth)
			.attr("height", nodeHeight)
			.style("fill", "#f6f6f6");

		nodeExit.select("text")
			.attr("text-anchor", "middle")
			.style("fill-opacity", 1e-6);

		// Update the links…线操作相关
		var link = view.selectAll("path.link")
			.data(links, function(d) {
				return d.target.id;
			});

		//添加新的连线
		link.enter().insert("path", "g")
			.classed("link", true)
			.attr("source-id", function(d) {
				return d.source.id
			})
			.attr("target-id", function(d) {
				return d.target.id
			})
			.attr("data-id", function(d) {
				return d.source.id + "_" + d.target.id
			})
			.attr("id", function(d) {
				return d.source.id + "_" + d.target.id
			})
			.attr("d", function(d) {
				//添加斜线上的文字
				view.append('text')
					.attr('data-id', function() {
						return d.source.id + "_" + d.target.id + "_text"
					})
					.attr('x', function() {
						var cy = Math.abs(d.target.y - d.source.y),
							cx = Math.abs(d.target.x - d.source.x);
						return Math.sqrt(Math.pow(cy, 2) + Math.pow(cx, 2)) / 2 - (nodeWidth / 2)
					})
					.style('fill', d.target.hitBranch ? '#999' : '#f60')
					.style('font-size', textSize + 'px')
					.style('transform', function() {
						var cy = Math.abs(d.target.y - d.source.y),
							cx = Math.abs(d.target.x - d.source.x);
						var cp = Math.sqrt(Math.pow(cy, 2) + Math.pow(cx, 2)) / 2 - (nodeWidth / 2)
						return d.target.hitBranch ? '' : 'translate(0,' + (textSize / 2 + cp * 0.15) + 'px)';
					})
					.append('textPath').attr({ //引用路径
						'xlink:href': '#' + d.source.id + "_" + d.target.id
					})
					.text(function() {
						return d.target.hitBranch ? 'YES' : 'NO';
					});
				var o = {
					x: source.x0,
					y: source.y0
				};
				//下面不返回的话无动画效果，直接显示连线
				return diagonal({
					source: o,
					target: o
				}); //diagonal - 生成一个二维贝塞尔连接器, 用于节点连接图.
			});
		//.attr('marker-end', 'url(#arrow)');//这个应该是箭头，没有#arrow的话IE中相当于出错无法显示出path

		// Transition links to their new position.将斜线过渡到新的位置  保留的连线添加过渡动画
		link.transition()
			.duration(duration)
			.attr("d", function(d) {
				//修改斜线上的文字位置
				view.select('[data-id="' + d.source.id + "_" + d.target.id + "_text" + '"]')
					.attr('x', function() {
						var cy = Math.abs(d.target.y - d.source.y),
							cx = Math.abs(d.target.x - d.source.x);
						return Math.sqrt(Math.pow(cy, 2) + Math.pow(cx, 2)) / 2 - (nodeWidth / 2)
					})
					.style('transform', function() {
						var cy = Math.abs(d.target.y - d.source.y),
							cx = Math.abs(d.target.x - d.source.x);
						var cp = Math.sqrt(Math.pow(cy, 2) + Math.pow(cx, 2)) / 2 - (nodeWidth / 2)
						return d.target.hitBranch ? '' : 'translate(0,' + (textSize / 2 + cp * 0.15) + 'px)';
					});
				return "M" + (d.source.y + nodeWidth / 2) + " " + d.source.x +
					" L" + (d.target.y - nodeWidth / 2) + " " + (d.target.x);

			});
		//过渡现有的斜线到父母的新位置。
		//消失的连线添加过渡动画
		link.exit().transition()
			.duration(10) //线消失的动画设短一点，否则难看
			.attr("d", function(d) {
				//删除对应的斜线文字元素
				view.select('[data-id="' + d.source.id + "_" + d.target.id + "_text" + '"]').remove();
				return "M" + (d.source.y + nodeWidth / 2) + " " + d.source.x +
					" L" + (d.target.y - nodeWidth / 2) + " " + (d.target.x);
			})
			.remove();

		// Stash the old positions for transition.将旧的斜线过渡效果隐藏,把旧位置存下来，用以过渡
		nodes.forEach(function(d) {
			d.x0 = d.x;
			d.y0 = d.y;
		});
		//重设画布的高度与宽度
		if(opt.fit)
			svg.attr("display", "block")
			.attr("width", "100%")
			.attr("height", "100%");
		else
			svg.attr("display", "block")
			.attr("height", Math.max(height, calcHeight) - 1 + "px")
			.attr("width", Math.max(width, calcWidth + gap + gap) + 'px');
	}

	//拖拽事件的调用方法，需要传入drop的event事件
	fn.todoNodeDrop = function(e) { //nodetarget为父节点dom元素
		var _this = this,
			opt = _this.options,
			container = opt.container,
			terminalDict = opt.terminalDict,
			beforeFormOpen = opt.beforeFormOpen;
		//被拖元素的数据
		var txt = e.originalEvent.dataTransfer.getData('text');
		if(!txt) return;
		try {
			var dragRule = JSON.parse(txt),
				targetNode = e.target.parentNode, //落点元素
				isEmptyNode = targetNode.classList.value == "node"; //只有node为空
			if(!(Tool.isObj(dragRule) && $(e.target).closest(container).length && isEmptyNode)) return;
			//获取掉落节点的数据
			var d = d3.select(targetNode).data()[0];
			if(!d) return layer.alert('节点不存在');
			if(dragRule.type == 'RULE') {
				if(_this.pathSameCheck(dragRule.ruleClass, d)) //true为有重复
					return layer.alert('该路径下已有相同规则，请重新选择');
				//新节点为空，规则数据需要带上id和attachData空对象
				if(Tool.isFunction(beforeFormOpen))
					beforeFormOpen($.extend(true, {
						id: d.id,
						attachData: {}
					}, dragRule));
				_this.editNode(d.id);
				//console.log("空节点" + d.id + "增加规则，打开编辑弹窗"); //编辑之后才会进行保存
			} else if(dragRule.type == 'TERMINAL') {
				var ruleTile = terminalDict[dragRule.ruleClass] || dragRule.ruleClass;
				d.name = ruleTile;
				d.type = "TERMINAL";
				d.nodeData = {
					type: "TERMINAL",
					ruleTitle: ruleTile,
					ruleClass: dragRule.ruleClass
				};
				_this.update(d);
				//console.log("空节点" + d.id + "增加风险等级", d.name);
			}
		} catch(err) {
			//获取拖拽元素的数据时会获取里面文字，解析成对象时会报错
			console.log(err);
		}
	}
	//检测添加的路径中节点规则是否有重复，true为有重复
	fn.pathSameCheck = function(ruleClass, d) {
		if(!d.parent) return false;
		if(d.parent && (ruleClass == d.parent.nodeData.ruleClass)) return true;
		return this.pathSameCheck(ruleClass, d.parent);
	}
	//删除节点方法
	fn.deleteD = function(d) {
		if(!d) return false;
		delete d.name;
		delete d.type;
		delete d.nodeData;
		delete d.children;
		delete d._children;
		this.update(d);
	}
	//弹窗确认后删除节点
	fn.deleteNode = function(id) {
		var _this = this;
		//询问框
		layer.confirm('确认删除该节点？', {
			btn: ['确认', '取消'] //按钮
		}, function() {
			var d = _this.view.select('.node[data-id="' + id + '"]').data()[0];
			if(!d) return layer.alert('节点不存在');
			_this.deleteD(d);
			layer.closeAll();
		}, function() {
			layer.closeAll();
		});
	}
	//打开弹窗编辑规则节点
	fn.editNode = function(id) {
		var _this = this,
			opt = _this.options;
		var d = _this.view.select('.node[data-id="' + id + '"]').data()[0];
		if(!d) return layer.alert('节点不存在');
		//console.log("编辑规则节点" + id, d.nodeData);
		if(d.nodeData) {
			d.nodeData.id = id;
			if(Tool.isFunction(opt.beforeFormOpen))
				opt.beforeFormOpen(d.nodeData); //执行表单参数修改事件,参数为节点数据
		}
		//改变layForm表单中的可选参数和值
		layer.open({
			type: 1,
			title: '编辑规则',
			closeBtn: 1,
			shadeClose: true,
			anim: 2,
			area: ['600px', 'auto'], //['500px','400px']一个字符串参数时为宽，数组时为宽高
			skin: 'lay-window',
			content: $(opt.editContainer)
		});
	}
	//保存弹窗中的规则节点数据
	fn.saveNode = function(saveData) {
		if(!saveData) return false;
		var d = this.view.select('.node[data-id="' + saveData.id + '"]').data()[0];
		if(!d) return layer.alert('节点不存在');
		d.nodeData = saveData;
		//下面是为了新增节点而添加的初始数据
		d.name = saveData.ruleTitle;
		d.type = "RULE";
		if(!(d.children || d._children))
			d.children = [{
				hitBranch: true
			}, {
				hitBranch: false
			}];
		this.update(d); //调用添加数据方法并重新渲染，必须要正确的数据结构
		layer.closeAll();
	}

	//渲染二叉树
	fn.render = function() {
		this.root = this.treeData[0];
		this.root.x0 = this.height / 2;
		this.root.y0 = 0;
		this.update(this.root);
	}
	//全局构造器
	win.D3BinaryTree = D3BinaryTree;

}(window, jQuery, document));
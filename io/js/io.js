/**
 * 全局性命名空间
 * @type {{FragmentSize: number}}
 */
var Args = {
	Readable: false,
	Writable: false,
	Deletable: false,
	Auditable: false
};
/**
 * 常量定义
 * @type {{FragmentSize: number}}
 */
Args.constants = {
	/**
	 * 文件分片上传时使用的分片尺寸
	 * @type {number}
	 */
	FragmentSize: 1024 * 512
};
Args.browser = (function() {
	var ua = navigator.userAgent.toLocaleLowerCase();
	var pf = navigator.platform.toLocaleLowerCase();
	var isAndroid = (/android/i).test(ua) || ((/iPhone|iPod|iPad/i).test(ua) && (/linux/i).test(pf)) || (/ucweb.*linux/i.test(ua));
	var isIOS = (/iPhone|iPod|iPad/i).test(ua) && !isAndroid;
	var isWinPhone = (/Windows Phone|ZuneWP7/i).test(ua);
	return {
		pc: !isAndroid && !isIOS && !isWinPhone,
		ios: isIOS,
		android: isAndroid,
		winPhone: isWinPhone
	};
})();
/**
 * parse location.search to Args
 */
Args.search = (function() {
	var result = {};
	var search = location.search;
	if(!search || search.length === 0) return result;
	search = search.substring(1);
	var pgs = search.split("&");
	for(var i in pgs) {
		var pg = pgs[i];
		var indexOf = pg.indexOf('=');
		if(indexOf > -1) {
			var key = pg.substring(0, indexOf);
			var value = pg.substring(indexOf + 1);
			result[key] = value;
		} else result[pg] = "";
	}
	return result;
})();
/**
 * 所有支持扩展名及其响应处理类型
 * @type {{bmp: boolean}}
 */
Args.exts = {
	"bmp": "image",
	"png": "image",
	"jpg": "image",
	"jpeg": "image",
	"gif": "image",
	//	"svg": "image",
	//	"psd": "image",
	//	"ai": "image",
	"pcx": "image",
	"tiff": "image",
	"tif": "image",
	"raw": "image",
};

/**
 * 判断是否支持该扩展名
 * @param ext
 * @returns {boolean}
 */
Args.isSupported = function(ext) {
	return ext.toLowerCase() in Args.exts;
};

/**
 * 判断扩展名是否为图片类型
 * @param ext
 * @returns {boolean}
 */
Args.isImage = function(ext) {
	return Args.exts[ext.toLowerCase()] === "image";
};

/**
 * 根据给定磁盘大小，用PB,TB,GB,MB,KB,B等单位进行表示
 * @param size
 * @returns {string}
 */
Args.sizeString = function(size) {
	var KB = 1024;
	var MB = KB * 1024;
	var GB = MB * 1024;
	var TB = GB * 1024;
	var PB = TB * 1024;
	var result = "";
	if(size > PB) {
		var pb = (size / PB).toFixed(2);
		return pb + "PB";
	}
	if(size > TB) {
		var tb = (size / TB).toFixed(2);
		return tb + "TB";
	}
	if(size > GB) {
		var gb = (size / GB).toFixed(2);
		return gb + "GB";
	}
	if(size > MB) {
		var mb = (size / MB).toFixed(2);
		return mb + "MB";
	}
	if(size > KB) {
		var kb = (size / KB).toFixed(2);
		return kb + "KB";
	}
	return size + "B";
};

/**
 * 将毫秒数格式化为HH:mm:ss
 * @param ms
 * @returns {string}
 */
Args.timeFormat = function(ms) {
	ms = parseInt(ms / 1000);
	var ss = ms % 60;
	if(ss < 10) ss = "0" + ss;
	var mm = ((ms - ss) / 60) % 60;
	if(mm < 10) mm = "0" + mm;
	var hh = (ms - mm * 60 - ss) / 3600;
	if(hh < 10) hh = "0" + hh;
	return hh + ":" + mm + ":" + ss;
};

/**
 * 异步读取文件/片段
 * @param options
 * @returns {*}
 */
Args.readBlob = function(options) {
	var data = options.data || {};
	var reader = new FileReader();
	reader.onabort = function(e) {
		if(options.abort) options.abort(e, data);
	};
	reader.onload = function(e) {
		if(options.load) options.load(e, data);
	};
	reader.onerror = function(e) {
		if(options.error) options.error(e, data);
	};
	reader.onloadstart = function(e) {
		if(options.loadstart) options.loadstart(e, data);
		if(options.start) options.start(e, data);
	};
	reader.onloadend = function(e) {
		if(options.loadend) options.loadend(e, data);
		if(options.end) options.end(e, data);
	};
	reader.onprogress = function(e) {
		if(options.progress) options.progress(e, data);
	};
	if(options.type === "url") reader.readAsDataURL(options.blob);
	else reader.readAsArrayBuffer(options.blob);
	return reader;
};

/**
 * 从指定目录加载所有文件
 * @param directory
 * @param callback
 * @param path
 * @returns {*}
 */
Args.loadDir = function(directory, callback, path) {
	var dirReader, errorHandler, readEntries;
	dirReader = directory.createReader();
	errorHandler = function(error) {};
	readEntries = (function(_this) {
		return function() {
			return dirReader.readEntries(function(entries) {
				var entry, j, len;
				if(entries.length > 0) {
					for(j = 0, len = entries.length; j < len; j++) {
						entry = entries[j];
						if(entry.isFile) {
							entry.file(function(file) {
								file.fullPath = path + "/" + file.name;
								callback(file);
							});
						} else if(entry.isDirectory) {
							Args.loadDir(entry, callback, path + "/" + entry.name);
						}
					}
				}
				return null;
			}, errorHandler);
		};
	})(this);
	return readEntries();
};
/**
 * 从浏览器拖拽对象中解析，并进一步挖掘分析文件
 * @param items
 * @param callback
 */
Args.loadItems = function(items, callback) {
	var entry;
	for(var i = 0; i < items.length; i++) {
		var item = items[i];
		if((item.webkitGetAsEntry !== null) && (entry = item.webkitGetAsEntry())) {
			if(entry.isFile) {
				callback(item.getAsFile());
			} else if(entry.isDirectory) {
				Args.loadDir(entry, callback, entry.name);
				//results.push(this._addFilesFromDirectory(entry, entry.name));
			} else {
				//results.push(void 0);
			}
		} else if(item.getAsFile !== null) {
			if((item.kind === null) || item.kind === "file") {
				callback(item.getAsFile());
			} else {
				//results.push(void 0);
			}
		} else {
			//results.push(void 0);
		}
	}
};

Args.itemValidate = function(item, mfile) {
	var data = item.data();
	if(!data.multiple) {
		if(mfile.size > data.maxSize) {
			// 文件大小超过上限
			return false;
		}
		return true;
	}

	var length = 1;
	var size = 0;
	$(".mfile", item).each(function() {
		size += $(this).data("mfile").size;
		length++;
	});

	if(length > data.maxNum) {
		// 文件个数超过上限
		return false;
	}

	if(size + mfile.size > data.totalSize) {
		// 文件总大小超过上限
		return false;
	}

	return true;
};

/**
 * 显示文件选择情况
 */
Args.showSelected = function() {
	var progress = Args.getProgress();
	$("#info_label").text(progress.size + "个文件,共计: " + Args.sizeString(progress.total));
};
/**
 * sha-256实现
 */
Args.sha256 = sha256;
//============================================
/**
 * 系统处理所需的全局变量,为避免命名空间冲突使用vars对象包装
 * @type {{AllFiles: {}, TotalCount: number, TotalSize: number, Uploaded: number}}
 */
Args.vars = {
	/**
	 * 所有文件按照hash聚合在此
	 * @type {{}}
	 */
	AllFiles: {},
	/**
	 * 当前选择文件个数
	 * @type {number}
	 */
	TotalCount: 0,
	/**
	 * 所有文件大小的总和
	 */
	TotalSize: 0,
	/**
	 * 当前已上传总数
	 * @type {number}
	 */
	Uploaded: 0
};

/**
 * 文件片段处理模块
 */
Args.Fragment = (function() {
	function MFragment(mfile, blob) {
		this.mfile = mfile;
		this.blob = blob;
		this.size = blob.size;
		this.hash = null;
		this.loaded = 0;
		this.uploaded = false;
	}

	/**
	 * 计算该切片hash值,hash值的结果会存入this.hash，同时二进制留也会通过LFile._updateHash传递给它的文件对象
	 * @private
	 */
	MFragment.prototype._hash = function() {
		Args.readBlob({
			blob: this.blob,
			data: this,
			load: function(e, frag) {
				var sha = Args.sha256.create();
				sha.update(e.target.result);
				frag.hash = sha.hex();
				frag.mfile.fragments[frag.hash] = frag;
				frag.mfile._updateHash(e.target.result);
				if(frag.next) frag.next._hash();
				else frag.mfile._digestHash();
			}
		});
	};
	return MFragment;
})();
/**
 * 本地文件和远程文件的父类,提供公共逻辑的实现
 */
Args.MFile = (function() {
	function MFile() {}

	MFile.prototype.isImage = function() {
		return Args.exts[this.ext.toLowerCase()] === "image";
	};

	MFile.prototype.appType = function() {
		var appType = Args.exts[this.ext.toLowerCase()];
		if(!appType) appType = "unknown";
		return appType;
	};
	/**
	 * 测底删除MFile
	 */
	MFile.prototype.remove = function() {
		this.item.remove();
		delete Args.vars.AllFiles[this.hash];
	};
	/**
	 * 选择文件,当提供selected,以布尔值表示是否选中,如果未提供selected则切换其选中状态
	 * @param selected
	 */
	MFile.prototype.select = function(selected) {
		if(!(this.allowRead || this.allowDelete)) return;
		if(selected === undefined) this.item.toggleClass("selected");
		else if(selected) this.item.addClass("selected");
		else this.item.removeClass("selected");
	};
	/**
	 * 创建MFile的UI
	 * @private
	 */
	MFile.prototype._createUI = function() {
		var mfile = this;
		this.item = $("<div class='mfile' draggable='true'>\n" +
			"                <div class='mfile-img-seat'><div class='mfile-img-con'>\n" +
			"                    <a class='mfile-img-con2' target='_blank'>" +
			// "                        <img class='mfile-img' draggable='false' src='" + this.url + "'/>\n" +
			"                        <img class='mfile-img' draggable='false' src=''/>\n" +
			"                    </a>" +
			"                        <img draggable='false' class='audit_accept' src='img/accept.png'/>" +
			"                        <img draggable='false' class='audit_refuse' src='img/refuse.png'/>" +
			"                </div></div>\n" +
			"                <div class='mfile-info'>\n" +
			"                    <div class='mfile-filename'>" + this.name + "</div>\n" +
			"                    <div class='mfile-size'>原文件大小：" + this.originalSize + "</div>\n" +
			"                </div>\n" +
			"                <div class='mfile-bar-con'>\n" +
			"                    <div class='mfile-bar'></div>\n" +
			"                </div>\n" +
			"                <div class='mfile-filename-bottom'>" + this.name + "</div>\n" +
			"                <a class='mfile-download disabled'  href='javascript:;'>\n" +
			"                    <img draggable='false' class='mfile-download-img' src='img/download.png'/>\n" +
			"                </a>\n" +
			"               <div class='mfile-delete'>\n" +
			"                    <img draggable='false' class='mfile-delete-img' src='img/trash.png'/>\n" +
			"                </div>\n" +
			"            </div>");
		if(this.allowRead) this.item.addClass("readable");
		if(this.allowWrite) this.item.addClass("writable");
		if(this.allowDelete) this.item.addClass("deletable");
		var that = this;
		//获取页面配置项并添加进度条和下载按钮
		var config = $.extend(true, {}, Args.getPageConfig(), {
			blob: that.file,
			progress: function(percent) {
				if(percent == 0) {
					that.item.find('.mfile-bar').css({
						'width': percent + '100%',
						'background-color': red
					});
					that.item.find('.mfile-download').remove();
				} else {
					that.item.find('.mfile-download').removeClass('disabled');
					that.item.find('.mfile-bar').css('width', percent + '%');
				}
			}
		});
		//压缩单个文件,带exif信息,返回时绑定文件换成已转换文件,加上原文件的完整路径,重新计算所有文件大小
		ImageOptim.optim(config, function(file) {
			file.fullPath = that.file.fullPath;
			Args.vars.TotalSize -= that.file.size;
			that.file = file;
			that.size = file.size;
			Args.vars.TotalSize += file.size;
			that.ssize = Args.sizeString(that.size);
			Args.showSelected();
			//将blob文件转成blob地址回显
			ImageOptim.ConvertFileOrBlobToBlobURL(file, function(url) {
				that.item.find('.mfile-size').append('，压缩后大小：' + Args.sizeString(that.size));
				that.item.find('.mfile-img').attr('src', url).parent().attr('href', url);
			});
		})
		this.item.data("mfile", this);
		if(this.auditStatus) this.item.addClass(this.auditStatus);
		this.item.addClass(this.type);
		//添加下载,调用ImageOptim中的单个文件下载方法
		$(".mfile-download", this.item).on('click', function() {
			if($(this).hasClass('disabled')) return false;
			ImageOptim.DownloadFile(mfile.file);
		});
		//删除单个
		$(".mfile-delete", this.item).click(function() {
			if($(this).parents("#right_panel").length > 0) {
				$("#left_panel").append(mfile.item);
				return;
			}
			if(mfile.type === "local") {
				Args.vars.TotalCount--;
				Args.vars.TotalSize -= mfile.size;
				Args.vars.Uploaded -= mfile.uploaded || 0;
			}
			mfile.remove();
			$(Args).trigger("remove", mfile);
			Args.clearSelectFile();
		});
		$(".mfile-filename-bottom", this.item).click(function() {
			mfile.select();
		});
		$(this.item).on({
			"dragstart": function(e, data) {
				var mfile = $(this).data("mfile");
				if(!mfile.allowDelete || $(".preview", this).length > 0) {
					e.preventDefault();
					return;
				}
				var lock = $(this).data("lock");
				if(lock) {
					e.preventDefault();
					return;
				}
				e.originalEvent.dataTransfer.setData("text", mfile.hash);
			}
		});
	};
	return MFile;
})();

/**
 * 本地文件包装器
 */
Args.LFile = (function() {
	function LFile(file, callback, progress) {
		this.type = "local";
		this._sha256 = Args.sha256.create();
		var that = this;
		that.originalSize = Args.sizeString(file.size);
		that.file = file;
		that.name = file.name;
		var indexOf = that.name.lastIndexOf('.');
		if(indexOf > 0) that.ext = that.name.substring(indexOf + 1);
		else that.ext = "";
		that.allowRead = true;
		that.allowWrite = true;
		that.allowDelete = true;
		that.size = file.size;
		that.ssize = Args.sizeString(that.size);
		that.loaded = 0;
		that.hash = null;
		that.hashName = null;
		that.fragments = {};
		that.callback = callback;
		that.progress = progress;
		that._doFragment();
	}

	/**
	 * 继承自MFile
	 */
	LFile.prototype = new Args.MFile();
	/**
	 * 内部私有函数，更新数据用以计算哈希
	 */
	LFile.prototype._updateHash = function(arrayBuffer) {
		this._sha256.update(arrayBuffer);
	};
	/**
	 * 内部私有函数，结束数据更新，生成哈希码
	 */
	LFile.prototype._digestHash = function() {
		this.hash = this._sha256.hex();
		this.hashName = this.hash + "." + this.ext;
		if(this.hash in Args.vars.AllFiles) return;
		else {
			Args.vars.TotalCount++;
			Args.vars.TotalSize += this.size;
			Args.vars.AllFiles[this.hash] = this;
		}
		if(Args.isImage(this.ext)) {
			Args.readBlob({
				blob: this.file,
				type: "url",
				data: this,
				load: function(e, mfile) {
					mfile.url = e.target.result;
					mfile._createUI();
					if(mfile.callback) mfile.callback(mfile);
				}
			});
		} else {
			if(Args.isSupported(this.ext)) this.url = "img/icon64/" + this.ext + ".png";
			else this.url = "img/icon64/unknown.png";
			this._createUI();
			if(this.callback) this.callback(this);
		}
	};
	/**
	 * 内部私有函数，计算SHA-256
	 */
	LFile.prototype._doFragment = function() {
		var less = this.size;
		var index = 0;
		var last;
		do {
			var len = Args.constants.FragmentSize > less ? less : Args.constants.FragmentSize;
			var blob = this.file.slice(index, index + len);
			var frag = new Args.Fragment(this, blob);
			index += len;
			less -= len;
			if(!this.first) {
				this.first = frag;
				last = frag;
			} else {
				last.next = frag;
				last = frag;
			}
		} while (less > 0);
		this.first._hash();
	};
	LFile.prototype.getImage = function() {
		var mfile = this;
		if(!mfile.img) mfile.img = mfile.icon;
		return mfile.img;
	};
	LFile.prototype.getEmbed = function() {
		var mfile = this;
		if(!this.embed) {
			this.embed = $("<embed >");
			Args.readBlob({
				blob: mfile.file,
				type: "url",
				data: this,
				load: function(e, mfile) {
					mfile.embed.attr("src", e.target.result);
				}
			});
		}
		return this.embed;
	};
	return LFile;
})();

/**
 * 加载文件
 * @param file
 */
Args.loadFile = function(file) {
	var indexOf = file.name.lastIndexOf('.');
	if(indexOf < 0) {
		console.log("Not support file: " + file.name);
		return;
	}
	var ext = file.name.substring(indexOf + 1);
	if(!Args.isSupported(ext)) {
		console.log("Not support file: " + file.name);
		return;
	}
	var mfile = new Args.LFile(file, function(mfile) {
		$(Args).trigger("add", mfile);
	});
};
/**
 * 加载多个文件
 */
Args.loadFiles = function(files) {
	if(files.length > 50) {
		alert("您选择的文件太多了，请分次选择，每次不要超过50个文件！");
		return;
	}
	for(var i = 0; i < files.length; i++) {
		var file = files[i];
		Args.loadFile(file);
	}
};
/**
 * 获取当前文件传输进度
 * @returns {{size: number, uploaded: number, total: number, percent: number}}
 */
Args.getProgress = function() {
	var percent = parseInt(10000 * Args.vars.Uploaded / Args.vars.TotalSize) / 100;
	return {
		size: Args.vars.TotalCount,
		uploaded: Args.vars.Uploaded,
		total: Args.vars.TotalSize,
		percent: percent
	}
};
/**
 * 根据哈希检索文件(包括远程和本地)
 * @param hash
 * @returns {*}
 */
Args.getMFile = function(hash) {
	return Args.vars.AllFiles[hash];
};
/**
 * 中止所有文件上传操作
 */
Args.abort = function() {
	for(var hash in Args.vars.AllFiles) {
		var mfile = Args.vars.AllFiles[hash];
		mfile.abort();
	}
};
/**
 * 监听自定义事件
 */
$(Args).on({
	add: function(e, mfile) {
		if(Args.LastDrop) {
			var last = Args.LastDrop;
			if(!Args.itemValidate($(last), mfile)) {
				$("#left_panel").append(mfile.item);
				return;
			}

			if(!$(Args.LastDrop).hasClass("multiple")) {
				Args.LastDrop = null;
				$("#left_panel").append($(".mfile", last));
			}
			$(last).append(mfile.item);
		} else $("#left_panel").append(mfile.item);
		Args.showSelected();
	},
	remove: function(e, mfile) {
		Args.showSelected();
	},
	progress: function(e, progress) {
		$("#progressbar-percent").css({
			width: progress.percent + "%"
		});
		if(progress.uploaded === progress.total) $("#progress-label").text("完成!");
		else $("#progress-label").text(progress.percent + "%    ");
	}
});

$(function() {
	/**
	 * File select modules;
	 * @type {*|jQuery|HTMLElement}
	 */
	var FileSelect = $('<input id="mcloud_select" name="mcloud_select" type="file" multiple="multiple" style="display:block;"/>');
	$(document).on({
		dragleave: function(e) { //拖离
			$(document.body).removeClass("dragging");
			e.preventDefault();
		},
		dragenter: function(e) { //拖进
			Args.LastDrop = null;
			$(document.body).addClass("dragging");
			e.preventDefault();
		},
		dragover: function(e) { //拖来拖去
			$(document.body).addClass("dragging");
			var orig = e.originalEvent;
			var oed = orig.dataTransfer;
			oed.dropEffect = "copy";
			e.preventDefault();
		},
		drop: function(e, data) {
			$(document.body).removeClass("dragging");
			e.preventDefault();
			var orig = e.originalEvent;
			var oed = orig.dataTransfer;
			var items = oed.items;
			if(items && items.length && (items[0].webkitGetAsEntry !== null)) Args.loadItems(oed.items, Args.loadFile);
			else Args.loadFiles(oed.files);
		}
	});
	FileSelect.on({
		change: function(e) {
			Args.loadFiles(e.target.files);
		}
	});
	Args.selectFile = function() {
		FileSelect.click();
	};
	Args.clearSelectFile = function() {
		FileSelect.val('')
	}
	/**
	 * 左侧清空按钮
	 */
	$("#left_clear").click(function() {
		$("#left_panel .mfile").each(function() {
			var mfile = $(this).data("mfile");
			mfile.remove();
			Args.vars.TotalCount--;
			Args.vars.TotalSize -= mfile.size;
			Args.vars.Uploaded -= mfile.uploaded || 0;
		});
		Args.showSelected();
		Args.clearSelectFile();
	});

	/**
	 * 左侧选择文件按钮
	 */
	$("#select_button").click(function() {
		Args.LastDrop = null;
		Args.selectFile();
	});
	/**
	 * 左侧候选文件容器拖拽事件
	 */
	$("#left_fieldset").on({
		"dragover": function(e) {
			$(this).addClass("dragover");
			e.preventDefault();
		},
		"dragleave": function(e) {
			$(this).removeClass("dragover");
			e.preventDefault();
		},
		"dragend": function(e) {
			e.preventDefault();
		},
		"drop": function(e) {
			$(this).removeClass("dragover");
			var hash = e.originalEvent.dataTransfer.getData("text");
			if(!hash) return;
			var mfile = Args.getMFile(hash);
			if(!mfile) return;
			$("#left_panel").append(mfile.item);
			e.preventDefault();
		}
	});
});

/**
 * 根据url参数设置页面中图片压缩配置项的默认值
 */
Args.loadPageConfig = function() {
	var initConfig = Args.search;
	$('input[name=width]').val(parseFloat(initConfig.width)),
		$('input[name=height]').val(parseFloat(initConfig.height)),
		$('input[name=quality]').val(parseFloat(initConfig.quality)),
		$('input[name=scale]').val(parseFloat(initConfig.scale));
};

/**
 * 获取页面中图片压缩配置项
 */
Args.getPageConfig = function() {
	var width = $('input[name=width]').val(),
		height = $('input[name=height]').val(),
		quality = $('input[name=quality]').val(),
		scale = $('input[name=scale]').val();
	return {
		maxWidth: width,
		maxHeight: height,
		quality: quality,
		scale: scale
	};
};
//格式化日期
Date.prototype.format = function(format) { //参数格式为："yyyy年MM月dd日" 或 "yyyy-MM-dd hh:mm:ss"
	var o = {
		"M+": this.getMonth() + 1, //month
		"d+": this.getDate(), //day
		"h+": this.getHours(), //hour
		"m+": this.getMinutes(), //minute
		"s+": this.getSeconds(), //second
		"q+": Math.floor((this.getMonth() + 3) / 3), //quarter
		"S": this.getMilliseconds() //millisecond
	}
	if(/(y+)/.test(format)) format = format.replace(RegExp.$1,
		(this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for(var k in o)
		if(new RegExp("(" + k + ")").test(format))
			format = format.replace(RegExp.$1,
				RegExp.$1.length == 1 ? o[k] :
				("00" + o[k]).substr(("" + o[k]).length));
	return format;
}
//添加入收藏夹,chrome不支持
function addFavorite() {
	var url = window.location;
	var title = document.title + '图片压缩工具';
	var ua = navigator.userAgent.toLowerCase();
	if(ua.indexOf("360se") > -1) {
		alert("由于360浏览器功能限制，请按 Ctrl+D 手动收藏！");
	} else if(ua.indexOf("msie 8") > -1) {
		window.external.AddToFavoritesBar(url, title); //IE8
	} else if(document.all) { //IE类浏览器
		try {
			window.external.addFavorite(url, title);
		} catch(e) {
			alert('您的浏览器不支持,请按 Ctrl+D 手动收藏!');
		}
	} else if(window.sidebar) { //firfox等浏览器；
		window.sidebar.addPanel(title, url, "");
	} else {
		alert('您的浏览器不支持,请按 Ctrl+D 手动收藏!');
	}
}

/**
 * 页面初始化
 */
$(function() {
	Args.loadPageConfig(); //取url参数填入表单配置项
	zip.workerScriptsPath = "./js/zip/";   //z-worker.js文件所在的文件夹,必须以页面为基准(应该写在页面中),否则会报错
	//打包下载压缩后的图片
	$("#zip-download:not('.disabled'):not(:disabled)").on('click', function() {
		if(Args.vars.TotalCount == 0) {
			$('.zip-download-tip').text('未选择文件').show();
			return false;
		}
		$('.zip-download-tip').text('').hide();
		//使用ZipArchive.js中的方法
		var z = new ZipArchive;
		for(var p in Args.vars.AllFiles) {
			var obj = Args.vars.AllFiles[p];
			//var mfile = obj.item.data("mfile");
			z.addFile(obj.file.fullPath || obj.file.name, obj.file);  
		}
		//生成压缩包的名称
		z.export("io_" + new Date().format('yyyyMMddhhmmss'));
	})
});
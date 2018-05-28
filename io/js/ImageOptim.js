(function(win, doc) {
	//兼容canvas转blob转换方法
	(function() {
		var CanvasPrototype = window.HTMLCanvasElement &&
			window.HTMLCanvasElement.prototype,
			hasBlobConstructor = window.Blob && (function() {
				try {
					return Boolean(new Blob());
				} catch(e) {
					return false;
				}
			}()),
			hasArrayBufferViewSupport = hasBlobConstructor && window.Uint8Array &&
			(function() {
				try {
					return new Blob([new Uint8Array(100)]).size === 100;
				} catch(e) {
					return false;
				}
			}()),
			BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
			window.MozBlobBuilder || window.MSBlobBuilder,
			dataURLtoBlob = (hasBlobConstructor || BlobBuilder) && window.atob &&
			window.ArrayBuffer && window.Uint8Array && function(dataURI) {
				var byteString,
					arrayBuffer,
					intArray,
					i,
					mimeString,
					bb;
				if(dataURI.split(",")[0].indexOf("base64") >= 0) {
					// Convert base64 to raw binary data held in a string:
					byteString = atob(dataURI.split(",")[1]);
				} else {
					// Convert base64/URLEncoded data component to raw binary data:
					byteString = decodeURIComponent(dataURI.split(",")[1]);
				}
				// Write the bytes of the string to an ArrayBuffer:
				arrayBuffer = new ArrayBuffer(byteString.length);
				intArray = new Uint8Array(arrayBuffer);
				for(i = 0; i < byteString.length; i += 1) {
					intArray[i] = byteString.charCodeAt(i);
				}
				// Separate out the mime component:
				mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
				// Write the ArrayBuffer (or ArrayBufferView) to a blob:
				if(hasBlobConstructor) {
					return new Blob(
						[hasArrayBufferViewSupport ? intArray : arrayBuffer], {
							type: mimeString
						}
					);
				}
				bb = new BlobBuilder();
				bb.append(arrayBuffer);
				return bb.getBlob(mimeString);
			};
		if(window.HTMLCanvasElement && !CanvasPrototype.toBlob) {
			if(CanvasPrototype.mozGetAsFile) {
				CanvasPrototype.toBlob = function(callback, type, quality) {
					if(quality && CanvasPrototype.toDataURL && dataURLtoBlob) {
						callback(dataURLtoBlob(this.toDataURL(type, quality)));
					} else {
						callback(this.mozGetAsFile("blob", type));
					}
				};
			} else if(CanvasPrototype.toDataURL && dataURLtoBlob) {
				CanvasPrototype.toBlob = function(callback, type, quality) {
					callback(dataURLtoBlob(this.toDataURL(type, quality)));
				};
			}
		}
	})();

	// 获取及保留EXIF信息的工具方法,只有JPEG、TIFF、RIFF、RAW等文件类型有EXIF信息
	var ImageTool = {
		/*
		 * @param rawImageArray{ArrayBuffer|Array|Blob}
		 */
		getSegments: function(rawImage, callback) {
			if(rawImage instanceof Blob) {
				var that = this;
				var fileReader = new FileReader();
				fileReader.onload = function() {
					that.getSegments(fileReader.result, callback);
				};
				fileReader.readAsArrayBuffer(rawImage);
			} else {
				if(!rawImage.length && !rawImage.byteLength) {
					return [];
				}
				var head = 0,
					segments = [];
				var length,
					endPoint,
					seg;
				var arr = [].slice.call(new Uint8Array(rawImage), 0);

				while(1) {
					if(arr[head] === 0xff && arr[head + 1] === 0xda) { //Start of Scan 0xff 0xda  SOS
						break;
					}

					if(arr[head] === 0xff && arr[head + 1] === 0xd8) { //Start of Image 0xff 0xd8  SOI
						head += 2;
					} else { //找到每个marker
						length = arr[head + 2] * 256 + arr[head + 3]; //每个marker 后 的两个字节为 该marker信息的长度
						endPoint = head + length + 2;
						seg = arr.slice(head, endPoint); //截取信息
						head = endPoint;
						segments.push(seg); //将每个marker + 信息 push 进去。
					}
					if(head > arr.length) {
						break;
					}
				}
				callback(segments);
			}
		},
		/*
		 * @param resizedImg{ArrayBuffer|Blob}
		 * @param exifArr{Array|Uint8Array}
		 */
		insertEXIF: function(resizedImg, exifArr, callback) {
			if(resizedImg instanceof Blob) {
				var that = this;
				var fileReader = new FileReader();
				fileReader.onload = function() {
					that.insertEXIF(fileReader.result, exifArr, callback);
				};
				fileReader.readAsArrayBuffer(resizedImg);
			} else {
				var arr = [].slice.call(new Uint8Array(resizedImg), 0);
				if(arr[2] !== 0xff || arr[3] !== 0xe0) {
					// throw new Error("Couldn't find APP0 marker from resized image data.");
					//return resizedImg; //不是标准的JPEG文件
					return callback(newImage)
				}

				var app0_length = arr[4] * 256 + arr[5]; //两个字节

				var newImage = [0xff, 0xd8].concat(exifArr, arr.slice(4 + app0_length)); //合并文件 SOI + EXIF + 去除APP0的图像信息

				callback(new Uint8Array(newImage));
			}
		},
		/*
		 * @param segments{Array|Uint8Array}
		 */
		getEXIF: function(segments) {
			if(!segments.length) {
				return [];
			}
			var seg = [];
			for(var x = 0; x < segments.length; x++) {
				var s = segments[x];
				//TODO segments
				if(s[0] === 0xff && s[1] === 0xe1) { // app1 exif 0xff 0xe1
					seg = seg.concat(s);
				}
			}
			return seg;
		},
		/*
		 *@param base64{String}
		 */
		decode64: function(base64) {
			var b64 = "data:image/jpeg;base64,";
			if(base64.slice(0, 23) !== b64) {
				return [];
			}
			var binStr = window.atob(base64.replace(b64, ""));
			var buf = new Uint8Array(binStr.length);
			for(var i = 0, len = binStr.length; i < len; i++) {
				buf[i] = binStr.charCodeAt(i);
			}
			return buf;
		},
		/*
		 *@param arr{Array}
		 */
		encode64: function(arr) {
			var data = "";
			for(var i = 0, len = arr.length; i < len; i++) {
				data += String.fromCharCode(arr[i]);
			}
			return "data:image/jpeg;base64," + window.btoa(data);
		},
		/**  
		 * 判断文件是否有EXIF信息 ,只有JPEG、TIFF、RIFF、RAW等文件类型有EXIF信息
		 * @param blob  
		 */
		hasEXIF: function(blob) {
			if(!blob instanceof Blob) return false;
			return blob.type.indexOf('jpeg') > -1 || blob.type.indexOf('tiff') > -1 || blob.type.indexOf('riff') > -1 || blob.type.indexOf('raw') > -1;
		},
		/**  
		 * 将以base64的图片url数据转换为Blob  
		 * @param urlData  
		 *            用url方式表示的base64图片数据  
		 */
		convertBase64UrlToBlob: function(urlData) {

			var bytes = window.atob(urlData.split(',')[1]); //去掉url的头，并转换为byte  
			var mime = urlData.split(',')[0].match(/:(.*?);/)[1];
			//处理异常,将ascii码小于0的转换为大于0  
			var ab = new ArrayBuffer(bytes.length);
			var ia = new Uint8Array(ab);
			for(var i = 0; i < bytes.length; i++) {
				ia[i] = bytes.charCodeAt(i);
			}

			return new Blob([ab], {
				type: mime || 'image/png'
			});
		},
		/**  
		 * File/Blob对象转DataURL（base64的图片url数据），可用于预览文件
		 * @param File/Blob 
		 */
		convertFileOrBlobToDataURL: function(obj, cb) {
			if(!obj instanceof Blob)
				throw Error("未传入File/Blob对象，无法转换");
			var a = new FileReader();
			a.readAsDataURL(obj);
			a.onload = function(e) {
				cb(e.target.result);
			};
		},
		/**  
		 * File/Blob对象转BlobURL，可用于预览文件
		 * @param File/Blob 
		 */
		convertFileOrBlobToBlobURL: function(obj, cb) {
			if(!obj instanceof Blob)
				throw Error("未传入File/Blob对象，无法转换");
			cb(window.URL ? window.URL.createObjectURL(obj) : window.webkitURL.createObjectURL(obj));
		}
	};
	var ImageOptim = function(obj) {
		if(obj instanceof ImageOptim) return obj;
		if(!(this instanceof ImageOptim)) return new ImageOptim(obj);
	};
	win.ImageOptim = ImageOptim;

	//默认配置项
	var config = {
		maxWidth: 1920,
		maxHeight: 1080,
		quality: 0.8,
		scale: 1
	}

	//转换压缩单个文件
	function todoConvertSingleImage(opt, callback) {
		// 最大尺寸限制
		var maxWidth = opt.maxWidth,
			maxHeight = opt.maxHeight,
			quality = opt.quality,
			scale = opt.scale,
			OBF = opt.blob,
			progress = opt.progress;

		//跑进度条，定时跑到最大98，完成后再执行100%
		var s = 0,
			t = undefined,
			needProgress = typeof progress == "function";
		if(needProgress) {
			t = setInterval(function() {
				if(s < 90) s += 5;
				else clearInterval(t);
				progress(s);
			}, 10);
		}

		//获取exif信息
		var exif = undefined;
		if(ImageTool.hasEXIF(OBF)) {
			ImageTool.getSegments(OBF, function(segments) {
				exif = ImageTool.getEXIF(segments);
			});
		}
		// 压缩图片需要的一些元素和对象
		var reader = new FileReader(),
			img = new Image();
		var filename = OBF.name;
		reader.readAsDataURL(OBF);

		// 缩放图片需要的canvas
		var canvas = document.createElement('canvas');
		var context = canvas.getContext('2d');

		// base64地址图片加载完毕后
		img.onload = function() {
			// 图片原始尺寸
			var originWidth = this.width;
			var originHeight = this.height;

			// 传入图片比例时，宽度按原始尺寸计算
			if(scale > 0) {
				originWidth = parseInt(originWidth * scale);
				originHeight = parseInt(originHeight * scale);
			}
			// 目标尺寸
			var targetWidth = originWidth,
				targetHeight = originHeight;

			// 图片尺寸超过最大尺寸限制
			if(originWidth > maxWidth || originHeight > maxHeight) {
				if(originWidth / originHeight > maxWidth / maxHeight) {
					// 更宽，按照宽度限定尺寸
					targetWidth = maxWidth;
					targetHeight = Math.round(maxWidth * (originHeight / originWidth));
				} else {
					targetHeight = maxHeight;
					targetWidth = Math.round(maxHeight * (originWidth / originHeight));
				}
			}
			// canvas对图片进行缩放
			canvas.width = targetWidth;
			canvas.height = targetHeight;

			// 清除画布
			context.clearRect(0, 0, targetWidth, targetHeight);
			// 图片压缩
			context.drawImage(img, 0, 0, targetWidth, targetHeight);
			// 图片比例
			//context.scale(scale,scale);//只是针对canvas显示，在转成base64时无效

			// canvas转成base64，第二个参数设置图片质量，用这个转换之后透明背景变成黑色了
			var data = canvas.toDataURL(OBF.type || 'image/png', quality);

			// 将base64转成blob
			var NBF = ImageTool.convertBase64UrlToBlob(data);
			if(!NBF) {
				if(needProgress) {
					clearInterval(t);
					progress(0);
				}
				return;
			}

			// 将Blob转换成File的方法，因为blob类型不能保留原文件名称
			function convertToFile(newImage) {
				var newFile = newImage;
				// 重新生成文件
				try {
					newFile = new File([newImage], OBF.name, {
						type: OBF.type || 'image/png'
					});
				} catch(e) {
					newFile.name = OBF.name;
					console.log('Error: 生成File文件时出错，' + e.message);
				}
				if(needProgress) {
					clearInterval(t);
					progress(100);
				}
				reader = canvas = context = img = data = OBF = NBF = undefined;
				// 执行页面回调方法，返回压缩后的文件
				callback(newFile);

			}

			// JPEG、TIFF、RIFF、RAW等文件类型成功获取到EXIF信息时保留EXIF信息，然后去将Blob转换成File
			if(exif) {
				ImageTool.insertEXIF(NBF, exif, function(newImage) {
					//newImage是一个Uint8Array类型的对象，可以用new File直接转换,但与NBF类型统一，因此要先进行转换
					newImage = ImageTool.convertBase64UrlToBlob(ImageTool.encode64(newImage));
					convertToFile(newImage);
				});
			} else {
				convertToFile(NBF);
			}
		}
		// 文件base64化，以便获知图片原始尺寸
		reader.onload = function(e) {
			img.src = e.target.result; //e.target.result就是图片的base64地址信息
		};
	}

	//下载单个文件
	ImageOptim.DownloadFile = function(file) {
		if(!(file && /image\/\w+/.test(file.type))) {
			throw Error('错误：ImageOptim.DownloadFile方法未传入图片文件');
		}
		if(navigator.msSaveBlob) {
			navigator.msSaveBlob(file, file.name);
			return;
		}

		var save_link = document.createElementNS(
			'http://www.w3.org/1999/xhtml', 'a');
		save_link.href = URL.createObjectURL(file);
		save_link.download = file.name;
		var event = document.createEvent('MouseEvents');
		event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0,
			false, false, false, false, 0, null);
		save_link.dispatchEvent(event);
	}

	//压缩转换单个文件
	ImageOptim.optim = function(options, callback) {
		if(Object.prototype.toString.call(options) !== "[object Object]" || !options.blob || !(options.blob instanceof Blob)) {
			throw Error('错误：ImageOptim.ConvertSingleImagey方法未传入blob文件');
		}
		if(Object.prototype.toString.call(callback) !== "[object Function]") {
			throw Error('错误：ImageOptim.ConvertSingleImagey方法没有回调处理方法');
		}
		var opt = {};
		opt.maxWidth = parseInt(options.maxWidth) > 0 ? parseInt(options.maxWidth) : config.maxWidth,
			opt.maxHeight = parseInt(options.maxHeight) > 0 ? parseInt(options.maxHeight) : config.maxHeight,
			opt.quality = parseFloat(options.quality) > 1 ? 1 : (parseFloat(options.quality) > 0 ? parseFloat(options.quality) : config.quality),
			opt.scale = parseFloat(options.scale) > 1 ? 1 : (parseFloat(options.scale) > 0 ? parseFloat(options.scale) : config.scale),
			opt.blob = options.blob;
		opt.progress = options.progress;
		// 执行压缩转换单个文件的实际方法
		todoConvertSingleImage(opt, function(NBF) {
			typeof callback === 'function' && callback(NBF);
		});
	}

	// 将base64转成blob
	ImageOptim.ConvertBase64UrlToBlob = ImageTool.convertBase64UrlToBlob;

	//将File或Blob文件转换成base64形式的url地址
	ImageOptim.ConvertFileOrBlobToDataURL = ImageTool.convertFileOrBlobToDataURL;

	//将File或Blob文件转换成BlobURL形式的url地址
	ImageOptim.ConvertFileOrBlobToBlobURL = ImageTool.convertFileOrBlobToBlobURL;

}(window, document));
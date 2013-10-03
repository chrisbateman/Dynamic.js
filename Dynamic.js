// This is a bit of a wreck right now. Don't look.
window.Dynamic = (function() {
	
	var _models = [];
	var _dynamicNodes = [];
	var _submittableElements = [];
	var _hideClass = 'dynamic-hide';
	
	
	/**
	 * Gets all elements with specified attribute
	 * Doesn't support 'for' attribute in ie7
	 * @private
	 * @param {String} node
	 * @param {String} attr
	 * @return {NodeList|Array} Matching nodes
	 */
	var _getElementsWithAttribute = function(node, attr) {
		if (node.querySelectorAll) {
			return node.querySelectorAll('[' + attr + ']');
		} else {
			var matchingNodes = [];
			var allNodes = node.getElementsByTagName('*');
			
			for (var i=0, iLen=allNodes.length; i<iLen; i++) {
				var thisNode = allNodes[i];
				if (thisNode.getAttribute(attr)) {
					matchingNodes.push(thisNode);
				}
			}
			return matchingNodes;
		}
	};
	
	/**
	 * Add an event listener
	 *
	 * @private
	 * @param {HTMLElement} node The node to add the listener to
	 * @param {String} evt Name of the event to listen for
	 * @param {Function} callback
	 */
	var _addEvent = function(node, evt, callback) {
		if (node.addEventListener) {
			node.addEventListener(evt, callback, false);
		} else if (node.attachEvent)  {
			node.attachEvent('on' + evt, callback);
		}
	};
	
	
	/**
	 * Delegated event listener for tags
	 *
	 * @private
	 * @Param {String} tag The type of element to listen for
	 * @param {String} evt Name of the event to listen for
	 * @param {Function} callback
	 * @param {HTMLElement} container Node to add the listener to
	 */
	var _addDelegateByTag = function(tag, evt, callback, container) {
		container = container || document.body;
		
		// Change events don't bubble in ie8-
		// Add listener to every tag instead (boo)
		if (evt === 'change' && !container.addEventListener) {
			var changeNodes = container.getElementsByTagName(tag);
			for (var i=0; i<changeNodes.length; i++) {
				_addEvent(changeNodes[i], evt, function(ev) {
					var target = ev.target || ev.srcElement;
					callback.apply(target);
				});
			}
			return;
		}
		
		_addEvent(container, evt, function(ev) {
			var target = ev.target || ev.srcElement;
			if (target.nodeName === tag.toUpperCase()) {
				callback.apply(target);
			}
		});
	};
	
	var _isVisible = function(node) {
		return node.offsetWidth > 0 && node.offsetHeight > 0;
	};
	
	
	var _getNodeValue = function(node) {
		if (node.type === 'checkbox' || node.type === 'radio') {
			return node.checked;
		}
		return node.value;
	};
	
	var _getRadioModelValue = function(radioModel) {
		for (var i=0, iLen=radioModel.node.length; i<iLen; i++) {
			var radio = radioModel.node[i];
			if (radio.checked) {
				return radio.value;
			}
		}
		return '';
	};
	
	var _initModel = function(node) {
		if (node.nodeName === 'INPUT' || node.nodeName === 'SELECT') {
			var modelName = node.getAttribute('data-model');
			
			if (node.type === 'radio') {
				if (_models[modelName]) {
					_models[modelName].node.push(node);
				} else {
					_models[modelName] = {
						node: [node],
						value: ''
					};
				}
				if (!node.getAttribute('name')) {
					node.setAttribute('name', modelName);
				}
				_models[modelName].value = _getRadioModelValue(_models[modelName]);
			} else {
				_models[modelName] = {
					node: node,
					value: _getNodeValue(node)
				};
			}
		} else {
			// garbage
		}
	};
	
	
	var _checkModel = function() {
		var modelName = this.getAttribute('data-model');
		
		if (modelName) {
			if (_models[modelName]) {
				var model = _models[modelName];
				var oldValue = model.value;
				
				if (this.type === 'radio') {
					model.value = _getRadioModelValue(model);
				} else {
					model.value = _getNodeValue(this);
				}
				
				if (model.value !== oldValue) {
					_applyRules();
				}
			} else {
				// create model?
			}
		}
	};
	
	var _applyRules = function() {
		var flattenedModels = _getFlattenedModels();
		var inputs = [];
		
		for (var i=0, iLen=_dynamicNodes.length; i<iLen; i++) {
			var node = _dynamicNodes[i];
			var parsedExpressionValue;
			var expr = node.getAttribute('data-show');
			
			with (flattenedModels) {
				parsedExpressionValue = eval(expr); // it's either this or a large expression parsing library
			}
			
			//node.style.display = (parsedExpressionValue) ? '' : 'none';
			if (parsedExpressionValue) {
				node.classList.remove(_hideClass);
			} else {
				node.classList.add(_hideClass);
			}
			
		}
		
		_checkSubmittableElements();
	};
	
	var _checkSubmittableElements = function() {
		for (var i=0, iLen=_submittableElements.length; i<iLen; i++) {
			var input = _submittableElements[i];
			if (_isVisible(input)) {
				input.removeAttribute('disabled');
			} else {
				input.setAttribute('disabled', 'disabled');
			}
		}
	}
	
	
	var _getFlattenedModels = function() {
		var flattened = [];
		for (var i in _models) {
			flattened[i] = _models[i].value;
		}
		return flattened;
	};
	
	
	var _getSubmittableElements = function(node) {
		var protoSlice = Array.prototype.slice;
		
		if (node.nodeName === 'INPUT' || node.nodeName === 'SELECT' || node.nodeName === 'TEXTAREA') {
			_submittableElements.push(node);
		} else {
			var inputs = protoSlice.call(node.getElementsByTagName('input'));
			var selects = protoSlice.call(node.getElementsByTagName('select'));
			var textareas = protoSlice.call(node.getElementsByTagName('textarea'));
			
			_submittableElements = _submittableElements.concat(inputs).concat(selects).concat(textareas);
		}
	};
	
	
	var _init = function() {
		var modelList = _getElementsWithAttribute(document, 'data-model');
		for (var i=0, iLen=modelList.length; i<iLen; i++) {
			_initModel(modelList[i]);
		}
		
		_dynamicNodes = [];
		var dynNodes = _getElementsWithAttribute(document, 'data-show');
		for (var i=0, iLen=dynNodes.length; i<iLen; i++) {
			var node = dynNodes[i];
			_dynamicNodes.push(node);
			_getSubmittableElements(node);
		}
		
		_applyRules();
	};
	
	
	
	(function initialize() {
		document.write('<style type="text/css">.'+_hideClass+'{display:none!important;}</style>');
		
		_init();
		
		_addDelegateByTag('input', 'click', _checkModel);
		_addDelegateByTag('input', 'change', _checkModel);
		_addDelegateByTag('input', 'keyup', _checkModel);
		_addDelegateByTag('select', 'change', _checkModel);
	})();
	
	
	return {
		_dynamicNodes: _dynamicNodes,
		_models: _models,
		reinit: _init
	};
	
})();

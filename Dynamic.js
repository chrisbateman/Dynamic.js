// This is a bit of a wreck right now. Don't look.
window.Dynamic = (function() {
	
	var _models = [];
	var _dynamicNodes = [];
	
	
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
	 * @return {Event} The event
	 */
	var _addEvent = function(node, evt, callback) {
		if (node.addEventListener) {
			return node.addEventListener(evt, callback, false);
		} else if (node.attachEvent)  {
			return node.attachEvent('on' + evt, callback);
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
	 * @return {Event} The added event
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
			return true;
		}
		
		return _addEvent(container, evt, function(ev) {
			var target = ev.target || ev.srcElement;
			if (target.nodeName === tag.toUpperCase()) {
				callback.apply(target);
			}
		});
	};
	
	var _getNodeValue = function(node) {
		if (node.type === 'checkbox' || node.type === 'radio') {
			return node.checked;
		}
		return node.value;
	};
	
	var _getRadioValue = function(radioModel) {
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
				_models[modelName].value = _getRadioValue(_models[modelName]);
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
		var model = this.getAttribute('data-model');
		
		if (model) {
			if (_models[model]) {
				if (this.type === 'radio') {
					_models[model].value = _getRadioValue(_models[model]);
				} else {
					_models[model].value = _getNodeValue(this);
				}
			} else {
				// create model?
			}
			_applyRules();
		}
	};
	
	var _applyRules = function() {
		for (var i=0, iLen=_dynamicNodes.length; i<iLen; i++) {
			var node = _dynamicNodes[i];
			var val;
			var expr = node.getAttribute('data-show');
			
			var flattenedModels = _getFlattenedModels();
			with (flattenedModels) {
				val = eval(expr); // it's either this or a large expression parsing library
			}
			
			node.style.display = (val) ? '' : 'none';
		}
	};
	
	var _getFlattenedModels = function() {
		var flattened = [];
		for (var i in _models) {
			flattened[i] = _models[i].value;
		}
		return flattened;
	};
	
	
	
	(function init() {
		var modelList = _getElementsWithAttribute(document, 'data-model');
		for (var i=0, iLen=modelList.length; i<iLen; i++) {
			_initModel(modelList[i]);
		}
		
		_dynamicNodes = _getElementsWithAttribute(document, 'data-show');
		
		_addDelegateByTag('input', 'click', _checkModel);
		_addDelegateByTag('input', 'change', _checkModel);
		_addDelegateByTag('input', 'keyup', _checkModel);
		_addDelegateByTag('select', 'change', _checkModel);
		
		
		_applyRules();
	})();
	
	
	return {
		_models: _models
	};
	
})();

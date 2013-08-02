// This is a bit of a wreck right now. Don't look.
window.Dyn = (function() {
	
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
	 * @param {HTMLElement} container Node to add the listener to
	 * @param {String} evt Name of the event to listen for
	 * @param {Function} callback
	 * @Param {String} tag The type of element to listen for
	 * @return {Event} The added event
	 */
	var _addDelegateByTag = function(container, evt, callback, tag) {
		// Change events don't bubble in ie8-
		if (evt === 'change' && !container.addEventListener) {
			var changeNodes = container.getElementsByTagName(tag);
			for (var i=0; i<changeNodes.length; i++) {
				this.addEvent(changeNodes[i], evt, callback);
			}
			return true;
		}
		
		return this.addEvent(container, evt, function(ev) {
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
		for (var i=0, iLen=radioModel.length; i<iLen; i++) {
			var radio = radioModel.node[i];
			if (radio.checked) {
				return radio.value;
			}
		}
		return '';
	};
	
	var _initModel = function(node) {
		if (node.modelName === 'INPUT' || node.nodeName === 'TEXTAREA' || node.nodeName === 'SELECT') {
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
			
			
			//var tokens = _tokenize(node.getAttribute('data-show'));
			//val = _evalTokens(tokens);
			
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
	
	
	var _tokenize = function(expr) {
		//var groupSplitRegex = /&&|\|\|)/;
		var splitRegex = /(==|!=|<|>|!)/;
		
		//var tokenGroups = expr.split(groupSplitRegex);
		
		var tokens = expr.split(splitRegex);
		
		for (var i=0, iLen=tokens.length; i<iLen; i++) {
			var token = tokens[i];
			if (token === '') {
				tokens.splice(i, 1);
			}
		}
		return tokens;
	};
	
	var _evalTokens = function(tokens) {
		switch(tokens.length) {
			case 1:
				return _models[tokens[0]].value;
			case 2:
				if (tokens[0] === '!') {
					return !_models[tokens[1]].value;
				}
				break;
			case 3:
				tokens[2] = tokens[2].replace(/\'/g, '');
				
				if (tokens[1] === '==') {
					return _models[tokens[0]].value === tokens[2];
				} else if (tokens[2] === '!=') {
					return _models[tokens[0]].value !== tokens[2];
				}
				break;
		}
	};
	
	
	(function init() {
		var modelList = _getElementsWithAttribute(document, 'data-model');
		for (var i=0, iLen=modelList.length; i<iLen; i++) {
			_initModel(modelList[i]);
		}
		
		_dynamicNodes = _getElementsWithAttribute(document, 'data-show');
		
		_addDelegateByTag(document.body, 'click', _checkModel, 'input');
		_addDelegateByTag(document.body, 'change', _checkModel, 'select');
		
		_applyRules();
	})();
	
	
	return {
		_models: _models
	};
	
})();

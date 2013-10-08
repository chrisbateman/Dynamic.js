// This is a bit of a wreck right now. Don't look.
window.Dynamic = (function() {
	
	var _models = [];
	var _dynamicElements = [];
	var _submittableElements = [];
	var _hideClass = 'dynamic-hide';
	
	
	/**
	 * Gets all elements with specified attribute
	 * Doesn't support 'for' attribute in ie7
	 * @private
	 * @param {Element} el
	 * @param {String} attr
	 * @return {NodeList|Array} Matching nodes
	 */
	var _getElementsWithAttribute = function(el, attr) {
		if (el.querySelectorAll) {
			return el.querySelectorAll('[' + attr + ']');
		} else {
			var matchingNodes = [];
			var allNodes = el.getElementsByTagName('*');
			
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
	 * @param {Element} el The element to add the listener to
	 * @param {String} evt Name of the event to listen for
	 * @param {Function} callback
	 */
	var _addEvent = function(el, evt, callback) {
		if (el.addEventListener) {
			el.addEventListener(evt, callback, false);
		} else if (el.attachEvent)  {
			el.attachEvent('on' + evt, callback);
		}
	};
	
	
	/**
	 * Delegated event listener for tags
	 *
	 * @private
	 * @Param {String} tag The type of element to listen for
	 * @param {String} evt Name of the event to listen for
	 * @param {Function} callback
	 * @param {Element} container Element to add the listener to
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
	
	
	/**
	 * Determines whether an element is currently visible
	 * @param  {Element} el
	 * @return {Boolean}
	 */
	var _isVisible = function(el) {
		return el.offsetWidth > 0 && el.offsetHeight > 0;
	};
	
	
	/**
	 * Return's an input's current value
	 * @param  {Element} el
	 * @return {Boolean|String}
	 */
	var _getInputValue = function(el) {
		if (el.type === 'checkbox' || el.type === 'radio') {
			return el.checked;
		}
		return el.value;
	};
	
	
	/**
	 * Returns the current value for a set of radios
	 * @param  {Object} radioModel
	 * @return {String}
	 */
	var _getRadioModelValue = function(radioModel) {
		for (var i=0, iLen=radioModel.element.length; i<iLen; i++) {
			var radio = radioModel.element[i];
			if (radio.checked) {
				return radio.value;
			}
		}
		return '';
	};
	
	
	/**
	 * Creates a model for the given input and adds it to _models
	 * @param  {Element} el
	 */
	var _initModel = function(el) {
		if (el.nodeName === 'INPUT' || el.nodeName === 'SELECT') {
			var modelName = el.getAttribute('data-model');
			
			if (el.type === 'radio') {
				if (_models[modelName]) {
					_models[modelName].element.push(el);
				} else {
					_models[modelName] = {
						element: [el],
						value: ''
					};
				}
				if (!el.getAttribute('name')) {
					el.setAttribute('name', modelName);
				}
				_models[modelName].value = _getRadioModelValue(_models[modelName]);
			} else {
				_models[modelName] = {
					element: el,
					value: _getInputValue(el)
				};
			}
		} else {
			// garbage
		}
	};
	
	
	/**
	 * Checks whether an input has changed - if so, run the rules
	 * @this {Element} The input in question
	 */
	var _checkModel = function() {
		var modelName = this.getAttribute('data-model');
		
		if (modelName) {
			if (_models[modelName]) {
				var model = _models[modelName];
				var oldValue = model.value;
				
				if (this.type === 'radio') {
					model.value = _getRadioModelValue(model);
				} else {
					model.value = _getInputValue(this);
				}
				
				if (model.value !== oldValue) {
					_applyRules();
				}
			} else {
				// create model?
			}
		}
	};
	
	
	/**
	 * Loops through each dynamic element and evaluates its rules against the current models and hides/shows
	 */
	var _applyRules = function() {
		var flattenedModels = _getFlattenedModels();
		
		for (var i=0, iLen=_dynamicElements.length; i<iLen; i++) {
			var el = _dynamicElements[i];
			var expr = el.getAttribute('data-show');
			var parsedExpressionValue;
			
			with (flattenedModels) {
				parsedExpressionValue = eval(expr); // it's either this or a large expression parsing library
			}
			
			if (parsedExpressionValue) {
				el.classList.remove(_hideClass);
			} else {
				el.classList.add(_hideClass);
			}
		}
		
		_setSubmittableElements();
	};
	
	
	/**
	 * Loops through submittable elements and disables/enables based on visibility
	 */
	var _setSubmittableElements = function() {
		for (var i=0, iLen=_submittableElements.length; i<iLen; i++) {
			var input = _submittableElements[i];
			if (_isVisible(input)) {
				input.removeAttribute('disabled');
			} else {
				input.setAttribute('disabled', 'disabled');
			}
		}
	};
	
	
	/**
	 * Returns a flattened array of models (basically replaces each model with the model's value)
	 * @return {Array}
	 */
	var _getFlattenedModels = function() {
		var flattened = [];
		for (var i in _models) {
			flattened[i] = _models[i].value;
		}
		return flattened;
	};
	
	
	/**
	 * Retrives all inputs that might be submitted as part of a form, and adds to _submittableElements
	 * @param  {Element} el The root element. If this is a submittable element, it will be added
	 */
	var _getSubmittableElements = function(el) {
		var protoSlice = Array.prototype.slice;
		
		if (el.nodeName === 'INPUT' || el.nodeName === 'SELECT' || el.nodeName === 'TEXTAREA') {
			_submittableElements.push(el);
		} else {
			var inputs = protoSlice.call(el.getElementsByTagName('input'));
			var selects = protoSlice.call(el.getElementsByTagName('select'));
			var textareas = protoSlice.call(el.getElementsByTagName('textarea'));
			
			_submittableElements = _submittableElements.concat(inputs).concat(selects).concat(textareas);
		}
	};
	
	
	/**
	 * Retrives and initializes all models and dynamic elements.
	 * @public
	 */
	var _init = function() {
		var modelList = _getElementsWithAttribute(document, 'data-model');
		for (var i=0, iLen=modelList.length; i<iLen; i++) {
			_initModel(modelList[i]);
		}
		
		_dynamicElements = [];
		var dynEls = _getElementsWithAttribute(document, 'data-show');
		for (var i=0, iLen=dynEls.length; i<iLen; i++) {
			var el = dynEls[i];
			_dynamicElements.push(el);
			_getSubmittableElements(el);
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
		_dynamicElements: _dynamicElements,
		_models: _models,
		reinit: _init
	};
	
})();

// This is a bit of a wreck right now. Don't look.
window.Dynamic = (function() {
	
	var _models = [];
	var _dynamicElements = [];
	var _submittableElements = [];
	var _hideClass = 'dynamic-hide';
	
	
	/**
	 * Wrapper/polyfill for querySelectorAll
	 * @see http://www.codecouch.com/2012/05/adding-document-queryselectorall-support-to-ie-7/
	 * 
	 * @param {String} selector
	 * @param {HTMLElement} [node]
	 * @return {NodeList|Array}
	 */
	var _qsa = function(selector1, node1) {
		alert('test');
		if (document.querySelectorAll) {
			_qsa = function(selector, node) {
				node = node || document;
				return node.querySelectorAll(selector);
			};
		} else {
			var style = document.createStyleSheet();

			_qsa = function(selector, node) {
				node = node || document;
				var rs = [];
				var selectors = selector.replace(/\[for\b/gi, '[htmlFor').split(',');
				var all = (node === document) ? node.all : node.getElementsByTagName('*');

				for (var iSel=selectors.length; iSel--;) {
					style.addRule(selectors[iSel], 'foo:bar');
					for (var iAll=all.length; iAll--;) {
						if (all[iAll].currentStyle.foo) {
							rs.push(all[iAll]);
						}
					}
					style.removeRule(0);
				}
				return rs;
			};
		}

		return _qsa(selector1, node1);
	};
	
	
	/**
	* Determines whether a DOM element has the given className
	* @see http://yuilibrary.com/yui/docs/api/files/dom_js_dom-class.js.html
	* @param {Element} el The DOM element. 
	* @param {String} className The class name to search for
	* @return {Boolean} Whether or not the element has the given class. 
	*/
	var _hasClass = function(el, className) {
		var re = new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)');
		return re.test(el.className);
	};
	
	/**
	 * Adds a class name to a given DOM element
	 * @see http://yuilibrary.com/yui/docs/api/files/dom_js_dom-class.js.html
	 * @param {Element} el
	 * @param {String} className The class name to add to the class attribute
	 */
	var _addClass = function(el, className) {
		if (!_hasClass(el, className)) { // skip if already present 
			el.className = _trim([el.className, className].join(' '));
		}
	};
	
	/**
	 * Removes a class name from a given element
	 * @see http://yuilibrary.com/yui/docs/api/files/dom_js_dom-class.js.html
	 * @param {Element} el The DOM element. 
	 * @param {String} className The class name to remove from the class attribute
	 */
	var _removeClass = function(el, className) {
		if (className && _hasClass(el, className)) {
			el.className = _trim(el.className.replace(new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)'), ' '));
			
			if (_hasClass(el, className) ) { // in case of multiple adjacent
				this.removeClass(el, className);
			}
		}
	};
	
	
	/**
	 * Fallback for String.trim()
	 * IE 8-
	 * @param {String} str
	 * @return {String} Trimmed string
	 */
	var _trim = function(str) {
		if (str.trim) {
			return str.trim();
		} else {
			return str.replace(/^\s+|\s+$/g,'');
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
	 * @param {Element} [container] Element to add the listener to
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
		if (el.nodeName === 'INPUT' || el.nodeName === 'SELECT' || el.nodeName === 'TEXTAREA') {
			var modelName = el.getAttribute('data-model') || el.getAttribute('name');
			
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
		var modelName = this.getAttribute('data-model') || this.getAttribute('name');
		
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
				_removeClass(el, _hideClass);
			} else {
				_addClass(el, _hideClass);
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
		if (el.nodeName === 'INPUT' || el.nodeName === 'SELECT' || el.nodeName === 'TEXTAREA') {
			_submittableElements.push(el);
		} else {
			var childInputs = _qsa('input, select, textarea', el);
			// .concat() doesn't work for NodeLists :(
			for (var i=0, iLen=childInputs.length; i<iLen; i++) {
				_submittableElements.push(childInputs[i]);
			}
		}
	};
	
	
	/**
	 * Retrives and initializes all models and dynamic elements.
	 * @public
	 */
	var _init = function() {
		var modelList = _qsa('[data-model]');
		for (var i=0, iLen=modelList.length; i<iLen; i++) {
			_initModel(modelList[i]);
		}
		
		_dynamicElements = [];
		_submittableElements = [];
		var dynEls = _qsa('[data-show]');
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
		_addDelegateByTag('textarea', 'change', _checkModel);
		_addDelegateByTag('textarea', 'keyup', _checkModel);
		_addDelegateByTag('select', 'change', _checkModel);
	})();
	
	
	return {
		_dynamicElements: _dynamicElements,
		_models: _models,
		_submittable: _submittableElements,
		init: _init
	};
	
})();
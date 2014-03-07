'use strict';

var expect = require('expect.js'),
	WebDriver = require('../lib').WebDriver,
	WebElement = require('../lib').WebElement,
	errors = require('../lib').errors;

var driverParams = {
	host: '127.0.0.1',
	port: 4444,
	desiredCapabilities: {
		acceptSslCerts: true,
		browserName: 'chrome'
	}
};

function getFixturePath(name) {
	return 'file://' + __dirname + '/fixtures/' + name;
}

function expectAndDone(assert, done) {
	return function (err, value) {
		if (err) return done(err);
		assert(value);
		done();
	}
}

// expect that callback returns instance of WebDriver and done the test
function expectForDriverAndDone(done) {
	return expectAndDone(function(value) {
		expect(value).to.be.a(WebDriver);
	}, done);
}

function expectForElementAndDone(element, done) {
	return expectAndDone(function(value) {
		expect(value).equal(element);
	}, done);
}

function expectWebElement(element) {
	expect(element).to.be.a(WebElement);
	expect(Number(element.id)).to.be.a('number');
	expect(element.driver).to.be.a(WebDriver);
}

var driver = null;

function elementCommand(id, action, after, callback) {
	setTimeout(function() {
		var cmd = null,
			el = 'var el = document.getElementById("' + id + '");';
		if (action === 'show') {
			//HARDCODE: display block
			cmd = el + 'el.style.display="block";';
		} else if (action === 'hide') {
			cmd = el + 'el.style.display="none";';
		} else if (action === 'remove') {
			cmd = el + 'el.parentNode.removeChild(el);';
		} else {
			callback(new Error('Unknown action: ' + action));
		}
		driver.execute(cmd, [], false, callback || function() {});
	}, after || 0);		
}

function itElementCommand(id, action, after) {
	it(action +' ' + id, function(done) {
		elementCommand(id, action, after, done);
	});
}

describe('webdriver', function() {
	this.timeout(10000);

	it('init without errors', function(done) {
		driver = new WebDriver(driverParams);
		driver.init(expectForDriverAndDone(done));
	});

	it('delete cookie', function(done) {
		driver.deleteCookie(expectForDriverAndDone(done));
	});

	it('refresh current page', function(done) {
		driver.refresh(expectForDriverAndDone(done));
	});

	it('maximize window', function(done) {
		driver.maximizeWindow(expectForDriverAndDone(done));
	});

	it('navigate to fixture page', function(done) {
		driver.setUrl(getFixturePath('github/index.html'), expectForDriverAndDone(done));
	});

	it('return current page url', function(done) {
		driver.getUrl(function(err, url) {
			if (err) return done(err);
			expect(url).equal(getFixturePath('github/index.html'));
			done();
		});
	});

	it('return current page title', function(done) {
		driver.getTitle(function(err, title) {
			if (err) return done(err);
			expect(title).equal('GitHub · Build software better, together.');
			done();
		});
	});

	it('set timeout', function(done) {
		driver.setTimeout('script', 500, done);
	});

	it('get timeout', function(done) {
		expect(driver.getTimeout('script')).equal(500);
		done();
	});

	it('execute sync js on page', function(done) {
		driver.execute(
			'var a = arguments[0];' +
			'var b = arguments[1];' +
			'return a + b;',
			[1, 3],
			false,
			function(err, result) {
				if (err) done(err);
				expect(result).equal(4);
				done();
			}
		);
	});

	it('execute async js on page', function(done) {
		driver.execute(
			'var a = arguments[0];' +
			'var b = arguments[1];' +
			'var callback = arguments[2];' +
			'setTimeout(function() {' +
				'callback(a + b);' +
			'}, 100);',
			[1, 3],
			true,
			function(err, result) {
				if (err) done(err);
				expect(result).equal(4);
				done();
			}
		);
	});

	it('wait for document ready (jquery)', function(done) {
		driver.waitForDocumentReady(expectForDriverAndDone(done));
	});

	var jqueryFirstForm = null;
	it('get first form using jquery', function(done) {
		driver.get('form:first', {using: 'jquery'}, function(err, element) {
			if (err) return done(err);
			expectWebElement(element);
			jqueryFirstForm = element;
			done();
		});
	});

	it('first form is search form (identified by id)', function(done) {
		jqueryFirstForm.getAttr('id', function(err, value) {
			if (err) return done(err);
			expect(value).equal('top_search_form');
			done();
		});
	});

	it('get same for using jquery methods chaining', function(done) {
		driver.get('#js-command-bar-field', {using: 'jquery', chain: [
			{next: ''},
			{closest: 'form'}
		]}, function(err, element) {
			if (err) return done(err);
			expectWebElement(element);
			jqueryFirstForm = element;
			done();
		});
	});

	it(
		'return null and no error when get non-existing element using ' +
		'custom strategy with noError: true',
		function(done) {
			driver.get('[name="non-existing"]', {
				using: 'jquery',
				noError: true
			}, function(err, element) {
				expect(err).not.to.be.ok(err);
				expect(element).to.be(null);
				done();
			});
		}
	);

	it('check form by id', function(done) {
		jqueryFirstForm.getAttr('id', function(err, value) {
			if (err) return done(err);
			expect(value).equal('top_search_form');
			done();
		});
	});

	it('get element using css selector', function(done) {
		driver.get('[name="user[login]"]', function(err, element) {
			if (err) return done(err);
			expectWebElement(element);
			done();
		});
	});

	it('get non-existing element return error', function(done) {
		driver.get('[name="non-existing"]', function(err) {
			expect(err).to.be.a(errors.NoSuchElementError);
			done();
		});
	});

	it(
		'return null and no error when get non-existing element using ' +
		'built-in strategy with noError: true',
		function(done) {
			driver.get('[name="non-existing"]', {
				using: 'css selector',
				noError: true
			}, function(err, element) {
				expect(err).not.to.be.ok(err);
				expect(element).to.be(null);
				done();
			});
		}
	);

	it('get elements using selector', function(done) {
		driver.getList('.textfield', function(err, elements) {
			if (err) return done(err);
			expect(elements.length).greaterThan(1);
			elements.forEach(expectWebElement);
			done();
		});
	});

	it('get non-existing elements return empty array', function(done) {
		driver.getList('.non-existing-textfield', function(err, elements) {
			if (err) return done(err);
			expect(elements).length(0);
			done();
		});
	});

	var formElement = null;
	it('get form element', function(done) {
		driver.get('.js-form-signup-home', function(err, element) {
			if (err) return done(err);
			expectWebElement(element);
			formElement = element;
			done();
		});
	});

	it('get child element of form', function(done) {
		formElement.get('[name="user[login]"]', function(err, element) {
			if (err) return done(err);
			expectWebElement(element);
			done();
		});
	});

	it('get children elements of form', function(done) {
		formElement.getList('.textfield', function(err, elements) {
			if (err) return done(err);
			expect(elements.length).greaterThan(1);
			elements.forEach(expectWebElement);
			done();
		});
	});

	it('form element is displayed', function(done) {
		formElement.isDisplayed(function(err, isDisplayed) {
			if (err) return done(err);
			expect(isDisplayed).to.be.a('boolean');
			expect(isDisplayed).equal(true);
			done();
		});
	});

	var loginElement = null;
	it('get login element', function(done) {
		driver.get('[name="user[login]"]', function(err, element) {
			if (err) return done(err);
			expectWebElement(element);
			loginElement = element;
			done();
		});
	});

	it('get placeholder attribute for login element', function(done) {
		loginElement.getAttr('placeholder', function(err, placeholder) {
			if (err) return done(err);
			expect(placeholder).equal('Pick a username');
			done();
		});
	});

	it('get tag name of login element', function(done) {
		loginElement.getTagName(function(err, name) {
			if (err) return done(err);
			expect(name).equal('input');
			done();
		});
	});

	it('enter login', function(done) {
		loginElement.sendKeys('patrik', expectForElementAndDone(loginElement, done));
	});

	it('get entered login', function(done) {
		loginElement.getValue(function(err, login) {
			if (err) return done(err);
			expect(login).equal('patrik');
			done();
		});
	});

	it('clear login field', function(done) {
		loginElement.clear(expectForElementAndDone(loginElement, done));
	});

	it('get cleared login', function(done) {
		loginElement.getValue(function(err, login) {
			if (err) return done(err);
			expect(login).equal('');
			done();
		});
	});

	var searchFormElement = null;
	it('get search form element', function(done) {
		driver.get('#top_search_form', function(err, element) {
			if (err) return done(err);
			expectWebElement(element);
			searchFormElement = element;
			done();
		});
	});

	var searchInputElement = null;
	it('get search input element', function(done) {
		driver.get('#js-command-bar-field', function(err, element) {
			if (err) return done(err);
			expectWebElement(element);
			searchInputElement = element;
			done();
		});
	});

	it('get search form visibility', function(done) {
		searchFormElement.getCssProp('visibility', function(err, visibility) {
			if (err) return callback(err);
			expect(visibility).equal('visible');
			done();
		});
	});

	it('search form element is visible', function(done) {
		searchFormElement.isVisible(function(err, isVisible) {
			if (err) return done(err);
			expect(isVisible).equal(true);
			done();
		});
	});

	it('search input element is visible', function(done) {
		searchInputElement.isVisible(function(err, isVisible) {
			if (err) return done(err);
			expect(isVisible).equal(true);
			done();
		});
	});

	itElementCommand('top_search_form', 'hide');

	it('search form element is not visible', function(done) {
		searchFormElement.isVisible(function(err, isVisible) {
			if (err) return done(err);
			expect(isVisible).equal(false);
			done();
		});
	});

	it('search input element is not visible', function(done) {
		searchInputElement.isVisible(function(err, isVisible) {
			if (err) return done(err);
			expect(isVisible).equal(false);
			done();
		});
	});

	itElementCommand('top_search_form', 'show');

	it('wait for search for disappear (hide element)', function(done) {
		searchFormElement.waitForDisappear(expectForDriverAndDone(done));
		elementCommand('top_search_form', 'hide', 100);
	});

	itElementCommand('top_search_form', 'show');

	it('wait for search for disappear (remove element)', function(done) {
		searchFormElement.waitForDisappear(expectForDriverAndDone(done));
		elementCommand('top_search_form', 'remove', 100);
	});

	it('wait for new element', function(done) {
		driver.waitForElement('#new-element', expectForDriverAndDone(done));
		setTimeout(function() {
			driver.execute(function() {
				var el = document.createElement('div');
				el.setAttribute('id', 'new-element');
				document.body.appendChild(el);
			}, [], false, function() {});
		}, 100);
	});

	it('get text of heading element', function(done) {
		driver.get('.heading', function(err, headingElement) {
			if (err) return done(err);
			expectWebElement(headingElement);
			headingElement.getText(function(err, text) {
				if (err) return done(err);
				expect(text).equal('Build software better, together.');
				done();
			});
		});
	});

	it('click on term of service link', function(done) {
		driver.get('[href="terms-of-service.html"]', function(err, termsElement) {
			if (err) return done(err);
			expectWebElement(termsElement);
			termsElement.click(expectForElementAndDone(termsElement, done));
		});
	});

	function waitForUrlChangeFromIndexOnTermsOfService() {
		it('wait for url change (on terms of service page url)', function(done) {
			driver.waitForUrlChange(
				getFixturePath('github/index.html'),
				getFixturePath('github/terms-of-service.html'),
				expectForDriverAndDone(done)
			);
		});
	}

	waitForUrlChangeFromIndexOnTermsOfService();

	function goBack() {
		it('go back', function(done) {
			driver.back(expectForDriverAndDone(done));
		});
	}

	goBack();

	function waitForUrlChangeFromTermsOfServiceOnIndex() {
		it('wait for url change (on index page url)', function(done) {
			driver.waitForUrlChange(
				getFixturePath('github/terms-of-service.html'),
				getFixturePath('github/index.html'),
				expectForDriverAndDone(done)
			);
		});
	}

	waitForUrlChangeFromTermsOfServiceOnIndex();

	var termsElement = null;
	function getTermsElement() {
		it('get term of service link element', function(done) {
			driver.get('[href="terms-of-service.html"]', function(err, element) {
				if (err) return done(err);
				expectWebElement(element);
				termsElement = element;
				done();
			});
		});
	}


	getTermsElement();

	it('move mouse cursor to it', function(done) {
		termsElement.moveTo(expectForElementAndDone(termsElement, done));
	});
	it('press down left mouse button (via driver)', function(done) {
		driver.mouseDown(expectForDriverAndDone(done));
	});
	it('releases left mouse button (via driver)', function(done) {
		driver.mouseUp(expectForDriverAndDone(done));
	});
	waitForUrlChangeFromIndexOnTermsOfService();
	goBack();
	waitForUrlChangeFromTermsOfServiceOnIndex();

	
	getTermsElement();
	it('press down left mouse button on it', function(done) {
		termsElement.mouseDown(expectForElementAndDone(termsElement, done));
	});
	it('releases left mouse button on it', function(done) {
		termsElement.mouseUp(expectForElementAndDone(termsElement, done));
	});
	waitForUrlChangeFromIndexOnTermsOfService();
	goBack();
	waitForUrlChangeFromTermsOfServiceOnIndex();


	getTermsElement();
	it('move mouse cursor to it', function(done) {
		termsElement.moveTo(expectForElementAndDone(termsElement, done));
	});
	it('click on it via driver', function(done) {
		driver.click(expectForDriverAndDone(done));
	});
	waitForUrlChangeFromIndexOnTermsOfService();
	goBack();
	waitForUrlChangeFromTermsOfServiceOnIndex();

	it('delete session', function(done) {
		driver.deleteSession(expectForDriverAndDone(done));
	});
});

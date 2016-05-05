angular.module('ungonnak-angular-utils', ['uau.templates', 'uau.canSubmit', 'uau.currency', 'uau.feedbackIcon', 'uau.hasFeedback', 'uau.helpers', 'uau.matchValidator', 'uau.showValidationMessages', 'uau.uniqueValidator']);
angular.module('uau.templates', ['uau/templates/feedback-icon.html']);
angular.module('uau.canSubmit', [])
  .directive('canSubmit', ['$timeout', function() {
    return {
      restrict: 'A',
      link: link,
      scope: {
        canSubmit: '='
      }
    };

    function link($scope, node, attrs) {
      var element = angular.element(node);

      if (attrs.triggerValidation !== undefined) {
        element.on('click', function() {
          triggerValidation($scope.canSubmit);
        });
      } else {
        $scope.$watchCollection(
          function() { return $scope.canSubmit; },
          evaluate
        );
      }

      function evaluate(form) {
        if (form.$invalid) {
          element.prop('disabled', true);
        } else {
          element.prop('disabled', false);
        }
      }

      function triggerValidation(form) {
        for (var item in form) {
          if (!form.hasOwnProperty(item)) {
            continue;
          }

          if (form[item] && form[item].$setTouched && form[item].$validate) {
            form[item].$validate();
            form[item].$setTouched();
            delete(form[item].$error.server);
          }
        }
      }
    }
  }]);
;angular.module('uau.currency', [])
  .directive('currency', ['$filter', function($filter) {
    return {
      require: 'ngModel',
      restrict: 'A',
      link: link
    };

    function link($scope, node, attrs, ngModelController) {
      var decimalPlaces = attrs.decimalPlaces ? attrs.decimalPlaces : 2;

      ngModelController.$formatters.push(formatter);
      ngModelController.$parsers.push(parser);

      function formatter(data) {
        return $filter('currency')(data, '');
      }

      function parser(data) {
        var parsed = 0;
        var number = data.toString().replace(/\D+/g, '');
        var significative = number.substring(0, number.length - decimalPlaces);
        var decimals = number.substring(number.length - decimals);

        if (decimals.length < decimalPlaces) {
          decimals = (new Array(decimalPlaces - decimals.length + 1)).join(0);
          decimals += decimals;
        }

        parsed = Number(significative + '.' + decimals);

        ngModelController.$viewValue = formatter(parsed);
        ngModelController.$render();

        return parsed;
      }
    }
  }]);
;angular.module('uau.feedbackIcon', [])
  .directive('feedbackIcon', function() {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: 'uau/templates/feedback-icon.html',
      link: link
    };

    function link($scope, node, attrs) {
      var icon = angular.element(node);

      $scope.$watchCollection(attrs.for, evaluate);

      function evaluate(target) {
        if (!target) return;

        resetClasses();

        if (target.$invalid && (target.$touched || target.$dirty)) {
          icon.addClass('glyphicon-remove');
        } else if (target.$valid) {
          icon.addClass('glyphicon-ok');
        } else {
          if (attrs.initial) {
            icon.addClass(attrs.initial);
          }
        }

        function resetClasses() {
          icon.removeClass('glyphicon-warning');
          icon.removeClass('glyphicon-remove');
          icon.removeClass('glyphicon-ok');

          if (attrs.initial) {
            icon.removeClass(attrs.initial);
          }
        }
      }
    }
  });
;angular.module('uau.hasFeedback', [])
  .directive('hasFeedback', function() {
    return {
      restrict: 'A',
      link: link
    };

    function link($scope, node, attrs) {
      var element = angular.element(node);

      if (!element.hasClass('.has-feedback')) {
        element.addClass('has-feedback');
      }

      $scope.$watchCollection(attrs.for, evaluate);

      function evaluate(target) {
        if (!target) return;

        resetClasses();

        if (target.$invalid && (target.$touched || target.$dirty)) {
          element.addClass('has-error');
        } else if (target.$valid) {
          element.addClass('has-success');
        } else {
          if (attrs.initialFeedback) {
            element.addClass(attrs.initialFeedback);
          }
        }

        function resetClasses() {
          element.removeClass('has-error');
          element.removeClass('has-success');
          element.removeClass('has-warning');

          if (attrs.initialFeedback) {
            element.removeClass(attrs.initialFeedback);
          }
        }
      }
    }
  });
;angular.module('uau.helpers', [])
  .factory('uauHelpers', ['$rootScope', function($rootScope) {
    return {
      applyServerValidationMessages: applyServerValidationMessages,
      filterValidationResponse: filterValidationResponse
    };

    function applyServerValidationMessages(messages, form, messagePool) {
      var validation = filterValidationResponse(messages);

      for (var container in validation) {
        if (validation[container] instanceof Object) {
          traverseFieldset(validation[container]);
        } else {
          processFormField(form[container], validation[container]);
        }
      }

      function traverseFieldset(fieldset) {
        for (var field in fieldset) {
          processFormField(form[field], fieldset[field]);
        }
      }

      function processFormField(field, message) {
        if (field &&
          field.hasOwnProperty('$invalid') &&
          field.hasOwnProperty('$error')
        ) {
          field.$invalid = true;
          field.$error.server = message;
        }

        if (messagePool) {
          messagePool.push(message);
        }
      }
    }

    function filterValidationResponse(response) {
      var filteredMessages = {};

      for (var item in response) {
        var message = response[item];
        var elements;

        if (message instanceof Array) {
          if (message.length == 1) {
            message = message[0];
          }
        }

        if (item.indexOf('.') >= 0) {
          elements = item.split('.');

          if (!filteredMessages[elements[0]]) {
            filteredMessages[elements[0]] = {};
          }

          filteredMessages[elements[0]][elements[1]] = message;
        } else {
          filteredMessages[item] = message;
        }
      }

      return filteredMessages;
    }
  }]);
;angular.module('uau.matchValidator', [])
  .directive('match', function() {
    return {
      require: 'ng-model',
      link: link
    };

    function link($scope, node, attrs, ngModelController) {
      var element = angular.element(node);
      var target = angular.element('#' + attrs.match);

      element.on('keyup', function() {
        $scope.$apply(function() {
          if (target.val() === '') {
            ngModelController.$setValidity('match', true);
          }

          if (element.val() !== '') {
            ngModelController.$validate();
          }
        });
      });

      ngModelController.$validators.match = matchValidator;

      attrs.$observe('match', function() {
        ngModelController.$validate();
      });

      function matchValidator(modelValue, viewValue) {
        return element.val() === target.val();
      }
    }
  });
;angular.module('uau.showValidationMessages', ['ngMessages'])
  .directive('showValidationMessages', function() {
    return {
      require: 'ngMessages',
      restrict: 'A',
      link: link
    };

    function link($scope, node, attrs) {
      var element = angular.element(node);

      $scope.$watchCollection(attrs.of, evaluate);

      function evaluate(target) {
        if (!target) return;

        if (
          (target.$dirty || target.$touched) &&
          Object.keys(target.$error).length > 0
        ) {
          element.show();
        } else {
          element.hide();
        }
      }
    }
  });
;angular.module('uau.uniqueValidator', [])
  .directive('unique', ['$http', '$timeout', function($http, $timeout) {
    return {
      require: '?ngModel',
      restrict: 'A',
      link: link
    };

    function link($scope, node, attrs, ngModelController) {
      if (!ngModelController) return;

      var timeout;
      var element = angular.element(node);

      ngModelController.$validators.unique = validateUnique;

      attrs.$observe('unique', function() {
        ngModelController.$validate();
      });

      function validateUnique(modelValue, viewValue) {
        if (element.is('input')) {
          element.on('keyup', function() {
            $timeout.cancel(timeout);
            timeout = $timeout(doValidation, 500);
          });
        } else {
          doValidation();
        }

        function doValidation() {
          $http({
            method: 'GET',
            url: '/api/ajaxValidation/unique',
            params: {
              model: attrs.unique,
              field: ngModelController.$name,
              value: modelValue,
              ignore: attrs.ignore || null
            }
          })
            .then(checkSuccessful);

          function checkSuccessful(response) {
            ngModelController.$setValidity('unique', response.data.status);

            if (response.data.message) {
              ngModelController.$error.uniqe = response.data.message;
            }
          }
        }

        return true;
      }
    }
  }]);
;angular.module("uau/templates/feedback-icon.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("uau/templates/feedback-icon.html",
    "<span class=\"form-control-feedback glyphicon\" aria-hidden=\"true\"></span>\n" +
    "");
}]);

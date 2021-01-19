const swaggerValidation = require('openapi-validator-middleware');
swaggerValidation.init('./swagger.yaml', { beautifyErrors: true, expectFormFieldsInBody: true });

module.exports = swaggerValidation;